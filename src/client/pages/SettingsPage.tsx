/**
 * Settings page
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, Typography, Descriptions, Switch, Spin, theme, Select, Tag, Empty, App, Input, Button, Space, Collapse, Form, Divider } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUiStore, type DatabaseType, type Language } from '../stores/uiStore.js';
import { useWsStore } from '../stores/wsStore.js';
import { LANGUAGE_OPTIONS } from '../i18n/index.js';
import { api } from '../services/client.js';
import type { GuiConfig, PluginInfo, PluginConfigField } from '../../shared/types.js';

const { Title, Text } = Typography;

const DATABASE_OPTIONS: { value: DatabaseType; label: string }[] = [
  { value: 'mysql', label: 'MySQL / MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'sqlserver', label: 'SQL Server' },
];

export function SettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const {
    darkMode,
    toggleDarkMode,
    previewPanelOpen,
    togglePreviewPanel,
    databaseType,
    setDatabaseType,
    language,
    setLanguage,
  } = useUiStore();
  const { token } = theme.useToken();
  const wsConnected = useWsStore((state) => state.connected);
  const [config, setConfig] = useState<GuiConfig | null>(null);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pluginsLoading, setPluginsLoading] = useState(true);
  const [togglingPlugin, setTogglingPlugin] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [pluginConfigs, setPluginConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [expandedPlugins, setExpandedPlugins] = useState<string[]>([]);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    api
      .get<GuiConfig>('/api/config')
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));

    api
      .get<PluginInfo[]>('/api/plugins')
      .then((data) => {
        setPlugins(data);
        // Initialize pluginConfigs with current config values from API
        const configs: Record<string, Record<string, unknown>> = {};
        for (const plugin of data) {
          if (plugin.config) {
            configs[plugin.name] = { ...plugin.config };
          } else if (plugin.configSchema) {
            // Initialize with defaults from schema
            const defaultConfig: Record<string, unknown> = {};
            for (const field of plugin.configSchema.fields) {
              if (field.default !== undefined) {
                defaultConfig[field.key] = field.default;
              }
            }
            configs[plugin.name] = defaultConfig;
          }
        }
        setPluginConfigs(configs);
      })
      .catch(console.error)
      .finally(() => setPluginsLoading(false));
  }, []);

  // Watch WebSocket connection to detect server restart
  useEffect(() => {
    if (restarting) {
      if (!wsConnected) {
        // Server disconnected
        wasDisconnectedRef.current = true;
      } else if (wasDisconnectedRef.current) {
        // Server reconnected after being disconnected - reload page
        window.location.reload();
      }
    }
  }, [restarting, wsConnected]);

  const handleTogglePlugin = async (plugin: PluginInfo) => {
    setTogglingPlugin(plugin.name);
    try {
      await api.post<{ enabled: boolean; restarting: boolean }>(
        `/api/plugins/${plugin.name}/toggle`,
        { enabled: !plugin.enabled }
      );

      // Show restarting overlay - useEffect will handle reload when WS reconnects
      setRestarting(true);
      setTogglingPlugin(null);
      wasDisconnectedRef.current = false;
    } catch (error) {
      message.error(t('settings.pluginToggleError'));
      setTogglingPlugin(null);
    }
  };

  const handleSavePluginConfig = async (plugin: PluginInfo) => {
    setSavingConfig(plugin.name);
    try {
      const config = pluginConfigs[plugin.name] || {};
      await api.post<{ saved: boolean; restarting: boolean }>(
        `/api/plugins/${plugin.name}/config`,
        { config }
      );

      // Show restarting overlay - useEffect will handle reload when WS reconnects
      setRestarting(true);
      setSavingConfig(null);
      wasDisconnectedRef.current = false;
    } catch (error) {
      message.error(t('settings.pluginConfigSaveError'));
      setSavingConfig(null);
    }
  };

  const updatePluginConfig = useCallback((pluginName: string, key: string, value: unknown) => {
    setPluginConfigs((prev) => ({
      ...prev,
      [pluginName]: {
        ...prev[pluginName],
        [key]: value,
      },
    }));
  }, []);

  const renderConfigField = (plugin: PluginInfo, field: PluginConfigField) => {
    const currentValue = pluginConfigs[plugin.name]?.[field.key];

    switch (field.type) {
      case 'boolean':
        return (
          <Switch
            size="small"
            checked={currentValue === true || (currentValue === undefined && field.default === true)}
            onChange={(checked) => updatePluginConfig(plugin.name, field.key, checked)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            size="small"
            style={{ width: 200 }}
            value={currentValue as number ?? field.default as number ?? ''}
            placeholder={field.placeholder}
            onChange={(e) => updatePluginConfig(plugin.name, field.key, e.target.value ? parseFloat(e.target.value) : undefined)}
          />
        );
      case 'select':
        return (
          <Select
            size="small"
            style={{ width: 200 }}
            value={currentValue as string ?? field.default as string}
            options={field.options?.map((opt) => ({ value: opt.value, label: opt.label })) ?? []}
            onChange={(value) => updatePluginConfig(plugin.name, field.key, value)}
          />
        );
      case 'path':
      case 'string':
      default:
        return (
          <Input
            size="small"
            style={{ width: 300 }}
            value={currentValue as string ?? ''}
            placeholder={field.placeholder ?? (field.default as string)}
            onChange={(e) => updatePluginConfig(plugin.name, field.key, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingXL }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={3}>{t('settings.title')}</Title>

      {/* Server Restarting Full-Screen Overlay */}
      {restarting && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Spin size="large" />
          <div style={{ marginTop: 24, color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
            {t('settings.serverRestarting')}
          </div>
          <div style={{ marginTop: 8, color: '#ccc' }}>
            {t('settings.pleaseWait')}
          </div>
        </div>
      )}

      <Card title={t('settings.plugins')} style={{ marginBottom: token.margin }}>
        {pluginsLoading ? (
          <div style={{ textAlign: 'center', padding: token.padding }}>
            <Spin />
          </div>
        ) : plugins.length > 0 ? (
          <div>
            {plugins.map((plugin) => (
              <div
                key={plugin.name}
                style={{
                  borderBottom: `1px solid ${token.colorBorderSecondary}`,
                  paddingBottom: token.paddingSM,
                  marginBottom: token.marginSM,
                }}
              >
                {/* Plugin Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div>
                      <Text strong>{plugin.name}</Text>
                      <Text type="secondary" style={{ marginLeft: token.marginXS }}>
                        v{plugin.version}
                      </Text>
                    </div>
                    <Text type="secondary">{plugin.description}</Text>
                    {plugin.types.length > 0 && (
                      <div style={{ marginTop: token.marginXS }}>
                        {plugin.types.map((type) => (
                          <Tag key={type} color={plugin.enabled ? 'blue' : 'default'}>
                            {type}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={plugin.enabled}
                    loading={togglingPlugin === plugin.name}
                    onChange={() => handleTogglePlugin(plugin)}
                  />
                </div>

                {/* Plugin Config (only show when enabled and has configSchema) */}
                {plugin.enabled && plugin.configSchema && plugin.configSchema.fields.length > 0 && (
                  <div style={{ marginTop: token.marginMD }}>
                    <Collapse
                      size="small"
                      activeKey={expandedPlugins}
                      onChange={(keys) => setExpandedPlugins(keys as string[])}
                      items={[
                        {
                          key: plugin.name,
                          label: (
                            <Space>
                              <SettingOutlined />
                              <Text>{t('settings.pluginConfiguration')}</Text>
                            </Space>
                          ),
                          children: (
                            <div>
                              <Form layout="vertical" size="small">
                                {/* Group fields by group property */}
                                {(() => {
                                  const groups: Record<string, PluginConfigField[]> = {};
                                  const ungrouped: PluginConfigField[] = [];
                                  for (const field of plugin.configSchema!.fields) {
                                    if (field.group) {
                                      const groupKey = field.group;
                                      if (!groups[groupKey]) groups[groupKey] = [];
                                      groups[groupKey]!.push(field);
                                    } else {
                                      ungrouped.push(field);
                                    }
                                  }

                                  return (
                                    <>
                                      {Object.entries(groups).map(([groupName, fields]) => (
                                        <div key={groupName} style={{ marginBottom: token.marginMD }}>
                                          <Text strong style={{ textTransform: 'capitalize' }}>
                                            {groupName}
                                          </Text>
                                          <Divider style={{ margin: `${token.marginXS}px 0` }} />
                                          {fields.map((field) => (
                                            <Form.Item
                                              key={field.key}
                                              label={field.label}
                                              help={field.description}
                                              style={{ marginBottom: token.marginSM }}
                                            >
                                              {renderConfigField(plugin, field)}
                                            </Form.Item>
                                          ))}
                                        </div>
                                      ))}
                                      {ungrouped.length > 0 && (
                                        <div>
                                          {ungrouped.map((field) => (
                                            <Form.Item
                                              key={field.key}
                                              label={field.label}
                                              help={field.description}
                                              style={{ marginBottom: token.marginSM }}
                                            >
                                              {renderConfigField(plugin, field)}
                                            </Form.Item>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </Form>
                              <div style={{ marginTop: token.marginMD }}>
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<SaveOutlined />}
                                  loading={savingConfig === plugin.name}
                                  onClick={() => handleSavePluginConfig(plugin)}
                                >
                                  {t('settings.savePluginConfig')}
                                </Button>
                              </div>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">
                {t('settings.noPlugins')}
              </Text>
            }
          />
        )}
        <Text type="secondary" style={{ marginTop: token.marginSM, display: 'block' }}>
          {t('settings.pluginsHint')}
        </Text>
      </Card>

      <Card title={t('settings.database')} style={{ marginBottom: token.margin }}>
        <Descriptions column={1}>
          <Descriptions.Item label={t('settings.databaseType')}>
            <Select
              value={databaseType}
              onChange={setDatabaseType}
              options={DATABASE_OPTIONS}
              style={{ width: 200 }}
              size="small"
            />
          </Descriptions.Item>
        </Descriptions>
        <Text type="secondary" style={{ marginTop: token.marginSM, display: 'block' }}>
          {t('settings.databaseHint')}
        </Text>
      </Card>

      <Card title={t('settings.appearance')} style={{ marginBottom: token.margin }}>
        <Descriptions column={1}>
          <Descriptions.Item label={t('settings.language')}>
            <Select
              value={language}
              onChange={(val: Language) => setLanguage(val)}
              options={LANGUAGE_OPTIONS}
              style={{ width: 200 }}
              size="small"
            />
          </Descriptions.Item>
          <Descriptions.Item label={t('settings.darkMode')}>
            <Switch checked={darkMode} onChange={toggleDarkMode} size="small" />
          </Descriptions.Item>
          <Descriptions.Item label={t('settings.showPreview')}>
            <Switch checked={previewPanelOpen} onChange={togglePreviewPanel} size="small" />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('settings.serverConfig')}>
        <Descriptions column={1}>
          <Descriptions.Item label={t('settings.schemasDir')}>
            <Text code>{config?.schemasDir ?? 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('settings.serverPort')}>
            <Text code>{config?.port ?? 'N/A'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label={t('settings.host')}>
            <Text code>{config?.host ?? 'N/A'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
