import { useMemo, type FunctionComponent } from "react";

import { createTranslator } from "@smart-cloud/wpsuite-core";
import { translations, View } from "@smart-cloud/aws-amplify-ui-react";

import { useSelect } from "@wordpress/data";

import { countries } from "country-data-list";

import {
  Account,
  getStoreSelect,
  type AuthenticatorConfig,
  type CustomTranslations,
} from "@smart-cloud/gatey-core";
import { ThemeOverridesStyle } from "../shared/themeOverrides";
import { type ThemeProps } from "./theme";


export const Attr: FunctionComponent<ThemeProps> = (props: ThemeProps) => {
  const rootClassName = "smartcloud-gatey-account-attribute-theme-root";
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
    themeOverrides,
    previewUsesShadowRoot,
  } = props;

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    () => getStoreSelect(store).getConfig(),
    [],
  );

  const account: Account | undefined | null = useSelect(
    () => getStoreSelect(store).getAccount(),
    [],
  );

  const customTranslations: CustomTranslations | undefined | null = useSelect(
    () => getStoreSelect(store).getCustomTranslations(),
    [],
  );

  const translate = useMemo(() => createTranslator(language || "en", translations, customTranslations), [language, customTranslations]);

  const value = useMemo(() => {
    const attributeName =
      attribute !== "custom" ? attribute : "custom:" + custom;
    if (isPreview) {
      return attributeName;
    } else if (account?.userAttributes) {
      const field =
        decryptedConfig?.formFields &&
        decryptedConfig?.formFields.find(
          (field) => field.name === attributeName,
        );
      let value = account.userAttributes[attributeName];

      if (value) {
        if (field?.type === "country") {
          const country = countries.all.find(
            (country) =>
              country.alpha3?.toLocaleLowerCase() ===
                value?.toLocaleLowerCase() ||
              country.alpha2?.toLocaleLowerCase() ===
                value?.toLocaleLowerCase(),
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
  }, [translate, decryptedConfig, isPreview, account, attribute, custom]);

  const rel =
    "" +
    (link?.nofollow ? "nofollow " : "") +
    (link?.opensInNewTab ? "noopener noreferrer" : "");

  return (
    <>
      <ThemeOverridesStyle
        themeOverrides={themeOverrides}
        isPreview={isPreview}
        previewRootClassName={rootClassName}
        previewUsesShadowRoot={previewUsesShadowRoot}
      />
      {link?.url ? (
        <a
          className={rootClassName}
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
        <View className={rootClassName} as={component}>
          {prefix}
          {value || <>&nbsp;</>}
          {postfix}
        </View>
      )}
    </>
  );
};
