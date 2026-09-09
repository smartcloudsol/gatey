import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const storeSource = await readFile(
  new URL("../src/store.ts", import.meta.url),
  "utf8",
);

test("loads Gatey translations through the shared site-wide loader", () => {
  assert.match(
    storeSource,
    /getCustomTranslations as loadCustomTranslations/,
  );
  assert.match(
    storeSource,
    /loadCustomTranslations\(\{\s*legacyUrl: gatey\.settings\.customTranslationsUrl,?\s*\}\)/,
  );
  assert.doesNotMatch(storeSource, /loadTranslationCatalogs/);
  assert.doesNotMatch(storeSource, /WpSuite\.siteSettings|siteSettings\.lastUpdate/);
});
