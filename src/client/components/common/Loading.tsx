/**
 * Loading spinner component
 */

import { Spin, theme } from 'antd';

interface LoadingProps {
  tip?: string;
}

export function Loading({ tip = 'Loading...' }: LoadingProps): React.ReactElement {
  const { token } = theme.useToken();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: token.paddingXL,
        minHeight: 200,
      }}
    >
      <Spin size="large" tip={tip} />
    </div>
  );
}
