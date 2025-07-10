import { lazy } from "react";
import { produce } from "immer";
import {
  CognitoIdentityProviderClient,
  ListGroupsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DEFAULT_THEME,
  ActionIcon,
  Card,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Fieldset,
  Group,
  HoverCard,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Table,
  Tabs,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useQuery } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import { Hub } from "aws-amplify/utils";
import { fetchAuthSession } from "@aws-amplify/auth";
import { type SignUpAttribute } from "@aws-amplify/ui";
import { Authenticator } from "@aws-amplify/ui-react";
import apiFetch from "@wordpress/api-fetch";
import {
  loadAuthSession,
  TEXT_DOMAIN,
  type AuthenticatorConfig,
  type RoleMapping,
  type Settings,
  type Store,
} from "@smart-cloud/gatey-core";
import {
  IconApi,
  IconCheck,
  IconCircleNumber2,
  IconExclamationCircle,
  /*IconForms,*/
  IconInfoCircle,
  IconLogin,
  IconPlus,
  IconSettings,
  IconAlertCircle,
  IconStar,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";

import { __experimentalHeading as Heading } from "@wordpress/components";
import { dispatch, useSelect } from "@wordpress/data";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useState, useMemo } from "react";
import { signUpAttributes } from "./index";
import DocSidebar from "./DocSidebar";
import { LicenseHandler } from "./license-handler";
import { OnboardingBanner } from "./onboarding";
import { NoRegistrationRequiredBanner } from "./noregistration";

import "jquery";

import classes from "./main.module.css";

export interface ApiSettingsEditorProps {
  amplifyConfigured: boolean;
  config: AuthenticatorConfig;
  accountId: string;
  siteId: string;
  siteKey: string | undefined;
  onSave: (config: AuthenticatorConfig) => void;
  InfoLabelComponent: (props: {
    text: string;
    scrollToId: string;
  }) => JSX.Element;
}

export interface FormFieldEditorProps {
  amplifyConfigured: boolean;
  config: AuthenticatorConfig;
  accountId: string;
  siteId: string;
  siteKey: string | undefined;
  onSave: (config: AuthenticatorConfig) => void;
  InfoLabelComponent: (props: {
    text: string;
    scrollToId: string;
  }) => JSX.Element;
}

const ApiSettingsEditor = lazy(
  () =>
    import(
      process.env.GATEY_PREMIUM
        ? "./paid-features/ApiSettingsEditor"
        : "./free-features/ApiSettingsEditor"
    )
);
const FormFieldEditor = lazy(
  () =>
    import(
      process.env.GATEY_PREMIUM
        ? "./paid-features/FormFieldEditor"
        : "./free-features/FormFieldEditor"
    )
);

const SettingsTitle = ({ settings }: { settings: Settings }) => {
  const isMobile = useMediaQuery(
    `(max-width: ${DEFAULT_THEME.breakpoints.sm})`
  );
  return (
    <Card p="sm" withBorder mt="md" maw={1280}>
      <Group
        align="flex-start"
        style={{
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Heading
          level={1}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#218BE6",
          }}
        >
          {__(
            isMobile ? "Gatey" : "Gatey - Login & SSO with Amazon Cognito",
            TEXT_DOMAIN
          )}
        </Heading>
        <Text>
          This interface allows you to configure how your WordPress installation
          connects to Amazon Cognito.
        </Text>
        <Text>
          You can set up your <strong>user pool</strong>, define supported{" "}
          <strong>login mechanisms</strong>, customize{" "}
          <strong>sign-in and redirect behavior</strong>, and choose whether to
          replace
          <HoverCard>
            <HoverCard.Target>
              <ActionIcon variant="subtle" size="xs">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </HoverCard.Target>
            <HoverCard.Dropdown maw={300} style={{ zIndex: 10000 }}>
              <Text size="sm">
                Replacing the default login is optional — for example, if your
                WordPress instance is used only for backend content editing and
                the public site is statically generated, you can still fully
                leverage Gatey for your frontend.
              </Text>
            </HoverCard.Dropdown>
          </HoverCard>{" "}
          the default WordPress login page with a Cognito-based flow.
        </Text>
        <NoRegistrationRequiredBanner />
        <OnboardingBanner settings={settings} />
      </Group>
    </Card>
  );
};

interface WpPage {
  slug: string;
  title: { rendered: string };
}

interface NavigationOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

interface Page {
  path: string;
  title: string;
}

interface MainProps {
  nonce: string;
  settings: Settings;
  store: Store;
}

const production = process.env?.NODE_ENV === "production";

const apiUrl =
  !production || window.location.host === "dev.wpsuite.io"
    ? "https://api.wpsuite.io/dev"
    : "https://api.wpsuite.io";

const configUrl =
  !production || window.location.host === "dev.wpsuite.io"
    ? "https://wpsuite.io/static/config/dev.json"
    : "https://wpsuite.io/static/config/prod.json";

const Main = (props: MainProps) => {
  const { store, nonce, settings } = props;

  const [currentConfig, setCurrentConfig] = useState<"default" | "secondary">(
    "default"
  );
  const [cognitoGroups, setCognitoGroups] = useState<string[]>([]);
  const [cognitoGroupsLoaded, setCognitoGroupsLoaded] =
    useState<boolean>(false);
  const [navigationOptions, setNavigationOptions] =
    useState<NavigationOption[]>();
  const [wpRoles, setWpRoles] = useState<string[]>([]);
  const [wpRolesLoaded, setWpRolesLoaded] = useState<boolean>(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [scrollToId, setScrollToId] = useState<string>("");
  const [ownedAccountId, setOwnedAccountId] = useState<string>();
  const [accountId, setAccountId] = useState<string | undefined>(
    Gatey.siteSettings.accountId
  );
  const [siteId, setSiteId] = useState<string | undefined>(
    Gatey.siteSettings.siteId
  );
  const [siteKey, setSiteKey] = useState<string | undefined>(
    Gatey.siteSettings.siteKey
  );
  const [opened, { open, close }] = useDisclosure(false);

  const [settingsFormData, setSettingsFormData] = useState<Settings>({
    userPoolConfigurations: JSON.parse(
      JSON.stringify(settings.userPoolConfigurations || {})
    ),
    mappings: settings.mappings || [],
    loginMechanisms: settings.loginMechanisms || [],
    integrateWpLogin: settings.integrateWpLogin || false,
    cookieExpiration: settings.cookieExpiration,
    signInPage: settings.signInPage,
    redirectSignIn: settings.redirectSignIn,
    redirectSignOut: settings.redirectSignOut,
    reCaptchaPublicKey: settings.reCaptchaPublicKey,
    customTranslationsUrl: settings.customTranslationsUrl,
    signUpAttributes: settings.signUpAttributes || [],
    useRecaptchaEnterprise: settings.useRecaptchaEnterprise || false,
    useRecaptchaNet: settings.useRecaptchaNet || false,
  });

  const [resolvedConfig, setResolvedConfig] = useState<
    AuthenticatorConfig | null | undefined
  >(undefined);

  const [formConfig, setFormConfig] = useState<AuthenticatorConfig>();

  const [amplifyConfigured, setAmplifyConfigured] = useState<
    boolean | undefined
  >();

  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<
    | "user-pools"
    | "general"
    | "wordpress-login"
    | "api-settings"
    | "form-fields"
  >("general");

  // Add media query for responsive design
  const isMobile = useMediaQuery(
    `(max-width: ${DEFAULT_THEME.breakpoints.sm})`
  );

  const decryptedConfig: AuthenticatorConfig | null = useSelect(
    () => wp.data.select(store)?.getConfig(),
    []
  );

  const { data: configuration, error: configurationError } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const response = await fetch(configUrl).catch((err) => {
        return {
          ok: true,
          statusText: err.message,
          json: async () => ({
            config: "prod",
            baseUrl: "https://wpsuite.io",
            userPoolId: "us-east-1_G0wEwK9tt",
            identityPoolId: "us-east-1:11e55c9a-b768-48a2-8a0c-c51f1e99c129",
            appClientPlugin: "5e6fs3pk1k1ju7cgpnp7o7si8u",
            awsRegion: "us-east-1",
            pricingTable: "prctbl_1QA6TQFjw5MDUzy6c3fBSPGL",
            stripePublicKey:
              "pk_live_51OVeJwFjw5MDUzy6pwTbsMjcBZjZioihzLAtxQsF91u4lYJC4mtqrJddSskhz6OPbWS0tr8XL2G1AwJaXEpv9Rgn008dAz5TEr",
            permissions: {
              owner: [
                "transfer-account",
                "manage-account",
                "manage-sites",
                "manage-subscriptions",
                "manage-billing",
              ],
              admin: [
                "manage-account",
                "manage-sites",
                "manage-subscriptions",
                "manage-billing",
              ],
              accountant: ["manage-billing"],
            },
          }),
        };
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });

  const clearCache = useCallback(
    (subscriber: boolean) => {
      if (accountId && siteId && siteKey) {
        fetch(Gatey.restUrl + "/update-site-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify({
            accountId,
            siteId,
            siteKey,
            lastUpdate: new Date().getTime(),
            subscriber,
          }),
          credentials: "same-origin",
        });
      }
    },
    [accountId, nonce, siteId, siteKey]
  );

  const checkAccount = useCallback(async () => {
    try {
      const authSession = await fetchAuthSession();
      const scopes =
        authSession.tokens?.accessToken.payload["scope"]?.split(" ") ?? [];
      setOwnedAccountId(undefined);
      if (
        accountId &&
        !scopes.includes("sc.account.owner." + accountId) &&
        !scopes.includes("sc.account.admin." + accountId)
      ) {
        console.error(
          "You do not have permission to access this resource. Please contact site owner."
        );
        const accId = scopes
          .find(
            (scope) =>
              scope.startsWith("sc.account.owner.") ||
              scope.startsWith("sc.account.admin.")
          )
          ?.split(".")[3];

        if (accId) {
          setOwnedAccountId(accId);
        }
      }
    } catch (err) {
      console.error(err);
      setOwnedAccountId(undefined);
    }
  }, [accountId]);
  /*
  const handleConfigChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let obj: FormDataProperty =
        settingsFormData.userPoolConfigurations as unknown as FormDataProperty;
      const parts: string[] = e.target.name.split(".");
      while (parts.length > 1) {
        if (!Object.prototype.hasOwnProperty.call(obj, parts[0])) {
          obj[parts[0]] = {};
        }
        const part = parts.shift();
        if (part) {
          obj = obj[part as keyof typeof obj] as FormDataProperty;
        }
      }
      //obj[parts[0]] = e.target.value;
      obj[parts[0]] =
        parts[0] === "scopes"
          ? (e.target.value as string).split(",").map((s) => s.trim())
          : (e.target.value as unknown as FormDataProperty);
      setSettingsFormData(Object.assign({}, settingsFormData));
    },
    [settingsFormData]
  );
*/
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettingsFormData((prev) =>
      produce(prev, (draft: Settings) => {
        const parts = name.split(".");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ref = draft.userPoolConfigurations as unknown as any;
        while (parts.length > 1) ref = ref[parts.shift()!];
        ref[parts[0]] =
          parts[0] === "scopes" ? value.split(",").map((s) => s.trim()) : value;
      })
    );
  };

  const handleMappingChange = useCallback(
    (index: number, field: keyof RoleMapping, value: string) => {
      const updatedMappings = settingsFormData.mappings.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      );
      setSettingsFormData({ ...settingsFormData, mappings: updatedMappings });
    },
    [settingsFormData]
  );

  const handleAddMapping = useCallback(() => {
    setSettingsFormData({
      ...settingsFormData,
      mappings: [
        ...settingsFormData.mappings,
        { cognitoGroup: "", wordpressRole: "" },
      ],
    });
  }, [settingsFormData]);

  const handleDeleteMapping = useCallback(
    (index: number) => {
      const updatedMappings = settingsFormData.mappings.filter(
        (_, i) => i !== index
      );
      setSettingsFormData({ ...settingsFormData, mappings: updatedMappings });
    },
    [settingsFormData]
  );

  const handleIntegrationChange = useCallback(
    (value: boolean) => {
      setSettingsFormData({
        ...settingsFormData,
        integrateWpLogin: value,
      });
    },
    [settingsFormData]
  );

  const handleUpdateSettings = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingSettings(true);
      try {
        const response = await fetch(Gatey.restUrl + "/update-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": nonce,
          },
          body: JSON.stringify(settingsFormData),
          credentials: "same-origin",
        });
        if (response.ok) {
          let message = __("Settings saved successfully.", TEXT_DOMAIN);
          const target = e.target as typeof e.target & {
            name: string;
          };
          switch (target.name) {
            case "user-pools":
              message = __(
                "User pool settings saved successfully.",
                TEXT_DOMAIN
              );
              break;
            case "general":
              message = __("General settings saved successfully.", TEXT_DOMAIN);
              break;
            case "wordpress-login":
              message = __(
                "WordPress login settings saved successfully.",
                TEXT_DOMAIN
              );
              break;
            default:
              break;
          }
          notifications.show({
            title: __("Settings saved", TEXT_DOMAIN),
            message: message,
            color: "green",
            icon: <IconInfoCircle />,
            className: classes["notification"],
          });
        } else {
          const err = await response.json();
          console.error("Failed to submit data", err);
          notifications.show({
            title: __("Error occured", TEXT_DOMAIN),
            message: (err as Error).message,
            color: "red",
            icon: <IconAlertCircle />,
            className: classes["notification"],
          });
        }
      } catch (error) {
        notifications.show({
          title: __("Error occured", TEXT_DOMAIN),
          message: (error as Error).message,
          color: "red",
          icon: <IconAlertCircle />,
          className: classes["notification"],
        });
      } finally {
        setSavingSettings(false);
      }
    },
    [settingsFormData, nonce]
  );

  const InfoLabelComponent = useCallback(
    ({ text, scrollToId }: { text: string; scrollToId: string }) => (
      <Group align="center" gap="0.25rem">
        {text}
        <ActionIcon
          component="label"
          variant="subtle"
          size="xs"
          onClick={() => {
            setScrollToId(scrollToId);
            open();
          }}
        >
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Group>
    ),
    [open]
  );

  const handleConfigSave = useCallback(
    (config: AuthenticatorConfig) => {
      setFormConfig({
        ...config,
        subscriptionType: formConfig?.subscriptionType,
        secondaryDomain: formConfig?.secondaryDomain,
      });
      clearCache(!!formConfig?.subscriptionType);
    },
    [clearCache, formConfig]
  );

  const shouldLoadGroups =
    activePage === "wordpress-login" &&
    settingsFormData.integrateWpLogin &&
    !cognitoGroupsLoaded;

  useEffect(() => {
    if (shouldLoadGroups) {
      loadAuthSession()
        .then((authSession) => {
          if (authSession?.credentials) {
            const client = new CognitoIdentityProviderClient({
              region:
                Gatey.settings.userPoolConfigurations.default.API?.GraphQL
                  ?.region,
              credentials: { ...authSession.credentials },
            });
            client
              .send(
                new ListGroupsCommand({
                  UserPoolId:
                    Gatey.settings.userPoolConfigurations.default.Auth?.Cognito
                      ?.userPoolId,
                })
              )
              .then((response) =>
                setCognitoGroups(
                  response.Groups?.map((group) => group.GroupName) as string[]
                )
              )
              .catch((error) => console.error(error))
              .finally(() => setCognitoGroupsLoaded(true));
          }
        })
        .catch((error) => {
          console.error(error);
          dispatch(store).clearAccount();
        });
    }
  }, [shouldLoadGroups, store]);

  useEffect(() => {
    apiFetch<WpPage[]>({
      path: "/wp/v2/pages?status=publish&per_page=100&context=embed",
    })
      .then((pages) => {
        setPages(
          pages.map((p: { slug: string; title: { rendered: string } }) => ({
            path: "/" + p.slug,
            title: p.title.rendered,
          })) as Page[]
        );
      })
      .catch((error) => console.error("Error loading form:", error));
  }, []);

  const pageOptions = useMemo(
    () => pages.map((p) => ({ label: p.title, value: p.path })),
    [pages]
  );

  useEffect(() => {
    if (nonce) {
      if (settingsFormData.integrateWpLogin && !wpRolesLoaded) {
        fetch(Gatey.restUrl + "/get-roles", {
          method: "GET",
          headers: {
            "X-WP-Nonce": nonce,
          },
          credentials: "same-origin",
        })
          .then((response) => response.json())
          .then((response) => {
            setWpRoles(response as string[]);
            setWpRolesLoaded(true);
          })
          .catch((error) => console.error("Error loading form:", error));
      }
    }
  }, [settingsFormData.integrateWpLogin, nonce, wpRolesLoaded]);

  useEffect(() => {
    if (!amplifyConfigured) {
      if (
        configuration?.userPoolId &&
        configuration?.appClientPlugin &&
        configuration?.identityPoolId
      ) {
        const rc = {
          Auth: {
            Cognito: {
              userPoolId: configuration.userPoolId,
              userPoolClientId: configuration.appClientPlugin,
              identityPoolId: configuration.identityPoolId,
            },
          },
          API: {
            REST: {
              backend: {
                endpoint: apiUrl,
              },
              backendWithIam: {
                endpoint: apiUrl,
              },
            },
          },
        };
        const los: Record<string, unknown> = {
          API: {
            REST: {
              headers: async (options: { apiName: string }) => {
                if (options.apiName === "backend") {
                  try {
                    const authSession = await fetchAuthSession();
                    if (authSession?.tokens?.accessToken) {
                      return {
                        Authorization: `Bearer ${authSession.tokens.accessToken}`,
                      };
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }
                return {};
              },
            },
          },
        };
        Amplify.configure(rc, los);
        checkAccount();
        setAmplifyConfigured(true);
      } else if (configurationError) {
        console.error("Error loading configuration:", configurationError);
        setAmplifyConfigured(false);
      }
    }
  }, [
    configuration,
    props,
    amplifyConfigured,
    checkAccount,
    configurationError,
  ]);

  useEffect(() => {
    const stopCb = Hub.listen("auth", (data) => {
      const { payload } = data;
      if (payload.event === "signedIn" || payload.event === "signedOut") {
        checkAccount();
      }
    });
    return () => {
      stopCb();
    };
  }, [checkAccount]);

  // Navigation options for both NavLink and Select
  useEffect(() => {
    const paidSettingsDisabled =
      decryptedConfig && accountId && siteId && siteKey
        ? !decryptedConfig?.subscriptionType
        : !resolvedConfig?.subscriptionType;
    setNavigationOptions([
      {
        value: "general",
        label: "General",
        icon: <IconSettings size={16} stroke={1.5} />,
      },
      {
        value: "user-pools",
        label: "User Pools",
        icon: <IconUsersGroup size={16} stroke={1.5} />,
      },
      {
        value: "wordpress-login",
        label: "WordPress Login",
        icon: <IconLogin size={16} stroke={1.5} />,
      },
      /*
      {
        value: "form-fields",
        label: "Form Fields",
        icon: <IconForms size={16} stroke={1.5} />,
        badge: (
          <Badge variant="light" color="blue" ml="4px" miw={35}>
            BASIC
          </Badge>
        ),
        disabled: paidSettingsDisabled,
      },
      */
      {
        value: "api-settings",
        label: "API Settings",
        icon: <IconApi size={16} stroke={1.5} />,
        badge: (
          <Badge variant="light" color="red" ml="4px" miw={35}>
            PRO
          </Badge>
        ),
        disabled: paidSettingsDisabled,
      },
    ]);
    if (paidSettingsDisabled) {
      setActivePage("general");
    }
  }, [
    accountId,
    amplifyConfigured,
    decryptedConfig,
    resolvedConfig,
    siteId,
    siteKey,
  ]);

  useEffect(() => {
    if (resolvedConfig !== undefined) {
      const fc = (resolvedConfig ?? decryptedConfig) as AuthenticatorConfig;
      setFormConfig(fc);
    }
  }, [resolvedConfig, decryptedConfig]);

  useEffect(() => {
    if (resolvedConfig !== undefined) {
      if (
        resolvedConfig !== null &&
        ((!!resolvedConfig.subscriptionType &&
          !Gatey.siteSettings.subscriber) ||
          (!resolvedConfig.subscriptionType && Gatey.siteSettings.subscriber))
      ) {
        const subscriber = !!resolvedConfig.subscriptionType;
        Gatey.siteSettings.subscriber = subscriber;
        clearCache(subscriber);
      }
    }
  }, [clearCache, resolvedConfig]);

  return (
    amplifyConfigured !== undefined && (
      <Authenticator.Provider>
        <div className={classes["wpc-container"]}>
          <DocSidebar
            opened={opened}
            close={close}
            page={activePage as never}
            scrollToId={scrollToId}
          />
          <SettingsTitle settings={settingsFormData} />
          <LicenseHandler
            apiUrl={apiUrl}
            amplifyConfigured={amplifyConfigured}
            nonce={nonce}
            config={decryptedConfig}
            stripePublicKey={configuration?.stripePublicKey}
            pricingTable={configuration?.pricingTable}
            accountId={accountId}
            ownedAccountId={ownedAccountId ?? accountId}
            siteId={siteId}
            siteKey={siteKey}
            setAccountId={setAccountId}
            setSiteId={setSiteId}
            setSiteKey={setSiteKey}
            setResolvedConfig={setResolvedConfig}
          />
          <Group
            align="flex-start"
            mt="lg"
            style={{
              flexDirection: isMobile ? "column" : "row",
              width: "100%",
            }}
          >
            <Tabs
              classNames={{
                tabLabel: classes["wpc-tabs-label"],
                panel:
                  classes[
                    isMobile ? "wpc-tabs-panel-mobile" : "wpc-tabs-panel"
                  ],
              }}
              value={activePage}
              orientation={isMobile ? "horizontal" : "vertical"}
              onChange={(value) =>
                setActivePage(
                  value as
                    | "general"
                    | "user-pools"
                    | "wordpress-login"
                    | "api-settings"
                    | "form-fields"
                )
              }
            >
              <Tabs.List>
                {navigationOptions?.map((item) => (
                  <Tabs.Tab
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                  >
                    {item.icon}
                    {!isMobile && item.label}
                    {item.badge}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <Tabs.Panel value="user-pools">
                <form name="user-pools" onSubmit={handleUpdateSettings}>
                  <Title order={2} mb="md">
                    User Pools
                  </Title>

                  <Text mb="md">
                    Connect your AWS Cognito user pool and app client here. This
                    is the foundation of your Gatey integration.
                  </Text>

                  <Tabs
                    className={classes["wpc-tabs"]}
                    value={currentConfig}
                    onChange={(value) =>
                      setCurrentConfig(value as "default" | "secondary")
                    }
                  >
                    <Tabs.List>
                      <Tabs.Tab
                        value="default"
                        leftSection={<IconStar size={16} />}
                      >
                        Default
                      </Tabs.Tab>
                      <Tabs.Tab
                        value="secondary"
                        leftSection={<IconCircleNumber2 size={16} />}
                        disabled={!formConfig}
                      >
                        Secondary
                        <Badge variant="light" color="blue" ml="4px" miw={60}>
                          BASIC
                        </Badge>
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs>

                  <Stack gap="sm" p="md" bg="gray.1">
                    <TextInput
                      disabled={savingSettings}
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") + ".Auth.Cognito.userPoolId"
                      }
                      label={
                        <InfoLabelComponent
                          text="User Pool ID"
                          scrollToId="user-pool-id"
                        />
                      }
                      description="The ID of the AWS Cognito user pool to use"
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.Auth?.Cognito?.userPoolId ?? ""
                      }
                      onChange={handleConfigChange}
                    />

                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="App Client ID"
                          scrollToId="app-client-id"
                        />
                      }
                      description="The ID of the AWS Cognito app client to use"
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") + ".Auth.Cognito.userPoolClientId"
                      }
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.Auth?.Cognito?.userPoolClientId ?? ""
                      }
                      onChange={handleConfigChange}
                    />

                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent text="Region" scrollToId="region" />
                      }
                      description="AWS region"
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") + ".API.GraphQL.region"
                      }
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.API?.GraphQL?.region ?? ""
                      }
                      onChange={handleConfigChange}
                    />

                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Identity Pool ID"
                          scrollToId="identity-pool-id"
                        />
                      }
                      description="The ID of the AWS Cognito identity pool to use"
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") + ".Auth.Cognito.identityPoolId"
                      }
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.Auth?.Cognito?.identityPoolId ?? ""
                      }
                      onChange={handleConfigChange}
                    />

                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="OAuth Domain"
                          scrollToId="oauth-domain"
                        />
                      }
                      description="The domain of the OAuth provider to use"
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") +
                        ".Auth.Cognito.loginWith.oauth.domain"
                      }
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.Auth?.Cognito?.loginWith?.oauth?.domain ?? ""
                      }
                      onChange={handleConfigChange}
                    />

                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="OAuth scopes"
                          scrollToId="oauth-scopes"
                        />
                      }
                      description="The scopes to use for the OAuth provider"
                      name={
                        (currentConfig === "default"
                          ? "default"
                          : "secondary") +
                        ".Auth.Cognito.loginWith.oauth.scopes"
                      }
                      value={
                        (currentConfig === "default"
                          ? settingsFormData.userPoolConfigurations.default
                          : settingsFormData.userPoolConfigurations.secondary
                        )?.Auth?.Cognito?.loginWith?.oauth?.scopes?.join(",") ??
                        ""
                      }
                      onChange={handleConfigChange}
                    />
                  </Stack>
                  <Group justify="flex-end" mt="lg">
                    <Button
                      loading={savingSettings}
                      variant="gradient"
                      type="submit"
                      leftSection={<IconCheck />}
                    >
                      Save User Pool Settings
                    </Button>
                  </Group>
                </form>
              </Tabs.Panel>
              <Tabs.Panel value="general">
                <form name="general" onSubmit={handleUpdateSettings}>
                  <Title order={2} mb="md">
                    General
                  </Title>

                  <Text mb="md">
                    Control how Gatey behaves across your site — including login
                    routing, redirect behavior, and display preferences.
                  </Text>

                  <Stack gap="sm">
                    <Fieldset
                      legend={
                        <InfoLabelComponent
                          text="Login Mechanisms"
                          scrollToId="login-mechanisms"
                        />
                      }
                    >
                      <Checkbox
                        disabled={savingSettings}
                        label="Username"
                        checked={settingsFormData.loginMechanisms?.includes(
                          "username"
                        )}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          // remove the current value from the array
                          const loginMechanisms = [
                            ...settingsFormData.loginMechanisms,
                          ];
                          const index = loginMechanisms.indexOf("username");
                          if (!e.target.checked && index > -1) {
                            loginMechanisms.splice(index, 1);
                          } else if (e.target.checked && index === -1) {
                            loginMechanisms.push("username");
                          }
                          setSettingsFormData({
                            ...settingsFormData,
                            loginMechanisms,
                          });
                        }}
                      />
                      <Checkbox
                        disabled={savingSettings}
                        label="Email"
                        checked={settingsFormData.loginMechanisms?.includes(
                          "email"
                        )}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          // remove the current value from the array
                          const loginMechanisms = [
                            ...settingsFormData.loginMechanisms,
                          ];
                          const index = loginMechanisms.indexOf("email");
                          if (!e.target.checked && index > -1) {
                            loginMechanisms.splice(index, 1);
                          } else if (e.target.checked && index === -1) {
                            loginMechanisms.push("email");
                          }
                          setSettingsFormData({
                            ...settingsFormData,
                            loginMechanisms,
                          });
                        }}
                      />
                      <Checkbox
                        disabled={savingSettings}
                        label="Phone Number"
                        checked={settingsFormData.loginMechanisms?.includes(
                          "phone_number"
                        )}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          // remove the current value from the array
                          const loginMechanisms = [
                            ...settingsFormData.loginMechanisms,
                          ];
                          const index = loginMechanisms.indexOf("phone_number");
                          if (!e.target.checked && index > -1) {
                            loginMechanisms.splice(index, 1);
                          } else if (e.target.checked && index === -1) {
                            loginMechanisms.push("phone_number");
                          }
                          setSettingsFormData({
                            ...settingsFormData,
                            loginMechanisms,
                          });
                        }}
                      />
                    </Fieldset>
                    <MultiSelect
                      label={
                        <InfoLabelComponent
                          text="Sign-up Attributes"
                          scrollToId="signup-attributes"
                        />
                      }
                      placeholder="Select attributes"
                      data={signUpAttributes}
                      value={settingsFormData.signUpAttributes}
                      onChange={(values: string[]) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          signUpAttributes: values as SignUpAttribute[],
                        })
                      }
                      searchable
                      hidePickedOptions
                    />
                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Custom Translations URL"
                          scrollToId="custom-translations-url"
                        />
                      }
                      description={
                        <>
                          <Text size="sm" m={0}>
                            If you want to use custom translations, enter the
                            URL here. The URL should point to a JSON file.
                            Download{" "}
                            <a
                              href="https://wpsuite.io/static/plugins/gatey-translations.json"
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              sample translations
                            </a>
                            , modify it, and upload it to your server or a
                            public file hosting service.
                          </Text>
                        </>
                      }
                      value={settingsFormData.customTranslationsUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          customTranslationsUrl: e.target.value,
                        })
                      }
                    />
                    <TextInput
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Google reCAPTCHA (v3) Site Key"
                          scrollToId="recaptcha-site-key"
                        />
                      }
                      description="Create the key in your reCAPTCHA project, then paste it here."
                      value={settingsFormData.reCaptchaPublicKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          reCaptchaPublicKey: e.target.value,
                        })
                      }
                    />
                    <Checkbox
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Use reCAPTCHA Enterprise"
                          scrollToId="use-recaptcha-enterprise"
                        />
                      }
                      checked={settingsFormData.useRecaptchaEnterprise}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          useRecaptchaEnterprise: e.target.checked,
                        })
                      }
                    />
                    <Checkbox
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Use recaptcha.net"
                          scrollToId="use-recaptcha-net"
                        />
                      }
                      checked={settingsFormData.useRecaptchaNet}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          useRecaptchaNet: e.target.checked,
                        })
                      }
                    />
                    <Select
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Sign In Page"
                          scrollToId="sign-in-page"
                        />
                      }
                      description="The WordPress page to show when the user is not logged in"
                      value={settingsFormData.signInPage}
                      onChange={(value) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          signInPage: value!,
                        })
                      }
                      data={pageOptions}
                    />
                    <Select
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Default redirect after signing in"
                          scrollToId="default-redirect-after-signing-in"
                        />
                      }
                      description="The WordPress page to redirect to after the user signs in"
                      value={settingsFormData.redirectSignIn}
                      onChange={(value) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          redirectSignIn: value!,
                        })
                      }
                      data={pageOptions}
                    />
                    <Select
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Default redirect after signing out"
                          scrollToId="default-redirect-after-signing-out"
                        />
                      }
                      description="The WordPress page to redirect to after the user signs out"
                      value={settingsFormData.redirectSignOut}
                      onChange={(value) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          redirectSignOut: value!,
                        })
                      }
                      data={pageOptions}
                    />
                  </Stack>

                  <Group justify="flex-end" mt="lg">
                    <Button
                      loading={savingSettings}
                      variant="gradient"
                      type="submit"
                      leftSection={<IconCheck />}
                    >
                      Save General Settings
                    </Button>
                  </Group>
                </form>
              </Tabs.Panel>
              <Tabs.Panel value="wordpress-login">
                <form name="wordpress-login" onSubmit={handleUpdateSettings}>
                  <Title order={2} mb="md">
                    WordPress Login
                  </Title>

                  <Text mb="md">
                    Enable full WordPress login integration using Cognito.
                    Assign roles, override wp-login, and manage secure admin
                    access.
                  </Text>

                  <Stack gap="sm">
                    <Checkbox
                      disabled={savingSettings}
                      label={
                        <InfoLabelComponent
                          text="Integrate WordPress Login"
                          scrollToId="integrate-wordpress-login"
                        />
                      }
                      checked={settingsFormData.integrateWpLogin}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleIntegrationChange(e.target.checked)
                      }
                    />
                    {settingsFormData.integrateWpLogin && (
                      <>
                        <NumberInput
                          disabled={savingSettings}
                          label={
                            <InfoLabelComponent
                              text="Cookie expiration"
                              scrollToId="cookie-expiration"
                            />
                          }
                          description="The number of seconds the cookie should be valid for"
                          value={settingsFormData.cookieExpiration}
                          onChange={(value) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              cookieExpiration: +value,
                            })
                          }
                        />
                        {wpRolesLoaded && (
                          <Box>
                            <Title order={4} my="md">
                              <InfoLabelComponent
                                text="Cognito Group to WordPress Role Mapping"
                                scrollToId="cognito-group-to-wordpress-role-mapping"
                              />
                            </Title>
                            <Table withTableBorder>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Cognito Group</Table.Th>
                                  <Table.Th>WordPress Role</Table.Th>
                                  <Table.Th></Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {settingsFormData.mappings.map(
                                  (mapping, index) => (
                                    <Table.Tr key={index}>
                                      <Table.Td>
                                        {cognitoGroupsLoaded && (
                                          <Select
                                            disabled={savingSettings}
                                            value={mapping.cognitoGroup}
                                            onChange={(value) =>
                                              handleMappingChange(
                                                index,
                                                "cognitoGroup",
                                                value!
                                              )
                                            }
                                            data={cognitoGroups}
                                          />
                                        )}
                                        {!cognitoGroupsLoaded && (
                                          <TextInput
                                            disabled={savingSettings}
                                            value={mapping.cognitoGroup}
                                            onChange={(
                                              e: React.ChangeEvent<HTMLInputElement>
                                            ) =>
                                              handleMappingChange(
                                                index,
                                                "cognitoGroup",
                                                e.target.value
                                              )
                                            }
                                          />
                                        )}
                                      </Table.Td>
                                      <Table.Td>
                                        <Select
                                          disabled={savingSettings}
                                          value={mapping.wordpressRole}
                                          onChange={(value) =>
                                            handleMappingChange(
                                              index,
                                              "wordpressRole",
                                              value!
                                            )
                                          }
                                          data={wpRoles}
                                        />
                                      </Table.Td>
                                      <Table.Td>
                                        <ActionIcon
                                          disabled={savingSettings}
                                          variant="subtle"
                                          color="red"
                                          onClick={() =>
                                            handleDeleteMapping(index)
                                          }
                                        >
                                          <IconX
                                            style={{
                                              width: "70%",
                                              height: "70%",
                                            }}
                                            stroke={1.5}
                                          />
                                        </ActionIcon>
                                      </Table.Td>
                                    </Table.Tr>
                                  )
                                )}
                              </Table.Tbody>
                            </Table>

                            <Box ta="center">
                              <Button
                                disabled={savingSettings}
                                variant="subtle"
                                size="compact-xs"
                                leftSection={<IconPlus size={14} />}
                                w="100%"
                                mt="0.3rem"
                                onClick={handleAddMapping}
                              >
                                Add Mapping
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </Stack>
                  <Group justify="flex-end" mt="lg">
                    <Button
                      loading={savingSettings}
                      variant="gradient"
                      type="submit"
                      leftSection={<IconCheck />}
                    >
                      Save WordPress Login Settings
                    </Button>
                  </Group>
                </form>
              </Tabs.Panel>
              <Tabs.Panel value="api-settings">
                <Title order={2} mb="md">
                  <InfoLabelComponent
                    text="API Settings"
                    scrollToId="api-settings"
                  />
                </Title>

                <Text mb="md">
                  Define secure API endpoints that your frontend can call via
                  Gatey.cognito. Choose API name, authorization, and endpoint
                  URL, then configure sign-in and sign-up hooks.
                </Text>

                {(formConfig ?? decryptedConfig)?.subscriptionType !==
                  "PROFESSIONAL" && (
                  <Alert
                    variant="light"
                    color="yellow"
                    title="PRO Feature"
                    icon={<IconExclamationCircle />}
                    mb="md"
                  >
                    This feature is available in the <strong>PRO</strong>{" "}
                    version of the plugin. You can save your settings but they
                    will not take effect until you upgrade your subscription.
                  </Alert>
                )}
                {(formConfig ?? decryptedConfig) && (
                  <ApiSettingsEditor
                    amplifyConfigured={amplifyConfigured}
                    config={formConfig ?? decryptedConfig}
                    accountId={accountId!}
                    siteId={siteId!}
                    siteKey={siteKey!}
                    onSave={handleConfigSave}
                    InfoLabelComponent={InfoLabelComponent}
                  />
                )}
              </Tabs.Panel>
              <Tabs.Panel value="form-fields">
                <Title order={2} mb="md">
                  Form Fields
                </Title>

                <Text mb="md">
                  Customize the fields shown on different screens. Add standard
                  or custom Cognito attributes with full control.
                </Text>

                {!(formConfig ?? decryptedConfig)?.subscriptionType && (
                  <Alert
                    variant="light"
                    color="yellow"
                    title="BASIC Feature"
                    icon={<IconExclamationCircle />}
                    mb="md"
                  >
                    This feature is available in the <strong>BASIC</strong>{" "}
                    version of the plugin. You can save your settings but they
                    will not take effect until you upgrade your subscription.
                  </Alert>
                )}
                {(formConfig ?? decryptedConfig) && (
                  <FormFieldEditor
                    amplifyConfigured={amplifyConfigured}
                    config={formConfig ?? decryptedConfig}
                    accountId={accountId!}
                    siteId={siteId!}
                    siteKey={siteKey!}
                    onSave={handleConfigSave}
                    InfoLabelComponent={InfoLabelComponent}
                  />
                )}
              </Tabs.Panel>
            </Tabs>
          </Group>
        </div>
      </Authenticator.Provider>
    )
  );
};

export default Main;
