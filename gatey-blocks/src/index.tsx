import { TEXT_DOMAIN } from "@smart-cloud/gatey-core";
import { __ } from "@wordpress/i18n";

export type Language =
  | "system"
  | "ar"
  | "en"
  | "zh"
  | "nl"
  | "fr"
  | "de"
  | "he"
  | "hi"
  | "hu"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "nb"
  | "pl"
  | "pt"
  | "ru"
  | "es"
  | "sv"
  | "th"
  | "tr"
  | "ua";

export const languageOptions = [
  { label: __("System (default)", TEXT_DOMAIN), value: "system" },
  { label: __("Arabic", TEXT_DOMAIN), value: "ar" },
  { label: __("Chinese", TEXT_DOMAIN), value: "zh" },
  { label: __("Dutch", TEXT_DOMAIN), value: "nl" },
  { label: __("English", TEXT_DOMAIN), value: "en" },
  { label: __("French", TEXT_DOMAIN), value: "fr" },
  { label: __("German", TEXT_DOMAIN), value: "de" },
  { label: __("Hebrew", TEXT_DOMAIN), value: "he" },
  { label: __("Hindi", TEXT_DOMAIN), value: "hi" },
  { label: __("Hungarian", TEXT_DOMAIN), value: "hu" },
  { label: __("Indonesian", TEXT_DOMAIN), value: "id" },
  { label: __("Italian", TEXT_DOMAIN), value: "it" },
  { label: __("Japanese", TEXT_DOMAIN), value: "ja" },
  { label: __("Korean", TEXT_DOMAIN), value: "ko" },
  { label: __("Norwegian", TEXT_DOMAIN), value: "nb" },
  { label: __("Polish", TEXT_DOMAIN), value: "pl" },
  { label: __("Portuguese", TEXT_DOMAIN), value: "pt" },
  { label: __("Russian", TEXT_DOMAIN), value: "ru" },
  { label: __("Spanish", TEXT_DOMAIN), value: "es" },
  { label: __("Swedish", TEXT_DOMAIN), value: "sv" },
  { label: __("Thai", TEXT_DOMAIN), value: "th" },
  { label: __("Turkish", TEXT_DOMAIN), value: "tr" },
  { label: __("Ukrainian", TEXT_DOMAIN), value: "ua" },
];

export const colorModeOptions = [
  { label: __("Light", TEXT_DOMAIN), value: "light" },
  { label: __("Dark", TEXT_DOMAIN), value: "dark" },
  { label: __("System", TEXT_DOMAIN), value: "system" },
];

export const directionOptions = [
  {
    label: __("Auto (by language)", TEXT_DOMAIN),
    value: "auto",
  },
  { label: __("Left to Right", TEXT_DOMAIN), value: "ltr" },
  { label: __("Right to Left", TEXT_DOMAIN), value: "rtl" },
];

export const formFieldOptions = [
  {
    label: __("Preferred Username", TEXT_DOMAIN),
    value: "preferred_username",
  },
  { label: __("Email", TEXT_DOMAIN), value: "email" },
  { label: __("Phone Number", TEXT_DOMAIN), value: "phone_number" },
  { label: __("Name", TEXT_DOMAIN), value: "name" },
  { label: __("Given Name", TEXT_DOMAIN), value: "given_name" },
  { label: __("Family Name", TEXT_DOMAIN), value: "family_name" },
  { label: __("Middle Name", TEXT_DOMAIN), value: "middle_name" },
  { label: __("Nickname", TEXT_DOMAIN), value: "nickname" },
  { label: __("Gender", TEXT_DOMAIN), value: "gender" },
  { label: __("Birthdate", TEXT_DOMAIN), value: "birthdate" },
  { label: __("Address", TEXT_DOMAIN), value: "address" },
  { label: __("Picture", TEXT_DOMAIN), value: "picture" },
  { label: __("Website", TEXT_DOMAIN), value: "website" },
  { label: __("Zoneinfo", TEXT_DOMAIN), value: "zoneinfo" },
  { label: __("Locale", TEXT_DOMAIN), value: "locale" },
  { label: __("Custom", TEXT_DOMAIN), value: "custom" },
];

declare global {
  const LanguageDetector: {
    create: ({
      signal,
      monitor,
    }?: {
      signal?: AbortController["signal"];
      monitor?: (m: {
        addEventListener: (
          event: string,
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }) => Promise<typeof LanguageDetector>;
    detect: (
      text: string
    ) => Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  };
  const Translator: {
    create: ({
      signal,
      sourceLanguage,
      targetLanguage,
      monitor,
    }: {
      signal?: AbortController["signal"];
      sourceLanguage: string;
      targetLanguage: string;
      monitor?: (m: {
        addEventListener: (
          event: string,
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }) => Promise<typeof Translator>;
    translate: (text: string) => Promise<string>;
  };
  const Rewriter: {
    create: ({
      signal,
      tone,
      length,
      expectedInputLanguages,
      expectedContextLanguages,
      outputLanguage,
      sharedContext,
      monitor,
    }: {
      signal?: AbortController["signal"];
      tone: "more-formal" | "more-casual" | "as-is";
      length: "shorter" | "longer" | "as-is";
      expectedInputLanguages: string[];
      expectedContextLanguages: string[];
      outputLanguage: string;
      sharedContext: string;
      monitor?: (m: {
        addEventListener: (
          event: string,
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }) => Promise<typeof Rewriter>;
    rewrite: (text: string, options?: { context?: string }) => Promise<string>;
  };
  const Writer: {
    create: ({
      signal,
      tone,
      length,
      expectedInputLanguages,
      expectedContextLanguages,
      outputLanguage,
      sharedContext,
      monitor,
    }: {
      signal?: AbortController["signal"];
      tone: "formal" | "casual" | "neutral";
      length: "short" | "medium" | "long";
      expectedInputLanguages: string[];
      expectedContextLanguages: string[];
      outputLanguage: string;
      sharedContext?: string;
      monitor?: (m: {
        addEventListener: (
          event: string,
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }) => Promise<typeof Writer>;
    write: (text: string, options?: { context?: string }) => Promise<string>;
  };
  const Proofreader: {
    create: ({
      expectedInputLanguages,
      monitor,
    }: {
      expectedInputLanguages: string[];
      monitor?: (m: {
        addEventListener: (
          event: string,
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }) => Promise<typeof Proofreader>;
    proofread: (text: string) => Promise<{
      correctedInput: string;
      corrections: Array<{ startIndex: number; endIndex: number }>;
    }>;
  };
}
