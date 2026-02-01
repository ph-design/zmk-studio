import { useModalRef } from "./useModalRef";

import NOTICE from "../../NOTICE?raw";
import { GenericModal } from "../GenericModal";
import { useTranslation } from "react-i18next";

export interface LicenseNoticeModalProps {
  open: boolean;
  onClose: () => void;
}

export const LicenseNoticeModal = ({
  open,
  onClose,
}: LicenseNoticeModalProps) => {
  const { t } = useTranslation();
  const ref = useModalRef(open, true);

  return (
    <GenericModal
      ref={ref}
      className="min-w-min w-[60vw] p-6 rounded-2xl bg-base-100 shadow-xl"
      onClose={onClose}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <p className="mr-2 text-base-content/80">
            {t('license.desc')}
          </p>
          <button
            className="p-2 rounded-full hover:bg-base-200 transition-colors"
            onClick={onClose}
          >
            {t('license.close')}
          </button>
        </div>
        <pre className="m-4 font-mono text-xs overflow-auto max-h-[60vh] p-4 bg-base-200 rounded-lg">{NOTICE}</pre>
      </div>
    </GenericModal>
  );
};
