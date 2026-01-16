/**
 * YAML Editor Card component for code mode editing
 */

import { Card, Space, Tag } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { YamlEditor } from '../YamlEditor.js';

interface YamlEditorCardProps {
  schemaName: string;
  yamlContent: string;
  yamlError: string | null;
  onYamlChange: (value: string) => void;
}

export function YamlEditorCard({
  schemaName,
  yamlContent,
  yamlError,
  onYamlChange,
}: YamlEditorCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card
      title={
        <Space>
          <CodeOutlined />
          {t('schema.yamlEditor')}
          {schemaName && <Tag>{schemaName}.yaml</Tag>}
        </Space>
      }
      size="small"
    >
      <YamlEditor
        value={yamlContent}
        onChange={onYamlChange}
        error={yamlError}
        height="calc(100vh - 200px)"
      />
    </Card>
  );
}
