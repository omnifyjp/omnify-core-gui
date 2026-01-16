/**
 * Unsaved Changes Blocker Modal component
 */

import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';

interface UnsavedChangesModalProps {
  open: boolean;
  onProceed: () => void;
  onReset: () => void;
}

export function UnsavedChangesModal({
  open,
  onProceed,
  onReset,
}: UnsavedChangesModalProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('unsaved.title')}
      open={open}
      onOk={onProceed}
      onCancel={onReset}
      okText={t('unsaved.leave')}
      cancelText={t('unsaved.stay')}
      okButtonProps={{ danger: true }}
    >
      <p>{t('unsaved.message')}</p>
    </Modal>
  );
}
