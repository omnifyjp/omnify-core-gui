/**
 * Version History Page - Display schema version history with diff view
 */

import { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Tag,
  Space,
  Spin,
  Empty,
  Card,
  Descriptions,
  theme,
  Alert,
  Badge,
  Collapse,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  HistoryOutlined,
  DiffOutlined,
  EyeOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { versionsApi } from '../services/versions.js';
import { ChangesList } from '../components/common/ChangesList.js';
import type { VersionSummary, VersionFile, VersionDiff } from '@famgia/omnify-core';

const { Title, Text } = Typography;
const { Panel } = Collapse;

export function VersionHistoryPage(): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionFile | null>(null);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [diffVersions, setDiffVersions] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await versionsApi.getAll();
      setVersions(data.reverse()); // Show newest first
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVersion = async (version: number): Promise<void> => {
    try {
      const data = await versionsApi.get(version);
      setSelectedVersion(data);
      setVersionModalVisible(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleViewDiff = async (from: number, to: number): Promise<void> => {
    try {
      const data = await versionsApi.getDiff(from, to);
      setDiff(data);
      setDiffVersions({ from, to });
      setDiffModalVisible(true);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const columns = [
    {
      title: t('history.version'),
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (v: number) => (
        <Badge count={`v${v}`} style={{ backgroundColor: token.colorPrimary }} />
      ),
    },
    {
      title: t('history.migration'),
      dataIndex: 'migration',
      key: 'migration',
      ellipsis: true,
      render: (m: string | undefined) => m || <Text type="secondary">-</Text>,
    },
    {
      title: t('history.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (d: string | undefined) => d || <Text type="secondary">-</Text>,
    },
    {
      title: t('home.title'),
      dataIndex: 'schemaCount',
      key: 'schemaCount',
      width: 100,
      align: 'center' as const,
      render: (c: number) => <Tag>{c}</Tag>,
    },
    {
      title: t('history.changes'),
      dataIndex: 'changeCount',
      key: 'changeCount',
      width: 100,
      align: 'center' as const,
      render: (c: number) => (
        <Tag color={c > 0 ? 'blue' : 'default'}>{c}</Tag>
      ),
    },
    {
      title: t('history.timestamp'),
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts: string) => new Date(ts).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 150,
      render: (_: unknown, record: VersionSummary) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewVersion(record.version)}
          />
          {record.version > 1 && (
            <Button
              type="text"
              icon={<DiffOutlined />}
              onClick={() => handleViewDiff(record.version - 1, record.version)}
            />
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: token.paddingXL }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: token.margin,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          <HistoryOutlined style={{ marginRight: 8 }} />
          {t('history.title')}
        </Title>
      </div>

      {error && (
        <Alert
          message={t('error.title')}
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: token.margin }}
          onClose={() => setError(null)}
        />
      )}

      {versions.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('history.noVersions')}
        />
      ) : (
        <Table
          columns={columns}
          dataSource={versions}
          rowKey="version"
          pagination={{ pageSize: 10 }}
        />
      )}

      {/* Version Detail Modal */}
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>{t('history.versionDetail')} {selectedVersion?.version}</span>
          </Space>
        }
        open={versionModalVisible}
        onCancel={() => setVersionModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedVersion && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('history.version')}>{selectedVersion.version}</Descriptions.Item>
              <Descriptions.Item label={t('history.driver')}>{selectedVersion.driver}</Descriptions.Item>
              <Descriptions.Item label={t('history.migration')}>
                {selectedVersion.migration || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('history.timestamp')}>
                {new Date(selectedVersion.timestamp).toLocaleString()}
              </Descriptions.Item>
              {selectedVersion.description && (
                <Descriptions.Item label={t('history.description')} span={2}>
                  {selectedVersion.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Card title={t('history.changes')} size="small" style={{ marginBottom: 16 }}>
              {selectedVersion.changes.length === 0 ? (
                <Text type="secondary">{t('history.noChangesRecorded')}</Text>
              ) : (
                <ChangesList changes={selectedVersion.changes} compact />
              )}
            </Card>

            <Card title={t('history.schemaSnapshot')} size="small">
              <Collapse ghost>
                {Object.entries(selectedVersion.snapshot).map(([name, schema]) => (
                  <Panel
                    header={
                      <Space>
                        <FileOutlined />
                        <Text strong>{name}</Text>
                        <Tag>{schema.kind}</Tag>
                      </Space>
                    }
                    key={name}
                  >
                    <pre
                      style={{
                        fontSize: 12,
                        background: token.colorBgLayout,
                        padding: 12,
                        borderRadius: token.borderRadius,
                        overflow: 'auto',
                        maxHeight: 300,
                      }}
                    >
                      {JSON.stringify(schema, null, 2)}
                    </pre>
                  </Panel>
                ))}
              </Collapse>
            </Card>
          </div>
        )}
      </Modal>

      {/* Diff Modal */}
      <Modal
        title={
          <Space>
            <DiffOutlined />
            <span>
              {t('history.diff')}: v{diffVersions?.from} → v{diffVersions?.to}
            </span>
          </Space>
        }
        open={diffModalVisible}
        onCancel={() => setDiffModalVisible(false)}
        footer={null}
        width={700}
      >
        {diff && (
          <div>
            {diff.changes.length === 0 ? (
              <Empty description={t('history.noChangesBetween')} />
            ) : (
              <div>
                <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                  {t('history.changesDetected', { count: diff.changes.length })}
                </Text>
                <ChangesList changes={diff.changes} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
