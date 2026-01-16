/**
 * Enum Value Edit Modal component
 */

import { Modal, Form, Input, Divider, Button, Space, Typography, theme } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { isValidIdentifier } from '../../../shared/validation.js';

const { Text } = Typography;

interface EnumExtraProp {
  key: string;
  value: string;
}

interface EnumModalProps {
  open: boolean;
  form: FormInstance;
  editingIndex: number | null;
  extraProps: EnumExtraProp[];
  onOk: () => Promise<void>;
  onCancel: () => void;
  onAddExtraProp: () => void;
  onUpdateExtraProp: (index: number, field: 'key' | 'value', value: string) => void;
  onRemoveExtraProp: (index: number) => void;
}

export function EnumModal({
  open,
  form,
  editingIndex,
  extraProps,
  onOk,
  onCancel,
  onAddExtraProp,
  onUpdateExtraProp,
  onRemoveExtraProp,
}: EnumModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <Modal
      title={editingIndex !== null ? t('common.edit') : t('enum.addValue')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={editingIndex !== null ? t('common.update') : t('common.add')}
      width={500}
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ marginTop: token.margin }}>
        <Form.Item
          name="value"
          label={t('common.name')}
          normalize={(value: string) => value?.trim() ?? value}
          rules={[
            { required: true, message: t('validation.required', { field: t('common.name') }) },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                return isValidIdentifier(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('validation.invalidName')));
              },
            },
          ]}
        >
          <Input placeholder="e.g., ACTIVE, pending, InProgress" />
        </Form.Item>

        <Form.Item name="label" label={t('enum.displayLabel')}>
          <Input placeholder="e.g., Active Status, In Progress" />
        </Form.Item>

        <Divider style={{ margin: `${token.marginSM}px 0` }} />

        <div style={{ marginBottom: token.marginSM }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: token.marginXS }}>
            <Text type="secondary">{t('enum.extraProperties', 'Extra Properties')}</Text>
            <Button size="small" icon={<PlusOutlined />} onClick={onAddExtraProp}>
              {t('common.add')}
            </Button>
          </div>
          {extraProps.length === 0 ? (
            <Text type="secondary" style={{ fontStyle: 'italic', display: 'block' }}>
              {t('enum.noExtraProperties', 'No extra properties. Add custom fields like bgColor, textColor, icon, order, etc.')}
            </Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {extraProps.map((prop, index) => (
                <Space key={index} style={{ width: '100%' }}>
                  <Input
                    value={prop.key}
                    onChange={(e) => onUpdateExtraProp(index, 'key', e.target.value)}
                    placeholder="Key (e.g., bgColor)"
                    style={{ width: 150 }}
                  />
                  <Input
                    value={prop.value}
                    onChange={(e) => onUpdateExtraProp(index, 'value', e.target.value)}
                    placeholder="Value (e.g., #ff0000)"
                    style={{ width: 200 }}
                  />
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => onRemoveExtraProp(index)}
                  />
                </Space>
              ))}
            </Space>
          )}
        </div>
      </Form>
    </Modal>
  );
}
