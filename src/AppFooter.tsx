import { useTranslation } from "react-i18next";

export interface AppFooterProps {
  onShowAbout: () => void;
  onShowLicenseNotice: () => void;
}

export const AppFooter = ({
  onShowAbout,
  onShowLicenseNotice,
}: AppFooterProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid justify-center p-1 bg-base-200">
      <div>
        <span>{t("footer.copyright")}</span> -{" "}
        <a className="hover:text-primary hover:cursor-pointer" onClick={onShowAbout}>
          {t("footer.about")}
        </a>{" "}
        -{" "}
        <a className="hover:text-primary hover:cursor-pointer" onClick={onShowLicenseNotice}>
          {t("footer.license")}
        </a>
      </div>
    </div>
  );
};
