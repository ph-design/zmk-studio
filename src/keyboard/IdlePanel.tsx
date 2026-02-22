import { useTranslation } from "react-i18next";
import { Keyboard } from "lucide-react";

export default function IdlePanel() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full select-none">
      <Keyboard className="w-6 h-6 text-base-content/25" />
      <p className="text-sm text-base-content/40">{t("idle.hint")}</p>
    </div>
  );
}
