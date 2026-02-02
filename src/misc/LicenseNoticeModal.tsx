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
  const ref = useModalRef(open, true);
  const { t } = useTranslation();

  return (
    <GenericModal
      ref={ref}
      className="min-w-min w-[60vw]"
      onClose={onClose}
    >
      <div>
        <div className="flex justify-between items-start">
          <p className="mr-2">
            {t("license.intro")}
          </p>
          <button
            className="p-1.5 rounded-md bg-gray-100 text-black hover:bg-gray-300"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
        <pre className="m-4 font-mono text-sm">{NOTICE}</pre>
      </div>
    </GenericModal>
  );
};
