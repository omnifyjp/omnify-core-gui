/**
 * Property Edit Modal component
 */

import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  Divider,
  Collapse,
  Radio,
  Space,
  Table,
  Button,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  PROPERTY_TYPES,
  RELATION_TYPES,
  POLYMORPHIC_RELATION_TYPES,
  REFERENTIAL_ACTIONS,
} from '../../../shared/constants.js';
import { validateDefaultValueUI } from '../../../shared/validation.js';
import type { GuiEnumValue } from '../../../shared/types.js';
import { RELATION_TYPE_CONFIGS, STRING_TYPES, NUMERIC_TYPES, type GuiPivotField } from './types.js';

const { Text } = Typography;

interface PropertyModalProps {
  open: boolean;
  form: FormInstance;
  editingIndex: number | null;
  customTypes: string[];
  schemaNames: string[];
  schemas: Record<string, { kind: string; values?: GuiEnumValue[] }>;
  inlineEnumValues: GuiEnumValue[];
  pivotFields: GuiPivotField[];
  onOk: () => Promise<void>;
  onCancel: () => void;
  onAddEnumValue: () => void;
  onEditEnumValue: (index: number) => void;
  onRemoveEnumValue: (index: number) => void;
  onAddPivotField: () => void;
  onEditPivotField: (index: number) => void;
  onRemovePivotField: (index: number) => void;
}

export function PropertyModal({
  open,
  form,
  editingIndex,
  customTypes,
  schemaNames,
  schemas,
  inlineEnumValues,
  pivotFields,
  onOk,
  onCancel,
  onAddEnumValue,
  onEditEnumValue,
  onRemoveEnumValue,
  onAddPivotField,
  onEditPivotField,
  onRemovePivotField,
}: PropertyModalProps): React.ReactElement {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const selectedType = Form.useWatch('type', form);
  const selectedRelation = Form.useWatch('relation', form);
  const selectedEnumRef = Form.useWatch('enum', form);

  // Determine which additional fields to show based on type
  const isStringType = STRING_TYPES.includes(selectedType);
  const isNumericType = NUMERIC_TYPES.includes(selectedType);
  const isDecimalType = selectedType === 'Decimal';
  const isEnumType = selectedType === 'Enum';
  const isEnumRefType = selectedType === 'EnumRef';
  const isAssociationType = selectedType === 'Association';
  const isFileType = selectedType === 'File';

  // File type additional options
  const isMultipleFile = Form.useWatch('multiple', form) ?? false;

  // Polymorphic relation checks
  const isMorphTo = selectedRelation === 'MorphTo';
  const isMorphInverse = ['MorphOne', 'MorphMany', 'MorphedByMany'].includes(selectedRelation ?? '');
  const needsJoinTable = ['ManyToMany', 'MorphToMany'].includes(selectedRelation ?? '');
  const isStandardRelation = RELATION_TYPES.includes(selectedRelation as typeof RELATION_TYPES[number]);

  // Get enum options with value and label for Select component
  const getEnumOptionsForSelect = (): { value: string; label: string }[] => {
    if (selectedType === 'Enum') {
      return inlineEnumValues.map((v) => ({
        value: v.value,
        label: v.label ?? v.value,
      }));
    }
    if (selectedType === 'EnumRef' && typeof selectedEnumRef === 'string') {
      const refSchema = schemas[selectedEnumRef];
      if (refSchema?.kind === 'enum') {
        return refSchema.values?.map((v) => ({
          value: v.value,
          label: v.label ?? v.value,
        })) ?? [];
      }
    }
    return [];
  };

  // Get enum values for validation
  const getEnumValuesForValidation = (): string[] => {
    return getEnumOptionsForSelect().map((opt) => opt.value);
  };

  return (
    <Modal
      title={editingIndex !== null ? t('property.editProperty') : t('property.addProperty')}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={editingIndex !== null ? t('common.update') : t('common.add')}
      width={600}
    >
      <Form form={form} layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ marginTop: token.margin }}>
        <Form.Item
          name="name"
          label={t('property.propertyName')}
          rules={[
            { required: true, message: t('validation.required', { field: t('property.propertyName') }) },
            { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: t('validation.invalidName') },
          ]}
        >
          <Input placeholder="e.g., email, firstName" />
        </Form.Item>

        <Form.Item
          name="type"
          label={t('common.type')}
          rules={[{ required: true, message: t('validation.required', { field: t('common.type') }) }]}
        >
          <Select
            options={[
              ...PROPERTY_TYPES.map((pt) => ({ value: pt, label: pt })),
              ...customTypes.map((ct) => ({ value: ct, label: `${ct} (Custom)` })),
              { value: 'Association', label: 'Association (Relation)' },
            ]}
            showSearch
          />
        </Form.Item>

        {/* String Type Options */}
        {isStringType && (
          <Form.Item name="length" label={t('property.maxLength')}>
            <InputNumber min={1} max={65535} placeholder="255" style={{ width: '100%' }} />
          </Form.Item>
        )}

        {/* Numeric Type Options */}
        {isNumericType && isDecimalType && (
          <>
            <Form.Item name="precision" label={t('property.precision')}>
              <InputNumber min={1} max={65} placeholder="8" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="scale" label={t('property.scale')}>
              <InputNumber min={0} max={30} placeholder="2" style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}
        {isNumericType && (
          <Form.Item name="unsigned" valuePropName="checked" wrapperCol={{ offset: 6, span: 18 }}>
            <Checkbox>{t('property.positiveOnly')}</Checkbox>
          </Form.Item>
        )}

        {/* File Type Options */}
        {isFileType && (
          <>
            <Form.Item name="multiple" valuePropName="checked" wrapperCol={{ offset: 6, span: 18 }}>
              <Checkbox>{t('property.multipleFiles', 'Allow multiple files')}</Checkbox>
            </Form.Item>
            {isMultipleFile && (
              <Form.Item name="maxFiles" label={t('property.maxFiles', 'Max files')}>
                <InputNumber min={1} max={100} placeholder="10" style={{ width: '100%' }} />
              </Form.Item>
            )}
            <Form.Item name="accept" label={t('property.acceptedExtensions', 'Accepted extensions')} help={t('property.acceptedExtensionsHelp', 'Comma-separated, e.g.: jpg, png, pdf')}>
              <Input placeholder="jpg, png, pdf" />
            </Form.Item>
            <Form.Item name="maxSize" label={t('property.maxSize', 'Max size (KB)')}>
              <InputNumber min={1} max={102400} placeholder="10240" style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}

        {/* Enum Type Options */}
        {isEnumType && (
          <div style={{ marginBottom: token.margin }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: token.marginXS }}>
              <Text strong>{t('property.inlineEnumValues', 'Inline Enum Values')}</Text>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddEnumValue}>
                {t('enum.addValue')}
              </Button>
            </div>
            <Table
              dataSource={inlineEnumValues.map((v, i) => ({ ...v, _idx: i, _key: `inline_enum_${i}_${v.value || 'new'}` }))}
              rowKey="_key"
              pagination={false}
              size="small"
              locale={{ emptyText: t('enum.noValues') }}
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
                  width: 80,
                  render: (_: unknown, record: GuiEnumValue) => {
                    const count = record.extra ? Object.keys(record.extra).length : 0;
                    return count > 0 ? (
                      <Tooltip title={Object.entries(record.extra!).map(([k, v]) => `${k}: ${v}`).join(', ')}>
                        <Tag color="blue">{count}</Tag>
                      </Tooltip>
                    ) : (
                      <Text type="secondary">-</Text>
                    );
                  },
                },
                {
                  title: '',
                  key: 'actions',
                  width: 80,
                  render: (_: unknown, record: GuiEnumValue & { _idx: number }) => (
                    <Space size="small">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEditEnumValue(record._idx)}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onRemoveEnumValue(record._idx)}
                      />
                    </Space>
                  ),
                },
              ]}
            />
            {inlineEnumValues.length === 0 && (
              <Text type="secondary" style={{ display: 'block', marginTop: token.marginXS }}>
                {t('property.inlineEnumHint', 'Add enum values with optional labels and extra properties.')}
              </Text>
            )}
          </div>
        )}

        {/* EnumRef Type Options */}
        {isEnumRefType && (
          <Form.Item
            name="enum"
            label={t('property.enumSchemaRef', 'Enum Schema Reference')}
            rules={[{ required: true, message: t('validation.required', { field: 'Enum schema' }) }]}
          >
            <Select
              placeholder={t('property.selectEnumSchema', 'Select enum schema')}
              options={schemaNames
                .filter((n) => schemas[n]?.kind === 'enum')
                .map((n) => ({ value: n, label: n }))}
              showSearch
            />
          </Form.Item>
        )}

        {/* Association Type Options */}
        {isAssociationType && (
          <>
            <Form.Item
              name="relation"
              label={t('association.relationType')}
              rules={[{ required: true, message: t('validation.required', { field: t('association.relationType') }) }]}
            >
              <Radio.Group style={{ width: '100%' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('association.standardRelations')}</Text>
                </div>
                <Space wrap size={8} style={{ marginBottom: 12 }}>
                  {RELATION_TYPES.map((rel) => (
                    <Radio.Button
                      key={rel}
                      value={rel}
                      style={{
                        height: 'auto',
                        padding: '8px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 80,
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace' }}>
                        {RELATION_TYPE_CONFIGS[rel]?.icon}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {RELATION_TYPE_CONFIGS[rel]?.desc}
                      </div>
                    </Radio.Button>
                  ))}
                </Space>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('association.polymorphicRelations')}</Text>
                </div>
                <Space wrap size={8}>
                  {POLYMORPHIC_RELATION_TYPES.map((rel) => (
                    <Radio.Button
                      key={rel}
                      value={rel}
                      style={{
                        height: 'auto',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: 70,
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>
                        {RELATION_TYPE_CONFIGS[rel]?.icon}
                      </div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        {RELATION_TYPE_CONFIGS[rel]?.desc}
                      </div>
                    </Radio.Button>
                  ))}
                </Space>
              </Radio.Group>
            </Form.Item>

            {/* Standard relation: single target */}
            {isStandardRelation && (
              <Form.Item
                name="target"
                label={t('association.targetSchema')}
                rules={[{ required: true, message: t('validation.required', { field: t('association.targetSchema') }) }]}
              >
                <Select
                  options={schemaNames.map((n) => ({ value: n, label: n }))}
                  placeholder="Select target schema"
                  showSearch
                />
              </Form.Item>
            )}

            {/* MorphTo: multiple targets */}
            {isMorphTo && (
              <Form.Item
                name="targets"
                label={t('association.targetSchemas')}
                rules={[{ required: true, message: t('validation.selectAtLeastOne') }]}
              >
                <Select
                  mode="multiple"
                  options={schemaNames.map((n) => ({ value: n, label: n }))}
                  placeholder={t('association.targetSchemas')}
                />
              </Form.Item>
            )}

            {/* MorphOne, MorphMany, MorphedByMany: morphName */}
            {isMorphInverse && (
              <>
                <Form.Item
                  name="target"
                  label={t('association.targetSchema')}
                  rules={[{ required: true, message: t('validation.required', { field: t('association.targetSchema') }) }]}
                >
                  <Select
                    options={schemaNames.map((n) => ({ value: n, label: n }))}
                    placeholder={t('association.targetSchema')}
                    showSearch
                  />
                </Form.Item>
                <Form.Item
                  name="morphName"
                  label={t('association.morphName')}
                  rules={[{ required: true, message: t('validation.required', { field: t('association.morphName') }) }]}
                >
                  <Input placeholder="e.g., commentable, taggable" />
                </Form.Item>
              </>
            )}

            {/* MorphToMany: single target + morphName */}
            {selectedRelation === 'MorphToMany' && (
              <>
                <Form.Item
                  name="target"
                  label={t('association.targetSchema')}
                  rules={[{ required: true, message: t('validation.required', { field: t('association.targetSchema') }) }]}
                >
                  <Select
                    options={schemaNames.map((n) => ({ value: n, label: n }))}
                    placeholder={t('association.targetSchema')}
                    showSearch
                  />
                </Form.Item>
                <Form.Item name="morphName" label={t('association.morphName')}>
                  <Input placeholder="e.g., taggable" />
                </Form.Item>
              </>
            )}

            <Collapse
              ghost
              items={[
                {
                  key: 'advanced',
                  label: t('association.advancedOptions'),
                  children: (
                    <>
                      <Form.Item name="inversedBy" label={t('association.inversedBy')}>
                        <Input placeholder="Property on target" />
                      </Form.Item>
                      <Form.Item name="mappedBy" label={t('association.mappedBy')}>
                        <Input placeholder="Property on target" />
                      </Form.Item>

                      {/* onDelete/onUpdate only for standard relations */}
                      {isStandardRelation && (
                        <>
                          <Form.Item name="onDelete" label={t('association.onDelete')}>
                            <Select
                              allowClear
                              options={REFERENTIAL_ACTIONS.map((a) => ({ value: a, label: a }))}
                              placeholder="CASCADE"
                            />
                          </Form.Item>
                          <Form.Item name="onUpdate" label={t('association.onUpdate')}>
                            <Select
                              allowClear
                              options={REFERENTIAL_ACTIONS.map((a) => ({ value: a, label: a }))}
                              placeholder="CASCADE"
                            />
                          </Form.Item>
                        </>
                      )}

                      {needsJoinTable && (
                        <>
                          <Form.Item name="joinTable" label={t('association.joinTable')}>
                            <Input placeholder={t('index.autoGenerated')} />
                          </Form.Item>

                          {/* Pivot Fields */}
                          <div style={{ marginBottom: token.margin }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: token.marginXS }}>
                              <Text strong>{t('association.pivotFields', 'Pivot Fields')}</Text>
                              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={onAddPivotField}>
                                {t('common.add')}
                              </Button>
                            </div>
                            {pivotFields.length > 0 ? (
                              <Table
                                dataSource={pivotFields.map((f, i) => ({ ...f, _idx: i, _key: `pivot_${i}_${f.name}` }))}
                                rowKey="_key"
                                pagination={false}
                                size="small"
                                columns={[
                                  {
                                    title: t('common.name'),
                                    dataIndex: 'name',
                                    key: 'name',
                                    render: (val: string) => <Text code>{val}</Text>,
                                  },
                                  {
                                    title: t('common.type'),
                                    dataIndex: 'type',
                                    key: 'type',
                                    width: 100,
                                  },
                                  {
                                    title: t('common.options'),
                                    key: 'options',
                                    width: 100,
                                    render: (_: unknown, record: GuiPivotField) => (
                                      <Space size={4}>
                                        {record.nullable && <Tag>nullable</Tag>}
                                        {record.default && <Tag color="blue">default</Tag>}
                                      </Space>
                                    ),
                                  },
                                  {
                                    title: '',
                                    key: 'actions',
                                    width: 80,
                                    render: (_: unknown, record: GuiPivotField & { _idx: number }) => (
                                      <Space size="small">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => onEditPivotField(record._idx)}
                                        />
                                        <Button
                                          type="text"
                                          size="small"
                                          danger
                                          icon={<DeleteOutlined />}
                                          onClick={() => onRemovePivotField(record._idx)}
                                        />
                                      </Space>
                                    ),
                                  },
                                ]}
                              />
                            ) : (
                              <Text type="secondary" style={{ display: 'block', fontStyle: 'italic' }}>
                                {t('association.noPivotFields', 'No pivot fields. Add extra columns to the pivot table (e.g., order, role, expires_at).')}
                              </Text>
                            )}
                          </div>
                        </>
                      )}

                      <Form.Item name="owning" valuePropName="checked">
                        <Checkbox>{t('association.owning')}</Checkbox>
                      </Form.Item>
                    </>
                  ),
                },
              ]}
            />
          </>
        )}

        <Divider style={{ margin: `${token.marginSM}px 0` }} />

        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Space size="large" wrap>
            <Form.Item name="nullable" valuePropName="checked" noStyle>
              <Checkbox>{t('property.nullable')}</Checkbox>
            </Form.Item>

            <Form.Item name="unique" valuePropName="checked" noStyle>
              <Checkbox>{t('property.unique')}</Checkbox>
            </Form.Item>

            <Form.Item name="primaryKey" valuePropName="checked" noStyle>
              <Checkbox>{t('property.primaryKey')}</Checkbox>
            </Form.Item>
            {isNumericType && (
              <Form.Item name="autoIncrement" valuePropName="checked" noStyle>
                <Checkbox>{t('property.autoIncrement')}</Checkbox>
              </Form.Item>
            )}
          </Space>
        </Form.Item>

        <Form.Item
          name="default"
          label={t('property.defaultValue')}
          style={{ marginTop: token.margin }}
          rules={[
            {
              validator: (_, value) => {
                const property = selectedType === 'Enum' || selectedType === 'EnumRef'
                  ? { enum: getEnumValuesForValidation() }
                  : undefined;
                const typeForValidation = selectedType === 'EnumRef' ? 'Enum' : selectedType;
                const result = validateDefaultValueUI(typeForValidation, value, property);
                if (!result.valid && result.error) {
                  return Promise.reject(new Error(result.error));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          {selectedType === 'Boolean' ? (
            <Select
              allowClear
              placeholder={t('property.defaultPlaceholder')}
              options={[
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
            />
          ) : ['Int', 'BigInt'].includes(selectedType) ? (
            <InputNumber
              style={{ width: '100%' }}
              placeholder={t('property.defaultPlaceholder')}
              precision={0}
            />
          ) : ['Float', 'Decimal'].includes(selectedType) ? (
            <InputNumber
              style={{ width: '100%' }}
              placeholder={t('property.defaultPlaceholder')}
            />
          ) : selectedType === 'Enum' || selectedType === 'EnumRef' ? (
            <Select
              allowClear
              placeholder={t('property.defaultPlaceholder')}
              options={getEnumOptionsForSelect()}
            />
          ) : (
            <Input placeholder={t('property.defaultPlaceholder')} />
          )}
        </Form.Item>

        <Form.Item name="displayName" label={t('schema.displayName')}>
          <Input placeholder={t('schema.displayName')} />
        </Form.Item>

        <Form.Item name="description" label={t('property.description')}>
          <Input.TextArea placeholder={t('property.descriptionPlaceholder')} rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
