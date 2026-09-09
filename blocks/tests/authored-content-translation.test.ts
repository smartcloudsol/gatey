import assert from "node:assert/strict";
import test from "node:test";

import * as cheerio from "cheerio";

import {
  translateAuthoredHtml,
  translateAuthoredText,
  type AuthoredContentTranslator,
} from "../src/authenticator/paid-features/authored-content-translation.ts";

const dictionary: Record<string, string> = {
  "Set Up Two-Factor Authentication": "Kétlépcsős hitelesítés beállítása",
  "Keep this account secure.": "Tartsa biztonságban ezt a fiókot.",
  "Open your authenticator app.": "Nyissa meg a hitelesítő alkalmazását.",
  Select: "Válassza ki",
  "Add Account": "Fiók hozzáadása",
  or: "vagy",
  "Scan QR Code": "QR-kód beolvasása",
  "Privacy Policy": "Adatvédelmi szabályzat",
  "Terms of Use": "Felhasználási feltételek",
};

const translate: AuthoredContentTranslator = (key) => dictionary[key] ?? key;

test("translates meaningful text while preserving surrounding whitespace", () => {
  assert.equal(
    translateAuthoredText(
      "\n\u00a0Set Up Two-Factor Authentication\u00a0\n",
      translate,
    ),
    "\n\u00a0Kétlépcsős hitelesítés beállítása\u00a0\n",
  );
  assert.equal(translateAuthoredText(" \n\t", translate), " \n\t");
});

test("uses normal spaces for NBSP lookup without rewriting an untranslated source", () => {
  const nbspDictionary = (key: string) =>
    key === "Keep this account secure." ? "Maradjon biztonságban." : key;

  assert.equal(
    translateAuthoredText("Keep\u00a0this account secure.", nbspDictionary),
    "Maradjon biztonságban.",
  );
  assert.equal(
    translateAuthoredText("Unknown\u00a0copy", nbspDictionary),
    "Unknown\u00a0copy",
  );
});

test("translates Gutenberg text nodes and leaves structure and attributes intact", () => {
  const source = [
    '<section id="totp" class="panel" data-screen="setupTotp">',
    '<h2>Set Up Two-Factor Authentication</h2>',
    '<p>Keep this account secure.</p>',
    '<ul><li>Open your authenticator app.</li>',
    '<li>Select <strong>Add Account</strong> or <strong>Scan QR Code</strong>.</li></ul>',
    '<a class="dark-link" href="/privacy-policy" onclick="toPrivacy()">Privacy Policy</a>',
    '<button type="button" data-action="continue">Terms of Use</button>',
    "</section>",
  ].join("");

  const translated = translateAuthoredHtml(source, translate);
  const fragment = cheerio.load(translated, null, false);

  assert.equal(fragment("h2").text(), "Kétlépcsős hitelesítés beállítása");
  assert.equal(fragment("p").text(), "Tartsa biztonságban ezt a fiókot.");
  assert.equal(
    fragment("li").eq(1).text(),
    "Válassza ki Fiók hozzáadása vagy QR-kód beolvasása.",
  );
  assert.equal(fragment("a").text(), "Adatvédelmi szabályzat");
  assert.equal(fragment("button").text(), "Felhasználási feltételek");
  assert.equal(fragment("section").attr("id"), "totp");
  assert.equal(fragment("section").attr("class"), "panel");
  assert.equal(fragment("section").attr("data-screen"), "setupTotp");
  assert.equal(fragment("a").attr("href"), "/privacy-policy");
  assert.equal(fragment("a").attr("onclick"), "toPrivacy()");
  assert.equal(fragment("button").attr("type"), "button");
  assert.equal(fragment("button").attr("data-action"), "continue");
});

test("does not translate code, preformatted, script, style or template content", () => {
  const source = [
    "<code>Privacy Policy</code>",
    "<pre>Terms of Use</pre>",
    "<script>Privacy Policy</script>",
    "<style>Terms of Use</style>",
    "<template>Privacy Policy</template>",
    '<svg aria-label="Privacy Policy"><text>Terms of Use</text></svg>',
  ].join("");

  const translated = translateAuthoredHtml(source, translate);
  const fragment = cheerio.load(translated, null, false);

  assert.equal(fragment("code").text(), "Privacy Policy");
  assert.equal(fragment("pre").text(), "Terms of Use");
  assert.equal(fragment("script").text(), "Privacy Policy");
  assert.equal(fragment("style").text(), "Terms of Use");
  assert.equal(fragment("template").text(), "Privacy Policy");
  assert.equal(fragment("svg").attr("aria-label"), "Privacy Policy");
  assert.equal(fragment("svg text").text(), "Terms of Use");
});

test("translates HTML labels without accepting translated markup or URL changes", () => {
  const source =
    'By creating an account, you agree to our <a href="/privacy-policy" target="_blank" class="dark-link">Privacy Policy</a> and <a href="/terms-of-use" target="_blank" class="dark-link">Terms of Use</a>';
  const labelTranslations: Record<string, string> = {
    "By creating an account, you agree to our": "A fiók létrehozásával elfogadja a",
    "Privacy Policy": "Adatvédelmi szabályzatot",
    and: "és a",
    "Terms of Use": "Felhasználási feltételeket",
  };

  const translated = translateAuthoredHtml(
    source,
    (key) => labelTranslations[key] ?? key,
  );
  const fragment = cheerio.load(translated, null, false);

  assert.equal(
    fragment.root().text(),
    "A fiók létrehozásával elfogadja a Adatvédelmi szabályzatot és a Felhasználási feltételeket",
  );
  assert.equal(fragment("a").eq(0).attr("href"), "/privacy-policy");
  assert.equal(fragment("a").eq(1).attr("href"), "/terms-of-use");
  assert.equal(fragment("a").eq(0).attr("target"), "_blank");
  assert.equal(fragment("a").eq(1).attr("class"), "dark-link");
});
