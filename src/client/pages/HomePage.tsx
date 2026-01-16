/**
 * Home page - Schema list dashboard with Table view
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Table, Typography, Button, Empty, Spin, theme, Space, Tag, Badge, Popconfirm } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined, FileOutlined, EditOutlined, DeleteOutlined, OrderedListOutlined, DiffOutlined, FolderOutlined } from '@ant-design/icons';
import { useSchemaStore } from '../stores/schemaStore.js';
import { ChangesPreviewModal } from '../components/common/ChangesPreviewModal.js';
import { versionsApi, type PendingChangesResult } from '../services/versions.js';
import type { GuiSchema } from '../../shared/types.js';

const { Title, Text } = Typography;

interface SchemaRow {
  key: string;
  name: string;
  displayName: string;
  kind: 'object' | 'enum' | 'partial' | 'pivot';
  group: string;
  properties: number;
  values?: number;
  changes: number;
  options: {
    timestamps?: boolean;
    softDelete?: boolean;
    authenticatable?: boolean;
  };
  schema: GuiSchema;
}

export function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { schemas, loading, deleteSchema } = useSchemaStore();
  const { token } = theme.useToken();
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [pendingData, setPendingData] = useState<PendingChangesResult | null>(null);

  // Load pending changes
  useEffect(() => {
    versionsApi.getPending()
      .then((data) => setPendingData(data))
      .catch(() => setPendingData(null));
  }, [schemas]);

  const getSchemaChanges = (schemaName: string): number => {
    if (!pendingData) return 0;
    return pendingData.changes.filter(c => c.schema === schemaName).length;
  };

  const pendingCount = pendingData?.changes.length ?? 0;
  const schemaList = Object.values(schemas);

  // Convert schemas to table rows
  const dataSource: SchemaRow[] = schemaList.map((schema) => {
    // Extract group from relativePath (e.g., "System/User.yaml" -> "System")
    const pathParts = schema.relativePath?.split('/') ?? [];
    const group = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '-';

    return {
      key: schema.name,
      name: schema.name,
      displayName: schema.displayName ?? '',
      kind: schema.kind ?? 'object',
      group,
      properties: schema.properties ? Object.keys(schema.properties).length : 0,
      values: schema.values?.length,
      changes: getSchemaChanges(schema.name),
      options: schema.options ?? {},
      schema,
    };
  });

  const handleDelete = async (name: string): Promise<void> => {
    await deleteSchema(name);
  };

  const columns: TableColumnsType<SchemaRow> = [
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <Space>
          {record.kind === 'enum' ? (
            <OrderedListOutlined style={{ color: '#722ed1' }} />
          ) : (
            <FileOutlined style={{ color: token.colorPrimary }} />
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a onClick={() => navigate(`/schema/${name}`)} style={{ fontWeight: 500 }}>
                {name}
              </a>
              {record.changes > 0 && (
                <Badge count={record.changes} size="small" style={{ backgroundColor: token.colorWarning }} />
              )}
            </div>
            {record.displayName && (
              <Text type="secondary">{record.displayName}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: t('schema.group'),
      dataIndex: 'group',
      key: 'group',
      sorter: (a, b) => a.group.localeCompare(b.group),
      filters: [...new Set(dataSource.map(d => d.group))].map(g => ({ text: g, value: g })),
      onFilter: (value, record) => record.group === value,
      render: (group: string) => (
        group !== '-' ? (
          <Space>
            <FolderOutlined style={{ color: token.colorTextSecondary }} />
            <Text type="secondary">{group}</Text>
          </Space>
        ) : <Text type="secondary">-</Text>
      ),
    },
    {
      title: t('common.type'),
      dataIndex: 'kind',
      key: 'kind',
      width: 100,
      filters: [
        { text: t('schema.kindObject'), value: 'object' },
        { text: t('schema.kindEnum'), value: 'enum' },
      ],
      onFilter: (value, record) => record.kind === value,
      render: (kind: string) => (
        <Tag color={kind === 'enum' ? 'purple' : 'blue'}>
          {kind === 'enum' ? t('schema.kindEnum') : t('schema.kindObject')}
        </Tag>
      ),
    },
    {
      title: t('home.fields'),
      key: 'fields',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.values ?? a.properties) - (b.values ?? b.properties),
      render: (_, record) => (
        <Text>{record.kind === 'enum' ? record.values : record.properties}</Text>
      ),
    },
    {
      title: t('common.options'),
      key: 'options',
      width: 200,
      render: (_, record) => (
        <Space size="small" wrap>
          {record.options.timestamps && <Tag color="blue">timestamps</Tag>}
          {record.options.softDelete && <Tag color="orange">softDelete</Tag>}
          {record.options.authenticatable && <Tag color="red">auth</Tag>}
        </Space>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/schema/${record.name}`)}
          />
          <Popconfirm
            title={t('home.deleteConfirm', { name: record.name })}
            onConfirm={() => handleDelete(record.name)}
            okText={t('common.delete')}
            okType="danger"
            cancelText={t('common.cancel')}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && schemaList.length === 0) {
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
          {t('home.title')} ({schemaList.length})
        </Title>
        <Space>
          <Badge count={pendingCount} offset={[-5, 5]}>
            <Button
              size="small"
              icon={<DiffOutlined />}
              onClick={() => setChangesModalOpen(true)}
              type={pendingCount > 0 ? 'primary' : 'default'}
              ghost={pendingCount > 0}
            >
              {pendingCount > 0 ? t('home.pendingChanges', { count: pendingCount }) : t('home.noChanges')}
            </Button>
          </Badge>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/schema/new')}
          >
            {t('home.newSchema')}
          </Button>
        </Space>
      </div>

      {schemaList.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('home.noSchemas')}
          style={{ marginTop: token.marginXL }}
        >
          <Button type="primary" onClick={() => navigate('/schema/new')}>
            {t('home.createFirst')}
          </Button>
        </Empty>
      ) : (
        <Table
          dataSource={dataSource}
          columns={columns}
          size="small"
          pagination={{
            defaultPageSize: 20,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} schemas`,
          }}
          rowClassName={(record) => record.changes > 0 ? 'row-has-changes' : ''}
          style={{ background: token.colorBgContainer, borderRadius: token.borderRadius }}
        />
      )}

      <ChangesPreviewModal
        open={changesModalOpen}
        onClose={() => setChangesModalOpen(false)}
      />

      <style>{`
        .row-has-changes {
          background-color: ${token.colorWarningBg} !important;
        }
        .row-has-changes:hover > td {
          background-color: ${token.colorWarningBgHover} !important;
        }
      `}</style>
    </div>
  );
}
