/**
 * Schema Edit Modal component
 */

import { Modal, Form, Input, Select, Checkbox, Divider, AutoComplete, theme } from 'antd';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';

interface SchemaModalProps {
  open: boolean;
  form: FormInstance;
  isNew: boolean;
  autoSingular: string;
  autoPlural: string;
  autoTableName: string;
  propertyNames: string[];
  groupOptions: Array<{ value: string }>;
  onOk: () => Promise<void>;
  onCancel: () => void;
}

export function SchemaModal({
  open,
  form,
  isNew,
  autoSingular,
  autoPlural,
  autoTableName,
  propertyNames,
  groupOptions,
  onOk,
  onCancel,
}: SchemaModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const schemaFormKind = Form.useWatch('kind', form);
  const isAuthenticatableForm = Form.useWatch('authenticatable', form);

  return (
    <Modal
      title={t('schema.editSchema')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={t('common.apply')}
      width={700}
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ marginTop: token.margin }}>
        {/* Section 1: Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: token.margin }}>
          <Form.Item
            name="name"
            label={t('schema.schemaName')}
            rules={[{ required: true, message: t('validation.required', { field: t('schema.schemaName') }) }]}
          >
            <Input placeholder="e.g., User, Post" disabled={!isNew} />
          </Form.Item>

          <Form.Item name="displayName" label={t('schema.displayName')}>
            <Input placeholder="e.g., User Account" />
          </Form.Item>

          <Form.Item name="kind" label={t('schema.kind')}>
            <Select
              disabled={!isNew}
              options={[
                { value: 'object', label: t('schema.kindObject') },
                { value: 'enum', label: t('schema.kindEnum') },
              ]}
            />
          </Form.Item>
        </div>

        {/* Section 2: Organization - Group */}
        <Form.Item name="group" label={t('schema.group')}>
          <AutoComplete
            options={groupOptions}
            placeholder="e.g., auth, content, blog"
            filterOption={(inputValue, option) =>
              option?.value.toLowerCase().includes(inputValue.toLowerCase()) ?? false
            }
          />
        </Form.Item>

        {schemaFormKind === 'object' && (
          <>
            {/* Section 3: Naming */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.margin }}>
              <Form.Item name="singular" label={t('schema.singular', 'Singular')}>
                <Input placeholder={autoSingular ? `${autoSingular} ${t('common.auto')}` : 'e.g., user'} />
              </Form.Item>

              <Form.Item name="plural" label={t('schema.plural', 'Plural')}>
                <Input placeholder={autoPlural ? `${autoPlural} ${t('common.auto')}` : 'e.g., users'} />
              </Form.Item>

              <Form.Item name="tableName" label={t('schema.tableName')}>
                <Input placeholder={autoTableName ? `${autoTableName} ${t('common.auto')}` : 'e.g., users'} />
              </Form.Item>
            </div>

            {/* Section 4: Display */}
            <Form.Item name="titleIndex" label={t('schema.titleField')}>
              <Select
                allowClear
                options={propertyNames.map((n) => ({ value: n, label: n }))}
                placeholder={t('schema.titleField')}
              />
            </Form.Item>

            <Divider style={{ margin: `${token.marginSM}px 0` }} />

            {/* Section 5: Database Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.margin }}>
              {/* Auto ID Type */}
              <Form.Item name="primaryKey" label={t('schema.primaryKey')}>
                <Select
                  options={[
                    { value: 'BigInt', label: 'BigInt' },
                    { value: 'Int', label: 'Int' },
                    { value: 'Uuid', label: 'UUID' },
                    { value: 'none', label: t('schema.noPrimaryKey') },
                  ]}
                />
              </Form.Item>

              {/* Timestamps */}
              <Form.Item name="timestamps" valuePropName="checked" label=" " colon={false}>
                <Checkbox>{t('schema.timestamps')}</Checkbox>
              </Form.Item>

              {/* Soft Delete */}
              <Form.Item name="softDelete" valuePropName="checked" label=" " colon={false}>
                <Checkbox>{t('schema.softDelete')}</Checkbox>
              </Form.Item>
            </div>

            {/* Section 6: Advanced Features */}
            <div style={{ display: 'flex', alignItems: 'center', gap: token.marginLG, marginTop: token.marginSM }}>
              <Form.Item name="translations" valuePropName="checked" noStyle>
                <Checkbox>{t('schema.translations')}</Checkbox>
              </Form.Item>
              <Form.Item name="authenticatable" valuePropName="checked" noStyle>
                <Checkbox>{t('schema.authenticatable')}</Checkbox>
              </Form.Item>
            </div>

            {/* Auth Config (conditional) */}
            {isAuthenticatableForm && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: token.margin, marginTop: token.margin, background: token.colorBgTextHover, padding: token.padding, borderRadius: token.borderRadius }}>
                <Form.Item name="authenticatableLoginIdField" label={t('schema.loginIdField')} style={{ marginBottom: 0 }}>
                  <Input placeholder="email" />
                </Form.Item>
                <Form.Item name="authenticatablePasswordField" label={t('schema.passwordField')} style={{ marginBottom: 0 }}>
                  <Input placeholder="password" />
                </Form.Item>
                <Form.Item name="authenticatableGuardName" label={t('schema.guardName')} style={{ marginBottom: 0 }}>
                  <Input placeholder="web" />
                </Form.Item>
              </div>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
