/**
 * Main application layout with sidebar
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout, theme, Alert } from 'antd';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { useUiStore } from '../../stores/uiStore.js';
import { useWsStore } from '../../stores/wsStore.js';
import { useSchemaStore } from '../../stores/schemaStore.js';

const { Content } = Layout;

export function AppLayout(): React.ReactElement {
  const { sidebarCollapsed } = useUiStore();
  const { connect } = useWsStore();
  const { error } = useSchemaStore();
  const { token } = theme.useToken();
  const location = useLocation();

  // Only show schema errors on schema-related pages
  const isSchemaPage = location.pathname === '/' || location.pathname.startsWith('/schema');

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout style={{ marginTop: 48 }}>
        <Sidebar />
        <Layout
          style={{
            marginLeft: sidebarCollapsed ? 80 : 240,
            transition: 'margin-left 0.2s',
          }}
        >
          <Content
            style={{
              padding: token.padding,
              minHeight: 'calc(100vh - 48px)',
              background: token.colorBgContainer,
            }}
          >
            {error && isSchemaPage && (
              <Alert
                message="Schema Loading Error"
                description={error}
                type="error"
                showIcon
                style={{ marginBottom: token.margin }}
              />
            )}
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
