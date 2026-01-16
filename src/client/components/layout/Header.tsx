/**
 * Fixed top header bar with change tracking
 */

import { useState, useEffect } from 'react';
import { Layout, Space, Switch, Badge, theme, Tooltip, Button, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  SunOutlined,
  MoonOutlined,
  WifiOutlined,
  DisconnectOutlined,
  CloudUploadOutlined,
  DiffOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useUiStore, type Language } from '../../stores/uiStore.js';
import { useWsStore } from '../../stores/wsStore.js';
import { useSchemaStore } from '../../stores/schemaStore.js';
import { versionsApi, type PendingChangesResult } from '../../services/versions.js';
import { ChangesPreviewModal } from '../common/ChangesPreviewModal.js';
import { LANGUAGE_OPTIONS } from '../../i18n/index.js';

const { Header: AntHeader } = Layout;

export function Header(): React.ReactElement {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode, language, setLanguage } = useUiStore();
  const { connected } = useWsStore();
  const { validationErrors, schemas } = useSchemaStore();
  const { token } = theme.useToken();

  const languageMenuItems: MenuProps['items'] = LANGUAGE_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
  }));

  const currentLanguageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? language;

  const [pendingData, setPendingData] = useState<PendingChangesResult | null>(null);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const errorCount = validationErrors.length;
  const pendingCount = pendingData?.changes.length ?? 0;
  const hasChanges = pendingData?.hasChanges ?? false;

  // Load pending changes whenever schemas change
  useEffect(() => {
    loadPendingChanges();
  }, [schemas]);

  const loadPendingChanges = async (): Promise<void> => {
    try {
      const data = await versionsApi.getPending();
      setPendingData(data);
    } catch {
      setPendingData(null);
    }
  };

  const handlePublishVersion = async (): Promise<void> => {
    setPublishing(true);
    try {
      await versionsApi.createVersion();
      await loadPendingChanges();
      setChangesModalOpen(false);
    } catch (e) {
      console.error('Failed to publish version:', e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <AntHeader
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: 0,
          zIndex: 100,
          background: token.colorBgContainer,
          padding: `0 ${token.padding}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          height: 48,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Left: Logo & Changes Status */}
        <Space size="large">
          <Space size="small">
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: token.colorPrimary,
              }}
            >
              Omnify
            </span>
            {pendingData?.latestVersion != null && (
              <Tag style={{ margin: 0 }}>v{pendingData.latestVersion}</Tag>
            )}
          </Space>

          {/* Change Tracking */}
          {hasChanges ? (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<DiffOutlined />}
              onClick={() => setChangesModalOpen(true)}
            >
              <Badge
                count={pendingCount}
                size="small"
                offset={[8, 0]}
                style={{ backgroundColor: token.colorWarning }}
              >
                <span style={{ marginRight: 12 }}>{t('header.pendingChanges')}</span>
              </Badge>
            </Button>
          ) : (
            <Tag icon={<CheckCircleOutlined />} color="success">
              {t('header.noChanges')}
            </Tag>
          )}

          {errorCount > 0 && (
            <Badge count={errorCount}>
              <Tag color="error">{t('header.validationErrors')}</Tag>
            </Badge>
          )}
        </Space>

        {/* Right: Actions */}
        <Space size="middle">
          {/* Publish Version Button */}
          {hasChanges && (
            <Button
              type="primary"
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={() => setChangesModalOpen(true)}
              loading={publishing}
            >
              {t('header.publishVersion')}
            </Button>
          )}

          <Dropdown
            menu={{
              items: languageMenuItems,
              onClick: ({ key }) => setLanguage(key as Language),
              selectedKeys: [language],
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<GlobalOutlined />}>
              {currentLanguageLabel}
            </Button>
          </Dropdown>

          <Tooltip title={connected ? t('header.connected') : t('header.disconnected')}>
            {connected ? (
              <WifiOutlined style={{ color: token.colorSuccess, fontSize: 16 }} />
            ) : (
              <DisconnectOutlined style={{ color: token.colorError, fontSize: 16 }} />
            )}
          </Tooltip>

          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            size="small"
          />
        </Space>
      </AntHeader>

      <ChangesPreviewModal
        open={changesModalOpen}
        onClose={() => setChangesModalOpen(false)}
        onConfirm={handlePublishVersion}
      />
    </>
  );
}
