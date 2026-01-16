/**
 * Plugins API routes
 */

import { Router, type Request, type Response, type IRouter } from 'express';
import { readdir, readFile, writeFile } from 'fs/promises';
import { writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import type { ApiResponse, PluginInfo, PluginConfigSchema, PluginConfigField } from '../../shared/types.js';
import type { AppConfig } from '../app.js';

// Store CWD for module resolution
let projectCwd: string = process.cwd();

/**
 * Restart the server by spawning a new process after this one exits.
 * Uses a shell wrapper with sleep to ensure port is released.
 */
function restartServer(cwd: string): void {
  console.log('\n🔄 Restarting server...\n');

  // Create restart marker to prevent auto-opening browser
  try {
    writeFileSync(join(cwd, '.omnify-restart'), '');
  } catch {
    // Ignore
  }

  // Get the command that started this process
  const args = process.argv.slice(1);
  const nodeExecutable = process.execPath;
  const fullCommand = [nodeExecutable, ...args].map(a => `"${a}"`).join(' ');

  // Use shell to wait 1 second before starting new server
  // This ensures the old server has fully released the port
  const child = spawn('sh', ['-c', `sleep 1 && ${fullCommand}`], {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  // Unref so parent can exit independently
  child.unref();

  // Exit the current process immediately
  process.exit(0);
}

export const pluginsRouter: IRouter = Router();

// Known omnify plugins with their metadata and export names
// Only packages that export a plugin function should be listed here
const KNOWN_PLUGINS: Record<string, { description: string; types: string[]; exportName: string; importPath?: string; isFactory?: boolean }> = {
  '@famgia/omnify-japan': {
    description: 'Japan-specific types (JapaneseAddress, JapanesePhone, JapaneseName, etc.)',
    types: ['JapanesePhone', 'JapanesePostalCode', 'JapaneseAddress', 'JapaneseName', 'JapaneseBankAccount'],
    exportName: 'japanTypesPlugin',
    isFactory: false, // Already instantiated
  },
  '@famgia/omnify-laravel': {
    description: 'Laravel migration generator',
    types: [],
    exportName: 'laravelPlugin',
    importPath: '@famgia/omnify-laravel',
    isFactory: true, // Needs to be called with ()
  },
  '@famgia/omnify-typescript': {
    description: 'TypeScript type definitions generator',
    types: [],
    exportName: 'typescriptPlugin',
    importPath: '@famgia/omnify-typescript/plugin',
    isFactory: true, // Needs to be called with ()
  },
};

// Packages that are NOT plugins (utility libraries)
const NON_PLUGIN_PACKAGES = ['@famgia/omnify-sql', '@famgia/omnify-atlas'];

/**
 * Dynamically import a plugin to get its configSchema.
 * Uses createRequire to resolve from the project's CWD instead of this file's location.
 */
async function getPluginConfigSchema(packageName: string, cwd: string): Promise<PluginConfigSchema | undefined> {
  try {
    const knownPlugin = KNOWN_PLUGINS[packageName];
    if (!knownPlugin) return undefined;

    // Create require function from project CWD to resolve packages correctly
    const projectRequire = createRequire(pathToFileURL(join(cwd, 'package.json')).href);

    // Resolve the package path from project's node_modules
    const packagePath = projectRequire.resolve(packageName);

    // Import the plugin module using file URL
    const pluginModule = await import(pathToFileURL(packagePath).href);
    const pluginFactory = pluginModule[knownPlugin.exportName] || pluginModule.default;

    if (typeof pluginFactory !== 'function') return undefined;

    // Call the factory to get the plugin instance (with empty options to get defaults)
    const pluginInstance = pluginFactory();

    // Return the configSchema if present
    return pluginInstance.configSchema as PluginConfigSchema | undefined;
  } catch (error) {
    console.error(`Failed to load configSchema for ${packageName}:`, error);
    return undefined;
  }
}

/**
 * Parse plugin configuration from omnify.config.ts
 */
async function getPluginConfig(cwd: string, packageName: string): Promise<Record<string, unknown>> {
  const configPath = join(cwd, 'omnify.config.ts');
  const knownPlugin = KNOWN_PLUGINS[packageName];
  if (!knownPlugin) return {};

  try {
    const content = await readFile(configPath, 'utf-8');

    // Look for plugin call with options: laravelPlugin({ ... })
    const pluginVarName = knownPlugin.exportName;
    const pluginCallRegex = new RegExp(`${pluginVarName}\\s*\\(\\s*\\{([^}]*)\\}\\s*\\)`, 's');
    const match = content.match(pluginCallRegex);

    if (!match) return {};

    // Parse the options object (simple parsing for common types)
    const optionsStr = match[1] ?? '';
    const config: Record<string, unknown> = {};

    // Parse key: value pairs
    const pairRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(\d+(?:\.\d+)?)|(\btrue\b|\bfalse\b))/g;
    let pairMatch;
    while ((pairMatch = pairRegex.exec(optionsStr)) !== null) {
      const key = pairMatch[1] as string;
      const stringVal = pairMatch[2] ?? pairMatch[3];
      const numVal = pairMatch[4];
      const boolVal = pairMatch[5];

      if (stringVal !== undefined) {
        config[key] = stringVal;
      } else if (numVal !== undefined) {
        config[key] = parseFloat(numVal);
      } else if (boolVal !== undefined) {
        config[key] = boolVal === 'true';
      }
    }

    return config;
  } catch {
    return {};
  }
}

/**
 * Update plugin configuration in omnify.config.ts
 */
async function savePluginConfig(
  cwd: string,
  packageName: string,
  config: Record<string, unknown>
): Promise<boolean> {
  const configPath = join(cwd, 'omnify.config.ts');
  const knownPlugin = KNOWN_PLUGINS[packageName];
  if (!knownPlugin) return false;

  try {
    let content = await readFile(configPath, 'utf-8');
    const pluginVarName = knownPlugin.exportName;

    // Convert config object to options string
    const optionsEntries = Object.entries(config)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => {
        if (typeof v === 'string') return `${k}: '${v}'`;
        if (typeof v === 'boolean') return `${k}: ${v}`;
        if (typeof v === 'number') return `${k}: ${v}`;
        return null;
      })
      .filter(Boolean);

    const optionsStr = optionsEntries.length > 0
      ? `{ ${optionsEntries.join(', ')} }`
      : '';

    // Only replace plugin calls within the plugins array, not in import statements
    // Match plugins: [...] and replace the plugin reference inside
    const pluginsArrayRegex = /(plugins:\s*\[)([^\]]*?)(\])/s;
    const pluginsMatch = content.match(pluginsArrayRegex);

    if (pluginsMatch) {
      const [fullMatch, prefix, pluginsContent, suffix] = pluginsMatch;

      if (!pluginsContent) {
        return false;
      }

      // Replace plugin call within plugins array only
      const pluginCallWithOptionsRegex = new RegExp(`${pluginVarName}\\s*\\([^)]*\\)`, 'g');
      const pluginCallNoOptionsRegex = new RegExp(`\\b${pluginVarName}\\b(?!\\s*\\()`, 'g');

      let newPluginsContent = pluginsContent;
      const replacement = optionsStr ? `${pluginVarName}(${optionsStr})` : `${pluginVarName}()`;

      if (pluginsContent.match(pluginCallWithOptionsRegex)) {
        // Replace existing options
        newPluginsContent = pluginsContent.replace(pluginCallWithOptionsRegex, replacement);
      } else if (pluginsContent.match(pluginCallNoOptionsRegex)) {
        // Add options to plugin call
        newPluginsContent = pluginsContent.replace(pluginCallNoOptionsRegex, replacement);
      }

      content = content.replace(fullMatch, `${prefix}${newPluginsContent}${suffix}`);
    }

    await writeFile(configPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save plugin config:', error);
    return false;
  }
}

/**
 * Scan node_modules for installed omnify plugins
 */
async function scanInstalledPlugins(cwd: string): Promise<PluginInfo[]> {
  const plugins: PluginInfo[] = [];
  const nodeModulesPath = join(cwd, 'node_modules', '@famgia');

  try {
    const dirs = await readdir(nodeModulesPath);

    for (const dir of dirs) {
      // Skip non-plugin packages
      if (!dir.startsWith('omnify-') || dir === 'omnify-cli' || dir === 'omnify-gui' || dir === 'omnify-types' || dir === 'omnify-core') {
        continue;
      }

      const packageName = `@famgia/${dir}`;

      // Skip utility libraries that don't export plugins
      if (NON_PLUGIN_PACKAGES.includes(packageName)) {
        continue;
      }

      // Skip if not a known plugin (we only support known plugins for now)
      if (!KNOWN_PLUGINS[packageName]) {
        continue;
      }

      const packageJsonPath = join(nodeModulesPath, dir, 'package.json');

      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

        // Get types from known plugins or empty array
        const knownPlugin = KNOWN_PLUGINS[packageName];
        const types = knownPlugin?.types || [];

        plugins.push({
          name: dir.replace('omnify-', ''),
          packageName,
          version: packageJson.version || '0.0.0',
          description: knownPlugin?.description || packageJson.description || '',
          enabled: false, // Will be updated by checking config
          types,
        });
      } catch {
        // Skip if can't read package.json
      }
    }
  } catch {
    // node_modules/@famgia doesn't exist
  }

  return plugins;
}

/**
 * Check which plugins are enabled in omnify.config.ts
 */
async function getEnabledPlugins(cwd: string): Promise<string[]> {
  const configPath = join(cwd, 'omnify.config.ts');

  try {
    const content = await readFile(configPath, 'utf-8');
    const enabled: string[] = [];

    // Parse imports to find enabled plugins (handles both @famgia/omnify-xxx and @famgia/omnify-xxx/plugin)
    const importRegex = /import\s+\{?\s*(\w+)\s*\}?\s+from\s+['"](@famgia\/omnify-\w+)(?:\/\w+)?['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[2]) enabled.push(match[2]);
    }

    return enabled;
  } catch {
    return [];
  }
}

/**
 * Update omnify.config.ts to enable/disable a plugin
 */
async function updatePluginConfig(
  cwd: string,
  packageName: string,
  enable: boolean
): Promise<boolean> {
  const configPath = join(cwd, 'omnify.config.ts');

  try {
    let content = await readFile(configPath, 'utf-8');

    // Get the variable name for the plugin from known plugins or generate one
    const knownPlugin = KNOWN_PLUGINS[packageName];
    const pluginVarName = knownPlugin?.exportName ??
      packageName.replace('@famgia/omnify-', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Plugin';

    if (enable) {
      // Use custom import path if specified (e.g., @famgia/omnify-typescript/plugin)
      const importFrom = knownPlugin?.importPath ?? packageName;
      const importStatement = `import { ${pluginVarName} } from '${importFrom}';\n`;

      // Check if import already exists (check for package name base, not full path)
      const packageBase = packageName.replace('@famgia/', '');
      if (!content.includes(packageBase)) {
        // Add import after the first import
        const firstImportEnd = content.indexOf('\n', content.indexOf('import'));
        content = content.slice(0, firstImportEnd + 1) + importStatement + content.slice(firstImportEnd + 1);
      }

      // Determine how to add plugin (with or without ())
      const pluginCall = knownPlugin?.isFactory ? `${pluginVarName}()` : pluginVarName;

      // Add to plugins array
      if (content.includes('plugins:')) {
        // Add to existing plugins array
        content = content.replace(
          /plugins:\s*\[([^\]]*)\]/,
          (match, plugins) => {
            if (plugins.includes(pluginVarName)) return match;
            const newPlugins = plugins.trim()
              ? `${plugins.trim()}, ${pluginCall}`
              : pluginCall;
            return `plugins: [${newPlugins}]`;
          }
        );
      } else {
        // Add plugins array before output or at end of config
        content = content.replace(
          /(database:\s*\{[^}]+\},?)/,
          `$1\n  plugins: [${pluginCall}],`
        );
      }
    } else {
      // Remove from plugins array (handle both factory calls "name()" and plain "name")
      // Handle ", pluginName()" or ", pluginName"
      content = content.replace(
        new RegExp(`,\\s*${pluginVarName}(?:\\([^)]*\\))?`, 'g'),
        ''
      );
      // Handle "pluginName()," or "pluginName,"
      content = content.replace(
        new RegExp(`${pluginVarName}(?:\\([^)]*\\))?\\s*,`, 'g'),
        ''
      );
      // Handle standalone "pluginName()" or "pluginName" (last item in array)
      content = content.replace(
        new RegExp(`${pluginVarName}(?:\\([^)]*\\))?(?=\\s*\\])`, 'g'),
        ''
      );

      // Clean up empty plugins array
      content = content.replace(/plugins:\s*\[\s*\],?\n?/, '');

      // Remove entire import line for this package (use importPath if available)
      const importFrom = knownPlugin?.importPath ?? packageName;
      const escapedImportFrom = importFrom.replace(/\//g, '\\/');
      content = content.replace(
        new RegExp(`import\\s*\\{[^}]*\\}\\s*from\\s*['"]${escapedImportFrom}['"];?\\n?`),
        ''
      );
    }

    await writeFile(configPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to update config:', error);
    return false;
  }
}

// GET /api/plugins - List all installed plugins
pluginsRouter.get('/', async (req: Request, res: Response) => {
  const appConfig = req.app.locals.config as AppConfig;

  try {
    const plugins = await scanInstalledPlugins(appConfig.cwd);
    const enabledPackages = await getEnabledPlugins(appConfig.cwd);

    // Mark enabled plugins and fetch their configSchema + current config
    for (const plugin of plugins) {
      plugin.enabled = enabledPackages.includes(plugin.packageName);

      // Get configSchema from plugin (dynamically imported)
      const configSchema = await getPluginConfigSchema(plugin.packageName, appConfig.cwd);
      if (configSchema) {
        plugin.configSchema = configSchema;
      }

      // Get current config from omnify.config.ts
      if (plugin.enabled) {
        const config = await getPluginConfig(appConfig.cwd, plugin.packageName);
        plugin.config = config;
      }
    }

    const response: ApiResponse<PluginInfo[]> = {
      success: true,
      data: plugins,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'PLUGINS_SCAN_ERROR',
        message: error instanceof Error ? error.message : 'Failed to scan plugins',
      },
    };
    res.status(500).json(response);
  }
});

// POST /api/plugins/:name/toggle - Enable/disable a plugin
pluginsRouter.post('/:name/toggle', async (req: Request, res: Response) => {
  const appConfig = req.app.locals.config as AppConfig;
  const { name } = req.params;
  const { enabled } = req.body as { enabled: boolean };

  const packageName = `@famgia/omnify-${name}`;

  try {
    const success = await updatePluginConfig(appConfig.cwd, packageName, enabled);

    if (success) {
      const response: ApiResponse<{ enabled: boolean; restarting: boolean }> = {
        success: true,
        data: { enabled, restarting: true },
      };

      // Wait for response to be fully sent before restarting
      res.on('finish', () => {
        // Give client time to receive and process the response
        setTimeout(() => {
          restartServer(appConfig.cwd);
        }, 1000);
      });

      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONFIG_UPDATE_ERROR',
          message: 'Failed to update omnify.config.ts',
        },
      };
      res.status(500).json(response);
    }
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'TOGGLE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to toggle plugin',
      },
    };
    res.status(500).json(response);
  }
});

// POST /api/plugins/:name/config - Update plugin configuration
pluginsRouter.post('/:name/config', async (req: Request, res: Response) => {
  const appConfig = req.app.locals.config as AppConfig;
  const { name } = req.params;
  const { config } = req.body as { config: Record<string, unknown> };

  const packageName = `@famgia/omnify-${name}`;

  try {
    const success = await savePluginConfig(appConfig.cwd, packageName, config);

    if (success) {
      const response: ApiResponse<{ saved: boolean; restarting: boolean }> = {
        success: true,
        data: { saved: true, restarting: true },
      };

      // Wait for response to be fully sent before restarting
      res.on('finish', () => {
        // Give client time to receive and process the response
        setTimeout(() => {
          restartServer(appConfig.cwd);
        }, 1000);
      });

      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONFIG_SAVE_ERROR',
          message: 'Failed to save plugin configuration',
        },
      };
      res.status(500).json(response);
    }
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CONFIG_SAVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save plugin configuration',
      },
    };
    res.status(500).json(response);
  }
});
