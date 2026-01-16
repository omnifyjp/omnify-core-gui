/**
 * Enum Values Card component for schema enum values editing
 */

import { Card, Table, Button, Space, Tag, Tooltip, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { GuiEnumValue } from '../../../shared/types.js';

const { Text } = Typography;

interface EnumValuesCardProps {
  enumValues: GuiEnumValue[];
  isEnumValueNew: (index: number) => boolean;
  isEnumValueChanged: (index: number) => boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function EnumValuesCard({
  enumValues,
  isEnumValueNew,
  isEnumValueChanged,
  onAdd,
  onEdit,
  onRemove,
}: EnumValuesCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card
      title={t('enum.title')}
      size="small"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
          {t('enum.addValue')}
        </Button>
      }
    >
      <Table
        dataSource={enumValues.map((v, i) => ({ ...v, _idx: i, _key: `enum_${i}_${v.value || 'new'}` }))}
        rowKey="_key"
        pagination={false}
        size="small"
        locale={{ emptyText: t('enum.noValues') }}
        rowClassName={(record) => {
          if (isEnumValueNew(record._idx)) return 'row-new';
          if (isEnumValueChanged(record._idx)) return 'row-changed';
          return '';
        }}
        columns={[
          {
            title: t('enum.value'),
            dataIndex: 'value',
            key: 'value',
            render: (val: string) => <Text strong code>{val}</Text>,
          },
          {
            title: t('enum.label'),
            dataIndex: 'label',
            key: 'label',
            render: (val: string | undefined) => val || <Text type="secondary">-</Text>,
          },
          {
            title: t('enum.extra'),
            key: 'extra',
            width: 120,
            render: (_: unknown, record: GuiEnumValue) => {
              const count = record.extra ? Object.keys(record.extra).length : 0;
              return count > 0 ? (
                <Tooltip title={Object.entries(record.extra!).map(([k, v]) => `${k}: ${v}`).join(', ')}>
                  <Tag color="blue">{count} props</Tag>
                </Tooltip>
              ) : (
                <Text type="secondary">-</Text>
              );
            },
          },
          {
            title: t('common.actions'),
            key: 'actions',
            width: 100,
            render: (_: unknown, record: GuiEnumValue & { _idx: number }) => (
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record._idx)}
                />
                <Popconfirm
                  title={t('enum.deleteConfirm')}
                  onConfirm={() => onRemove(record._idx)}
                  okText={t('common.yes')}
                  cancelText={t('common.no')}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
