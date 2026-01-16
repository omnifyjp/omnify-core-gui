/**
 * Schema Info Card component
 */

import { Card, Descriptions, Typography, Tag, Space, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { SchemaFormData } from './types.js';

const { Text } = Typography;

interface SchemaInfoCardProps {
  schemaData: SchemaFormData;
  isNew: boolean;
  autoSingular: string;
  autoPlural: string;
  autoTableName: string;
  optionsTags: React.ReactNode[];
  onEdit: () => void;
}

export function SchemaInfoCard({
  schemaData,
  isNew,
  autoSingular,
  autoPlural,
  autoTableName,
  optionsTags,
  onEdit,
}: SchemaInfoCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card
      title={isNew ? t('schema.newSchema') : schemaData.name}
      size="small"
      extra={
        <Button size="small" icon={<EditOutlined />} onClick={onEdit}>
          {t('common.edit')}
        </Button>
      }
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label={t('common.name')}>
          <Text strong>{schemaData.name || '-'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('schema.displayName')}>
          {schemaData.displayName || '-'}
        </Descriptions.Item>
        <Descriptions.Item label={t('schema.kind')}>
          <Tag color={schemaData.kind === 'enum' ? 'purple' : 'blue'}>
            {schemaData.kind === 'enum' ? t('schema.kindEnum') : t('schema.kindObject')}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label={t('schema.singular')}>
          {schemaData.singular || (
            <Text type="secondary">{autoSingular || '-'} {t('common.auto')}</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('schema.plural')}>
          {schemaData.plural || (
            <Text type="secondary">{autoPlural || '-'} {t('common.auto')}</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('schema.group')}>
          {schemaData.group || '-'}
        </Descriptions.Item>
        {schemaData.kind === 'object' && (
          <>
            <Descriptions.Item label={t('schema.tableName')}>
              {schemaData.tableName ? (
                schemaData.tableName
              ) : (
                <Text type="secondary">{autoTableName || '-'} {t('common.auto')}</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={t('schema.titleField')}>
              {schemaData.titleIndex || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('common.options')}>
              {optionsTags.length > 0 ? (
                <Space size="small">{optionsTags}</Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            {schemaData.authenticatable && (
              <Descriptions.Item label={t('schema.authConfig')}>
                <Space>
                  <Text type="secondary">{t('schema.loginIdField')}:</Text> {schemaData.authenticatableLoginIdField}
                  <Text type="secondary">{t('schema.passwordField')}:</Text> {schemaData.authenticatablePasswordField}
                  <Text type="secondary">{t('schema.guardName')}:</Text> {schemaData.authenticatableGuardName}
                </Space>
              </Descriptions.Item>
            )}
          </>
        )}
      </Descriptions>
    </Card>
  );
}
