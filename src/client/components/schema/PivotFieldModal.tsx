/**
 * Pivot Field Edit Modal component
 */

import { Modal, Form, Input, Select, Checkbox, theme } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { PIVOT_FIELD_TYPES } from '../../../shared/constants.js';

interface PivotFieldModalProps {
  open: boolean;
  form: FormInstance;
  editingIndex: number | null;
  onOk: () => Promise<void>;
  onCancel: () => void;
}

export function PivotFieldModal({
  open,
  form,
  editingIndex,
  onOk,
  onCancel,
}: PivotFieldModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  return (
    <Modal
      title={editingIndex !== null ? t('common.edit') : t('association.addPivotField', 'Add Pivot Field')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={editingIndex !== null ? t('common.update') : t('common.add')}
      width={450}
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ marginTop: token.margin }}>
        <Form.Item
          name="name"
          label={t('common.name')}
          rules={[
            { required: true, message: t('validation.required', { field: t('common.name') }) },
            { pattern: /^[a-z_][a-z0-9_]*$/, message: t('validation.snakeCase', 'Use snake_case (e.g., created_at)') },
          ]}
        >
          <Input placeholder="e.g., order, role, expires_at" />
        </Form.Item>

        <Form.Item
          name="type"
          label={t('common.type')}
          rules={[{ required: true, message: t('validation.required', { field: t('common.type') }) }]}
        >
          <Select
            options={PIVOT_FIELD_TYPES.map((type) => ({ value: type, label: type }))}
          />
        </Form.Item>

        <Form.Item name="nullable" valuePropName="checked">
          <Checkbox>{t('property.nullable')}</Checkbox>
        </Form.Item>

        <Form.Item name="default" label={t('property.defaultValue')}>
          <Input placeholder={t('property.defaultPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
