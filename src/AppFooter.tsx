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
    <div className="grid justify-center p-2 bg-base-200 text-sm text-base-content/70">
      <div>
        <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span> -{" "}
        <a className="hover:text-primary hover:cursor-pointer transition-colors" onClick={onShowAbout}>
          {t('footer.about')}
        </a>{" "}
        -{" "}
        <a className="hover:text-primary hover:cursor-pointer transition-colors" onClick={onShowLicenseNotice}>
          {t('footer.license')}
        </a>
      </div>
    </div>
  );
};
