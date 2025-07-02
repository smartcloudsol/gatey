import { useEffect, useState, type FunctionComponent } from "react";

import { I18n } from "aws-amplify/utils";
import { translations, Text } from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import { countries } from "country-data-list";

import {
  Account,
  type AuthenticatorConfig,
  type CustomTranslations,
  type Store,
} from "@smart-cloud/gatey-core";
import { type ThemeProps } from "./theme";

I18n.putVocabularies(translations);

export const Attr: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const { isPreview, store, component, attribute, custom, language } = props;

  const [value, setValue] = useState<string>();

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    (
      select: (store: Store) => {
        getConfig: () => AuthenticatorConfig | null;
      }
    ) => select(store).getConfig(),
    []
  );

  const account: Account | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getAccount: () => Account | undefined | null;
      }
    ) => select(store).getAccount(),
    []
  );

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    (
      select: (store: Store) => {
        getCustomTranslations: () => CustomTranslations | undefined | null;
      }
    ) => select(store).getCustomTranslations(),
    []
  );

  useEffect(() => {
    I18n.putVocabularies(customTranslations || {});
    if (!language || language === "system") {
      I18n.setLanguage("");
    } else {
      I18n.setLanguage(language);
    }
  }, [language, customTranslations]);

  useEffect(() => {
    const attributeName =
      attribute !== "custom" ? attribute : "custom:" + custom;
    if (isPreview) {
      setValue(attributeName);
    } else if (account?.userAttributes) {
      const field =
        (decryptedConfig?.formFields?.signUp &&
          decryptedConfig?.formFields?.signUp[attributeName]) ??
        (decryptedConfig?.formFields?.editAccount &&
          decryptedConfig?.formFields?.editAccount[attributeName]);

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
            value = Gatey.cognito.translate(country.name);
          }
        } else if (field?.type === "select" || field?.type === "radio") {
          const options = field?.values ?? [];
          const option = options.find((option) => option.value === value);
          if (option) {
            value = Gatey.cognito.translate(option.label);
          }
        }
      }
      setValue(value ?? "");
    } else {
      setValue("");
    }
  }, [decryptedConfig, isPreview, account, attribute, custom, language]);

  return (
    <Text as={component} color="inherit" display="inherit">
      {value || <>&nbsp;</>}
    </Text>
  );
};
