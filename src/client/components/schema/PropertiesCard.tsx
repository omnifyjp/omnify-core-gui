/**
 * Properties Card component for schema properties table
 */

import { Card, Table, Button } from 'antd';
import type { TableColumnsType } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { PropertyFormData } from './types.js';

interface DisplayProperty extends PropertyFormData {
  _isVirtual?: boolean;
  _idx?: number;
}

interface PropertiesCardProps {
  displayProperties: DisplayProperty[];
  columns: TableColumnsType<DisplayProperty>;
  isPropertyNew: (index: number) => boolean;
  isPropertyChanged: (index: number) => boolean;
  onAdd: () => void;
}

export function PropertiesCard({
  displayProperties,
  columns,
  isPropertyNew,
  isPropertyChanged,
  onAdd,
}: PropertiesCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card
      title={t('property.title')}
      size="small"
      extra={
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
          {t('property.addProperty')}
        </Button>
      }
    >
      <Table
        dataSource={displayProperties}
        columns={columns}
        rowKey="name"
        pagination={false}
        size="small"
        locale={{ emptyText: t('property.noProperties') }}
        rowClassName={(record) => {
          if (record._isVirtual || record._idx === undefined || record._idx < 0) return '';
          if (isPropertyNew(record._idx)) return 'row-new';
          if (isPropertyChanged(record._idx)) return 'row-changed';
          return '';
        }}
      />
    </Card>
  );
}
