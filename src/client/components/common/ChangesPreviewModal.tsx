/**
 * Changes Preview Modal - Shows pending schema changes before generating
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Space,
  Empty,
  Spin,
  Alert,
  Badge,
  Typography,
  theme,
  Statistic,
  Row,
  Col,
  Popconfirm,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  DiffOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { versionsApi, type PendingChangesResult } from '../../services/versions.js';
import { useSchemaStore } from '../../stores/schemaStore.js';
import { ChangesList, countChangesByType } from './ChangesList.js';

const { Title, Text } = Typography;

interface ChangesPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
}

export function ChangesPreviewModal({
  open,
  onClose,
  onConfirm,
}: ChangesPreviewModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChangesResult | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const { loadSchemas } = useSchemaStore();

  useEffect(() => {
    if (open) {
      loadPendingChanges();
    }
  }, [open]);

  const loadPendingChanges = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await versionsApi.getPending();
      setPending(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardChanges = async (): Promise<void> => {
    setDiscarding(true);
    try {
      const result = await versionsApi.discardChanges();
      void message.success(t('changes.discardSuccess', { restored: result.restored, deleted: result.deleted }));
      await loadSchemas();
      onClose();
    } catch (e) {
      void message.error((e as Error).message);
    } finally {
      setDiscarding(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: token.paddingXL }}>
          <Spin size="large" />
          <div style={{ marginTop: token.margin }}>
            <Text type="secondary">{t('changes.analyzing')}</Text>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message={t('changes.errorLoading')}
          description={error}
          type="error"
          showIcon
        />
      );
    }

    if (!pending) {
      return <Empty description={t('changes.unableToLoad')} />;
    }

    if (!pending.hasChanges) {
      return (
        <div style={{ textAlign: 'center', padding: token.paddingXL }}>
          <CheckCircleOutlined
            style={{ fontSize: 48, color: token.colorSuccess, marginBottom: 16 }}
          />
          <Title level={4}>{t('changes.noChanges')}</Title>
          <Text type="secondary">
            {t('changes.upToDate', { version: pending.latestVersion ?? t('changes.initial') })}
          </Text>
        </div>
      );
    }

    const counts = countChangesByType(pending.changes);

    return (
      <div>
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic
              title={t('changes.totalChanges')}
              value={pending.changes.length}
              prefix={<DiffOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('changes.added')}
              value={counts.added}
              valueStyle={{ color: token.colorSuccess }}
              prefix={<PlusCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('changes.modified')}
              value={counts.modified}
              valueStyle={{ color: token.colorWarning }}
              prefix={<EditOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={t('changes.removed')}
              value={counts.removed}
              valueStyle={{ color: token.colorError }}
              prefix={<MinusCircleOutlined />}
            />
          </Col>
        </Row>

        {/* Version info */}
        {/* <Alert
          message={
            pending.latestVersion
              ? t('changes.comparingWith', { version: pending.latestVersion })
              : t('changes.initialVersion')
          }
          description={t('changes.schemasInProject', { count: pending.currentSchemaCount })}
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16 }}
        /> */}

        {/* Changes list using shared component */}
        <div
          style={{
            maxHeight: 400,
            overflow: 'auto',
            padding: 12,
            background: token.colorBgLayout,
            borderRadius: token.borderRadius,
          }}
        >
          <ChangesList changes={pending.changes} />
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <DiffOutlined />
          <span>{t('changes.pendingPreview')}</span>
          {pending?.hasChanges && (
            <Badge count={pending.changes.length} style={{ backgroundColor: token.colorPrimary }} />
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {pending?.hasChanges && pending.latestVersion !== null && (
              <Popconfirm
                title={t('changes.discardConfirm')}
                description={t('changes.discardConfirmDesc')}
                onConfirm={handleDiscardChanges}
                okText={t('changes.discardYes')}
                cancelText={t('changes.cancel')}
                okButtonProps={{ danger: true, loading: discarding }}
              >
                <Button danger icon={<UndoOutlined />} loading={discarding}>
                  {t('changes.discardChanges')}
                </Button>
              </Popconfirm>
            )}
          </div>
          <Space>
            <Button onClick={onClose}>{t('changes.close')}</Button>
            {onConfirm && pending?.hasChanges && (
              <Button type="primary" onClick={onConfirm}>
                {t('changes.generateMigration')}
              </Button>
            )}
          </Space>
        </div>
      }
    >
      {renderContent()}
    </Modal>
  );
}
