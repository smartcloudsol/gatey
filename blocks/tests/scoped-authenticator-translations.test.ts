import assert from "node:assert/strict";
import test from "node:test";

import { createScopedAuthenticatorTranslations } from "../src/authenticator/scoped-translations.ts";

test("uses active, site-default and English custom/base catalogs in order", () => {
  const scoped = createScopedAuthenticatorTranslations(
    "hu-HU",
    {
      en: {
        activeCustom: "English base",
        activeBase: "English base",
        defaultCustom: "English base",
        englishCustom: "English base",
        englishBase: "English base",
      },
      hu: {
        activeCustom: "Hungarian base",
        activeBase: "Hungarian base",
      },
      de: {
        activeCustom: "German base",
        activeBase: "German base",
        defaultCustom: "German base",
        defaultBase: "German base",
      },
    },
    {
      "en-US": {
        activeCustom: "English custom",
        activeBase: "English custom",
        defaultCustom: "English custom",
        englishCustom: "English custom",
      },
      "de-DE": {
        activeCustom: "German custom",
        activeBase: "German custom",
        defaultCustom: "German custom",
      },
      "hu-HU": {
        activeCustom: "Hungarian custom",
      },
    },
    "de-DE",
  );

  assert.deepEqual(scoped["hu-HU"], {
    activeCustom: "Hungarian custom",
    activeBase: "Hungarian base",
    defaultCustom: "German custom",
    defaultBase: "German base",
    englishCustom: "English custom",
    englishBase: "English base",
  });
});

test("does not make a non-English site default part of active English", () => {
  const scoped = createScopedAuthenticatorTranslations(
    "en-US",
    {
      en: { title: "English base", baseOnly: "English base only" },
    },
    {
      "en-US": { title: "English custom" },
      "fr-FR": {
        title: "Titre français",
        frenchOnly: "Valeur française",
      },
    },
    "fr-FR",
  );

  assert.deepEqual(scoped["en-US"], {
    title: "English custom",
    baseOnly: "English base only",
  });
  assert.equal(scoped["en-US"].frenchOnly, undefined);
});

test("normalizes regional locale keys and does not mutate source catalogs", () => {
  const base = {
    en: { save: "Save" },
    hu: { save: "Mentés", cancel: "Mégse" },
  };
  const custom = {
    en_US: { customOnly: "English custom" },
    hu_HU: { save: "Változtatások mentése" },
  };
  const baseSnapshot = structuredClone(base);
  const customSnapshot = structuredClone(custom);

  const scoped = createScopedAuthenticatorTranslations(
    "hu_HU",
    base,
    custom,
    "en_US",
  );

  assert.deepEqual(scoped["hu-HU"], {
    save: "Változtatások mentése",
    customOnly: "English custom",
    cancel: "Mégse",
  });
  assert.deepEqual(base, baseSnapshot);
  assert.deepEqual(custom, customSnapshot);
});
