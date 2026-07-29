import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBRCommon from "./locales/pt-BR/common.json";
import ptBRLanding from "./locales/pt-BR/landing.json";
import ptBRAuth from "./locales/pt-BR/auth.json";
import ptBRLayout from "./locales/pt-BR/layout.json";
import ptBRDashboard from "./locales/pt-BR/dashboard.json";
import ptBRResumes from "./locales/pt-BR/resumes.json";
import ptBRAnalysis from "./locales/pt-BR/analysis.json";
import ptBRInsights from "./locales/pt-BR/insights.json";
import ptBRSettings from "./locales/pt-BR/settings.json";

import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import enAuth from "./locales/en/auth.json";
import enLayout from "./locales/en/layout.json";
import enDashboard from "./locales/en/dashboard.json";
import enResumes from "./locales/en/resumes.json";
import enAnalysis from "./locales/en/analysis.json";
import enInsights from "./locales/en/insights.json";
import enSettings from "./locales/en/settings.json";

export const SUPPORTED_LANGUAGES = ["pt-BR", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = [
  "common",
  "landing",
  "auth",
  "layout",
  "dashboard",
  "resumes",
  "analysis",
  "insights",
  "settings",
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": {
        common: ptBRCommon,
        landing: ptBRLanding,
        auth: ptBRAuth,
        layout: ptBRLayout,
        dashboard: ptBRDashboard,
        resumes: ptBRResumes,
        analysis: ptBRAnalysis,
        insights: ptBRInsights,
        settings: ptBRSettings,
      },
      en: {
        common: enCommon,
        landing: enLanding,
        auth: enAuth,
        layout: enLayout,
        dashboard: enDashboard,
        resumes: enResumes,
        analysis: enAnalysis,
        insights: enInsights,
        settings: enSettings,
      },
    },
    ns: NAMESPACES,
    defaultNS: "common",
    fallbackLng: "pt-BR",
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
