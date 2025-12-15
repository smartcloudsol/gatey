import { useEffect, useMemo, type FunctionComponent } from "react";

import { translate } from "@aws-amplify/ui";
import { translations, View } from "@aws-amplify/ui-react";
import { I18n } from "aws-amplify/utils";

import { useSelect } from "@wordpress/data";

import { countries } from "country-data-list";

import {
  Account,
  getStoreSelect,
  type AuthenticatorConfig,
  type CustomTranslations,
} from "@smart-cloud/gatey-core";
import { type ThemeProps } from "./theme";

I18n.putVocabularies(translations);

export const Attr: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const {
    isPreview,
    store,
    component,
    attribute,
    custom,
    language,
    link,
    prefix,
    postfix,
  } = props;

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    () => getStoreSelect(store).getConfig(),
    []
  );

  const account: Account | undefined | null = useSelect(
    () => getStoreSelect(store).getAccount(),
    []
  );

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    []
  );

  const value = useMemo(() => {
    const attributeName =
      attribute !== "custom" ? attribute : "custom:" + custom;
    if (isPreview) {
      return attributeName;
    } else if (account?.userAttributes) {
      const field =
        decryptedConfig?.formFields &&
        decryptedConfig?.formFields.find(
          (field) => field.name === attributeName
        );
      let value = account.userAttributes[attributeName];

      if (value) {
        if (field?.type === "country") {
          const country = countries.all.find(
            (country) =>
              country.alpha3?.toLocaleLowerCase() ===
                value?.toLocaleLowerCase() ||
              country.alpha2?.toLocaleLowerCase() === value?.toLocaleLowerCase()
          );
          if (country) {
            value = translate(country.name);
          }
        } else if (field?.type === "select" || field?.type === "radio") {
          const options = field?.values ?? [];
          const option = options.find((option) => option.value === value);
          if (option) {
            value = translate(option.label);
          }
        }
      }
      return value ?? "";
    } else {
      return "";
    }
  }, [decryptedConfig, isPreview, account, attribute, custom]);

  const rel =
    "" +
    (link?.nofollow ? "nofollow " : "") +
    (link?.opensInNewTab ? "noopener noreferrer" : "");

  useEffect(() => {
    I18n.putVocabularies(customTranslations || {});
    if (!language || language === "system") {
      I18n.setLanguage("");
    } else {
      I18n.setLanguage(language);
    }
  }, [language, customTranslations]);

  return link?.url ? (
    <a
      href={link.url}
      target={link.opensInNewTab ? "_blank" : undefined}
      rel={rel}
      onClick={(e) => {
        if (isPreview) {
          e.preventDefault();
        }
      }}
    >
      <View as={component}>
        {prefix}
        {value || <>&nbsp;</>}
        {postfix}
      </View>
    </a>
  ) : (
    <View as={component}>
      {prefix}
      {value || <>&nbsp;</>}
      {postfix}
    </View>
  );
};
