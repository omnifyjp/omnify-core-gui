/**
 * Navigation sidebar
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, Menu, theme } from 'antd';
import {
  HomeOutlined,
  FileOutlined,
  SettingOutlined,
  PlusOutlined,
  HistoryOutlined,
  OrderedListOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useSchemaStore } from '../../stores/schemaStore.js';
import { useUiStore } from '../../stores/uiStore.js';

const { Sider } = Layout;

const SIDER_WIDTH = 240;

export function Sidebar(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { schemas } = useSchemaStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { token } = theme.useToken();
  const [openKeys, setOpenKeys] = useState<string[]>(['objects', 'enums']);

  const schemaList = Object.values(schemas);
  const objectSchemas = schemaList.filter((s) => s.kind === 'object').sort((a, b) => a.name.localeCompare(b.name));
  const enumSchemas = schemaList.filter((s) => s.kind === 'enum').sort((a, b) => a.name.localeCompare(b.name));

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: t('nav.home'),
    },
    {
      key: 'objects',
      icon: <FileOutlined />,
      label: `${t('nav.objects', 'Objects')} (${objectSchemas.length})`,
      children: [
        {
          key: '/schema/new',
          icon: <PlusOutlined />,
          label: t('schema.newSchema'),
        },
        ...objectSchemas.map((schema) => ({
          key: `/schema/${schema.name}`,
          label: schema.name,
        })),
      ],
    },
    {
      key: 'enums',
      icon: <OrderedListOutlined />,
      label: `${t('nav.enums', 'Enums')} (${enumSchemas.length})`,
      children: [
        {
          key: '/schema/new?kind=enum',
          icon: <PlusOutlined />,
          label: t('nav.newEnum', 'New Enum'),
        },
        ...enumSchemas.map((schema) => ({
          key: `/schema/${schema.name}`,
          label: schema.name,
        })),
      ],
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: t('nav.history', 'History'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('nav.settings'),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }): void => {
    if (key !== 'objects' && key !== 'enums') {
      navigate(key);
    }
  };

  return (
    <Sider
      width={SIDER_WIDTH}
      collapsible
      collapsed={sidebarCollapsed}
      trigger={null}
      style={{
        height: 'calc(100vh - 48px)',
        position: 'fixed',
        left: 0,
        top: 48,
        bottom: 0,
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          {...(sidebarCollapsed ? {} : { openKeys, onOpenChange: setOpenKeys })}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
          inlineCollapsed={sidebarCollapsed}
        />
      </div>
      {/* Collapse trigger at bottom */}
      <div
        onClick={toggleSidebar}
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: token.colorPrimary,
          color: '#fff',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = token.colorPrimaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = token.colorPrimary;
        }}
      >
        {sidebarCollapsed ? <RightOutlined /> : <LeftOutlined />}
      </div>
      </div>
    </Sider>
  );
}
