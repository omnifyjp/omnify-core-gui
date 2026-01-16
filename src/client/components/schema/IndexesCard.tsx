/**
 * Indexes Card component for schema indexes table
 */

import { Card, Table, Button } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { IndexFormData } from './types.js';

interface DisplayIndex extends IndexFormData {
  _idx: number;
  _key: string;
}

interface IndexesCardProps {
  indexes: IndexFormData[];
  columns: TableColumnsType<DisplayIndex>;
  isIndexNew: (index: number) => boolean;
  isIndexChanged: (index: number) => boolean;
  onAdd: () => void;
  disableAdd?: boolean;
}

export function IndexesCard({
  indexes,
  columns,
  isIndexNew,
  isIndexChanged,
  onAdd,
  disableAdd,
}: IndexesCardProps): React.ReactElement {
  const { t } = useTranslation();

  const dataSource = indexes.map((idx, i) => ({
    ...idx,
    _idx: i,
    _key: `idx_${i}_${idx.columns.join('_')}`,
  }));

  return (
    <Card
      title={t('index.title')}
      size="small"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={disableAdd}
        >
          {t('index.addIndex')}
        </Button>
      }
    >
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey="_key"
        pagination={false}
        size="small"
        locale={{ emptyText: t('index.noIndexes') }}
        rowClassName={(record) => {
          if (isIndexNew(record._idx)) return 'row-new';
          if (isIndexChanged(record._idx)) return 'row-changed';
          return '';
        }}
      />
    </Card>
  );
}
