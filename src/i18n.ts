import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./locales/en.json";
import zhTranslations from "./locales/zh.json";

// 获取浏览器语言或从 localStorage 中读取用户选择的语言
const getInitialLanguage = () => {
  const saved = localStorage.getItem("language");
  if (saved) {
    return saved;
  }
  
  const browserLang = navigator.language.startsWith("zh") ? "zh" : "en";
  return browserLang;
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    zh: { translation: zhTranslations },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// 监听语言变化，保存到 localStorage
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;
