/**
 * Shared component for displaying version changes
 */

import { Typography, Tag, Space, theme } from 'antd';
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  EditOutlined,
  FileOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { VersionChange } from '@famgia/omnify-core';

const { Text } = Typography;

interface ChangesListProps {
  changes: readonly VersionChange[];
  compact?: boolean;
}

export function ChangesList({ changes, compact = false }: ChangesListProps): React.ReactElement {
  const { token } = theme.useToken();

  const getChangeIcon = (action: string): React.ReactNode => {
    const iconStyle = { fontSize: compact ? 14 : 16 };
    switch (action) {
      case 'schema_added':
      case 'property_added':
      case 'index_added':
        return <PlusCircleOutlined style={{ ...iconStyle, color: token.colorSuccess }} />;
      case 'schema_removed':
      case 'property_removed':
      case 'index_removed':
        return <MinusCircleOutlined style={{ ...iconStyle, color: token.colorError }} />;
      case 'property_renamed':
        return <SwapOutlined style={{ ...iconStyle, color: token.colorInfo }} />;
      case 'property_modified':
      case 'option_changed':
      case 'schema_modified':
      case 'index_modified':
        return <EditOutlined style={{ ...iconStyle, color: token.colorWarning }} />;
      default:
        return <FileOutlined style={{ ...iconStyle, color: token.colorPrimary }} />;
    }
  };

  const formatAction = (action: string, change: VersionChange): string => {
    // For option_changed, show the specific option name
    if (action === 'option_changed' && change.property) {
      const optionNames: Record<string, string> = {
        timestamps: 'Timestamps',
        softDelete: 'Soft Delete',
        id: 'Auto ID',
        idType: 'ID Type',
        tableName: 'Table Name',
        translations: 'Translations',
        authenticatable: 'Authenticatable',
      };
      return optionNames[change.property] || change.property;
    }
    const actionMap: Record<string, string> = {
      schema_added: 'Added',
      schema_removed: 'Removed',
      schema_modified: 'Modified',
      property_added: 'New Field',
      property_removed: 'Removed Field',
      property_modified: 'Changed Field',
      property_renamed: 'Renamed Field',
      index_added: 'New Index',
      index_removed: 'Removed Index',
      index_modified: 'Index Changed',
      option_changed: 'Option Changed',
      initial: 'Initial',
    };
    return actionMap[action] || action.replace(/_/g, ' ');
  };

  const getTagColor = (action: string): string => {
    if (action.includes('added')) return 'success';
    if (action.includes('removed')) return 'error';
    if (action.includes('renamed')) return 'processing';
    if (action.includes('modified') || action.includes('changed')) return 'warning';
    if (action === 'initial') return 'blue';
    return 'default';
  };

  const formatValue = (value: unknown, context?: string): string => {
    if (value === undefined) return 'disabled';
    if (value === null) return '-';
    if (typeof value === 'boolean') return value ? 'enabled' : 'disabled';
    if (Array.isArray(value)) {
      // Handle arrays (like indexes)
      return value.map((item) => formatValue(item)).join('; ');
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Format property definition nicely
      if (obj.type) {
        const parts = [obj.type as string];
        if (obj.length) parts.push(`(${obj.length})`);
        if (obj.precision && obj.scale) parts.push(`(${obj.precision},${obj.scale})`);
        if (obj.nullable) parts.push('nullable');
        if (obj.unique) parts.push('unique');
        if (obj.displayName) parts.push(`"${obj.displayName}"`);
        if (obj.relation) parts.push(`→ ${obj.target || 'relation'}`);
        return parts.join(' ');
      }
      // Format index objects
      if (obj.columns && Array.isArray(obj.columns)) {
        const cols = (obj.columns as string[]).join(', ');
        const parts = [`(${cols})`];
        if (obj.unique) parts.push('UNIQUE');
        if (obj.name) parts.push(`"${obj.name}"`);
        return parts.join(' ');
      }
      // Format simple key-value pairs
      return Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'yes' : 'no') : formatValue(v)}`)
        .join(', ');
    }
    return String(value);
  };

  if (changes.length === 0) {
    return <Text type="secondary">No changes</Text>;
  }

  return (
    <div>
      {changes.map((change, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: compact ? '8px 0' : '12px',
            marginBottom: compact ? 0 : 8,
            background: compact ? 'transparent' : token.colorBgContainer,
            borderRadius: compact ? 0 : token.borderRadius,
            border: compact ? 'none' : `1px solid ${token.colorBorderSecondary}`,
            borderBottom: compact ? `1px solid ${token.colorBorderSecondary}` : undefined,
          }}
        >
          {getChangeIcon(change.action)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: change.from !== undefined || change.to !== undefined ? 4 : 0 }}>
              <Tag color={getTagColor(change.action)} style={{ marginRight: 8 }}>
                {formatAction(change.action, change)}
              </Tag>
              {change.schema && (
                <Text strong style={{ fontSize: compact ? 13 : 14 }}>{change.schema}</Text>
              )}
              {change.property && change.action !== 'option_changed' && (
                <Text code style={{ marginLeft: 4, fontSize: compact ? 12 : 13 }}>.{change.property}</Text>
              )}
            </div>

            {(change.from !== undefined || change.to !== undefined) && (
              <div style={{
                fontSize: compact ? 12 : 13,
                padding: compact ? '4px 0' : '8px 12px',
                background: compact ? 'transparent' : token.colorBgLayout,
                borderRadius: token.borderRadius,
                marginTop: 4,
              }}>
                {change.action === 'property_renamed' ? (
                  <Space>
                    <Text type="secondary">{String(change.from)}</Text>
                    <SwapOutlined />
                    <Text strong>{String(change.to)}</Text>
                  </Space>
                ) : (
                  <>
                    {change.from !== undefined && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <MinusCircleOutlined style={{ color: token.colorError, marginTop: 3, flexShrink: 0 }} />
                        <Text delete type="secondary" style={{ wordBreak: 'break-word' }}>
                          {formatValue(change.from)}
                        </Text>
                      </div>
                    )}
                    {change.to !== undefined && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: change.from !== undefined ? 4 : 0 }}>
                        <PlusCircleOutlined style={{ color: token.colorSuccess, marginTop: 3, flexShrink: 0 }} />
                        <Text style={{ color: token.colorSuccess, wordBreak: 'break-word' }}>
                          {formatValue(change.to)}
                        </Text>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Count changes by type
 */
export function countChangesByType(changes: readonly VersionChange[]): {
  added: number;
  removed: number;
  modified: number;
} {
  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const change of changes) {
    if (change.action.includes('added')) added++;
    else if (change.action.includes('removed')) removed++;
    else modified++;
  }

  return { added, removed, modified };
}
