import { normalizeLocale } from "@smart-cloud/wpsuite-core";

export type TranslationDictionary = Record<string, string>;
export type TranslationCatalog = Record<string, TranslationDictionary>;

function normalizeCatalog(catalog?: TranslationCatalog | null): TranslationCatalog {
  const normalized: TranslationCatalog = {};
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return normalized;
  }

  for (const [locale, dictionary] of Object.entries(catalog)) {
    const normalizedLocale = normalizeLocale(locale);
    if (
      !normalizedLocale ||
      !dictionary ||
      typeof dictionary !== "object" ||
      Array.isArray(dictionary)
    ) {
      continue;
    }

    normalized[normalizedLocale] = {
      ...(normalized[normalizedLocale] ?? {}),
      ...Object.fromEntries(
        Object.entries(dictionary).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    };
  }

  return normalized;
}

function localeDictionary(
  catalog: TranslationCatalog,
  locale?: string | null,
): TranslationDictionary {
  const normalized = normalizeLocale(locale);
  if (!normalized) {
    return {};
  }

  const language = normalized.split("-")[0];
  return {
    ...(catalog[language] ?? {}),
    ...(catalog[normalized] ?? {}),
  };
}

function languageFamilyDictionary(
  catalog: TranslationCatalog,
  language: string,
): TranslationDictionary {
  const normalizedLanguage = normalizeLocale(language)?.split("-")[0];
  if (!normalizedLanguage) {
    return {};
  }

  const familyLocales = Object.keys(catalog)
    .filter(
      (locale) => normalizeLocale(locale)?.split("-")[0] === normalizedLanguage,
    )
    .sort((left, right) => {
      if (left === normalizedLanguage) return -1;
      if (right === normalizedLanguage) return 1;
      return left.localeCompare(right);
    });

  return Object.assign(
    {},
    ...familyLocales.map((locale) => catalog[locale] ?? {}),
  ) as TranslationDictionary;
}

/**
 * Materialize the Authenticator's effective catalog for its active locale.
 * Amplify can then keep its scoped provider API while Gatey supplies the same
 * fallback order as the shared WP Suite translation layer.
 */
export function createScopedAuthenticatorTranslations(
  activeLocale: string,
  baseCatalog: TranslationCatalog,
  customCatalog?: TranslationCatalog | null,
  siteDefaultLocale?: string | null,
): TranslationCatalog {
  const active = normalizeLocale(activeLocale) ?? "en";
  const activeLanguage = active.split("-")[0];
  const englishLanguage = normalizeLocale("en")?.split("-")[0] ?? "en";
  const base = normalizeCatalog(baseCatalog);
  const custom = normalizeCatalog(customCatalog);

  const effective: TranslationDictionary = {
    ...languageFamilyDictionary(base, englishLanguage),
    ...languageFamilyDictionary(custom, englishLanguage),
  };

  if (activeLanguage !== englishLanguage) {
    Object.assign(
      effective,
      localeDictionary(base, siteDefaultLocale),
      localeDictionary(custom, siteDefaultLocale),
    );
  }

  Object.assign(
    effective,
    localeDictionary(base, active),
    localeDictionary(custom, active),
  );

  return { [active]: effective };
}
