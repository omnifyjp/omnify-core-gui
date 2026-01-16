import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { AppLayout } from './components/layout/AppLayout.js';
import { HomePage } from './pages/HomePage.js';
import { SchemaPage } from './pages/SchemaPage.js';
import { VersionHistoryPage } from './pages/VersionHistoryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { useSchemaStore } from './stores/schemaStore.js';
import { useUiStore } from './stores/uiStore.js';
import { api } from './services/client.js';
import type { GuiConfig } from '../shared/types.js';

// Root component that handles initialization
function Root(): React.ReactElement {
  const { loadSchemas } = useSchemaStore();
  const { setCustomTypes } = useUiStore();

  useEffect(() => {
    loadSchemas();
    // Load config and set custom types
    api.get<GuiConfig>('/api/config').then((config) => {
      if (config.customTypes) {
        setCustomTypes(config.customTypes);
      }
    }).catch(console.error);
  }, [loadSchemas, setCustomTypes]);

  return <Outlet />;
}

// Create data router for useBlocker support
const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/schema/:name', element: <SchemaPage /> },
          { path: '/history', element: <VersionHistoryPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

export function App(): React.ReactElement {
  const { darkMode } = useUiStore();

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}
