import {
  useEffect,
  useState,
  type PropsWithChildren,
  type FunctionComponent,
  type SetStateAction,
} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Amplify, type ResourcesConfig } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";

import { useSelect } from "@wordpress/data";

import { type AuthenticatorConfig, type Store } from "@smart-cloud/gatey-core";
import { type Screen, type Variation } from "./index";
import { Login } from "./login";
import { decryptData } from "./utils";

export type PreviewType = "FREE" | "BASIC" | "PROFESSIONAL";

export interface AppProps extends PropsWithChildren {
  id: string;
  screen?: Screen;
  variation?: Variation;
  signingInMessage?: string;
  signingOutMessage?: string;
  redirectingMessage?: string;
  store: Store;
  isPreview: boolean;
  nonce: string;
  editorRef?: React.RefObject<HTMLDivElement>;
  children?: React.ReactNode;
  previewMode?: PreviewType;
  setPreviewMode?: React.Dispatch<SetStateAction<PreviewType | undefined>>;
  siteSettings?: AuthenticatorConfig | null;
  siteSubscriptionType?: string | null;
}

export const App: FunctionComponent<AppProps> = (props: AppProps) => {
  const {
    isPreview,
    previewMode,
    setPreviewMode,
    siteSettings = null,
    siteSubscriptionType = null,
    store,
  } = props;

  const [decryptedConfig, setDecryptedConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [filteredConfig, setFilteredConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [nextFilteredConfig, setNextFilteredConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [amplifyConfigured, setAmplifyConfigured] = useState(false);

  const salt: number = useSelect(
    (
      select: (store: Store) => {
        getSalt: () => number;
      }
    ) => select(store).getSalt(),
    []
  );

  const config: string | undefined = useSelect(
    (
      select: (store: Store) => {
        getConfig: () => string | undefined;
      }
    ) => select(store).getConfig(),
    []
  );

  const amplifyConfig: ResourcesConfig | undefined = useSelect(
    (
      select: (store: Store) => {
        getAmplifyConfig: () => ResourcesConfig | undefined;
      }
    ) => select(store).getAmplifyConfig(),
    []
  );

  useEffect(() => {
    if (config) {
      decryptData(config, salt).then((result) => {
        setDecryptedConfig(result);
        if (setPreviewMode) {
          setNextFilteredConfig(undefined);
          setPreviewMode(
            decryptedConfig?.subscriptionType === "BASIC"
              ? "BASIC"
              : "PROFESSIONAL"
          );
        }
      });
    } else {
      setDecryptedConfig(null);
      if (setPreviewMode) {
        setNextFilteredConfig(undefined);
        setPreviewMode(
          siteSubscriptionType
            ? siteSubscriptionType === "BASIC"
              ? "BASIC"
              : "PROFESSIONAL"
            : "FREE"
        );
      }
    }
  }, [
    config,
    salt,
    siteSettings,
    setPreviewMode,
    siteSubscriptionType,
    decryptedConfig?.subscriptionType,
  ]);

  useEffect(() => {
    if (decryptedConfig !== undefined) {
      if (isPreview && previewMode) {
        let fc = undefined;
        switch (previewMode) {
          case "FREE":
            fc = null;
            break;
          case "BASIC":
            fc = {
              socialProviders: [],
              signUpAttributes: [],
              formFields: {},
              apiConfigurations: {
                default: { apis: [] },
              },
            };
            break;
          case "PROFESSIONAL":
            fc = siteSettings ?? decryptedConfig;
            break;
        }
        setFilteredConfig(undefined);
        setNextFilteredConfig(fc);
      } else {
        setFilteredConfig(decryptedConfig);
      }
    }
  }, [
    siteSettings,
    siteSubscriptionType,
    decryptedConfig,
    previewMode,
    setPreviewMode,
    isPreview,
  ]);

  useEffect(() => {
    if (nextFilteredConfig !== undefined) {
      setFilteredConfig(nextFilteredConfig);
    }
  }, [nextFilteredConfig]);

  useEffect(() => {
    if (!isPreview && amplifyConfig?.Auth) {
      Amplify.configure(amplifyConfig);
      setAmplifyConfigured(true);
    }
  }, [amplifyConfig, isPreview, store]);

  return (
    filteredConfig !== undefined &&
    (isPreview || amplifyConfigured) && (
      <Authenticator.Provider>
        <Router>
          <Routes>
            <Route
              path="*"
              element={<Login {...props} config={filteredConfig} />}
            />
          </Routes>
        </Router>
      </Authenticator.Provider>
    )
  );
};
