/**
 * Relationships visualization page
 */

import { Card, Typography, Empty, theme } from 'antd';
import { useSchemaStore } from '../stores/schemaStore.js';
import type { GuiPropertyDefinition } from '../../shared/types.js';

const { Title, Text } = Typography;

export function RelationshipsPage(): React.ReactElement {
  const { schemas } = useSchemaStore();
  const { token } = theme.useToken();

  const schemaList = Object.values(schemas);

  // Find all relationships
  const relationships: Array<{
    from: string;
    to: string;
    type: string;
    property: string;
  }> = [];

  for (const schema of schemaList) {
    if (schema.properties) {
      for (const [propName, prop] of Object.entries(schema.properties)) {
        const typedProp = prop as GuiPropertyDefinition;
        if (typedProp.type === 'Association' && typedProp.target) {
          relationships.push({
            from: schema.name,
            to: typedProp.target,
            type: typedProp.relation ?? 'Unknown',
            property: propName,
          });
        }
      }
    }
  }

  return (
    <div>
      <Title level={3}>Relationships</Title>

      {relationships.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No relationships defined yet"
        />
      ) : (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: token.margin }}>
            {relationships.map((rel, index) => (
              <div
                key={index}
                style={{
                  padding: token.padding,
                  background: token.colorBgLayout,
                  borderRadius: token.borderRadius,
                  display: 'flex',
                  alignItems: 'center',
                  gap: token.margin,
                }}
              >
                <Text strong>{rel.from}</Text>
                <Text type="secondary">→</Text>
                <Text code>{rel.type}</Text>
                <Text type="secondary">→</Text>
                <Text strong>{rel.to}</Text>
                <Text type="secondary">(via {rel.property})</Text>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ marginTop: token.margin }}>
        <Text type="secondary">
          Relationship visualization diagram coming soon. Currently showing a list of all
          defined relationships between schemas.
        </Text>
      </Card>
    </div>
  );
}
