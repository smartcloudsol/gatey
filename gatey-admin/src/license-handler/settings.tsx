import { get, patch } from "@aws-amplify/api";
import { fetchUserAttributes } from "@aws-amplify/auth";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Flex,
  Group,
  HoverCard,
  List,
  LoadingOverlay,
  Menu,
  Modal,
  Pagination,
  Radio,
  Skeleton,
  Stack,
  Text,
  TextInput,
  VisuallyHidden,
  Title,
  Tooltip,
  useModalsStack,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useForm, zodResolver } from "@mantine/form";
import { __ } from "@wordpress/i18n";
import {
  type AuthenticatorConfig,
  type SiteSettings,
} from "@smart-cloud/gatey-core";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  IconArrowsUp,
  IconAlertCircle,
  IconMoneybagHeart,
  IconCancel,
  IconCheck,
  IconCreditCard,
  IconInfoCircle,
  IconLink,
  IconClearAll,
  IconLogin,
  IconLogout,
  IconPlus,
  IconReload,
  IconSettings,
  IconEdit,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as API from "aws-amplify/api";
import {
  useCallback,
  useEffect,
  useState,
  type FunctionComponent,
} from "react";
import { z } from "zod";
import { TEXT_DOMAIN } from "../main";
import { type LicenseHandlerProps } from "./index";
import { EmailSkeleton, FullSkeleton } from "./skeletons";
import classes from "./settings.module.css";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

interface ListPage<T> {
  lastKey?: never;
  list: T[];
}

interface Account {
  accountId: string;
  name: string;
  owner: string;
  ownerEmail: string;
  customerId?: string;
  customer: unknown;
}

export interface Site {
  accountId: string;
  siteId: string;
  siteKey?: string;
  name: string;
  domain: string;
  prodDomain: string;
  subscriptionType?: SubscriptionType;
  subscription?: {
    id: string;
    active: boolean;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    subscriptionScheduleId?: string;
    nextSubscriptionType?: SubscriptionType;
  };
  settings: AuthenticatorConfig;
}

export type SubscriptionType = "BASIC" | "PROFESSIONAL";

export interface SettingsProps extends LicenseHandlerProps {
  apiUrl: string;
  stripePublicKey: string;
  pricingTable: string;
  nonce: string;
}

const LOCAL_STORAGE_KEY = "gatey_noregistration_required_dismissed";
const PAGE_SIZE = 10;

export const Settings: FunctionComponent<SettingsProps> = (
  props: SettingsProps
) => {
  const {
    amplifyConfigured,
    apiUrl,
    accountId,
    siteId,
    siteKey,
    nonce,
    config,
    setResolvedConfig,
    setSiteId,
    setSiteKey,
  } = props;
  const [stripe, setStripe] = useState<Stripe | null>();
  const [email, setEmail] = useState<string>();
  const [
    creatingUpdateSubscriptionSession,
    setCreatingUpdateSubscriptionSession,
  ] = useState<"update" | "manage">();
  const [mutatingSubscription, setMutatingSubscription] = useState<
    "cancel" | "cancel_schedule" | "renew"
  >();
  const [customerId, setCustomerId] = useState<string | null>();
  const [clientSecret, setClientSecret] = useState<string | null>();
  const [subscription, setSubscription] = useState<
    Site["subscription"] | null
  >();
  const [subscriptionType, setSubscriptionType] =
    useState<SubscriptionType | null>();
  const [noRegistrationBannerVisible, setNoRegistrationBannerVisible] =
    useState(false);

  const { authStatus, toSignIn, signOut } = useAuthenticator((context) => [
    context.user,
    context.authStatus,
    context.route,
  ]);

  const stack = useModalsStack(["connect-your-site", "prices"]);

  const queryClient = useQueryClient();

  const handleDismissNoRegistrationRequired = useCallback(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    setNoRegistrationBannerVisible(false);
  }, []);

  const cancelOrNewSubscription = useMutation({
    mutationFn: ({
      site,
      action,
    }: {
      site: Site;
      action: "cancel" | "cancel_schedule" | "renew";
    }) => {
      setMutatingSubscription(action);
      return patch({
        apiName: "backend",
        path: "/account/" + account?.accountId + "/site/" + site.siteId,
        options: /*permissions?.has("manage-subscriptions")
            ?*/ {
          queryParams: {
            action,
          },
        },
        /*: {}*/
      })
        .response.then((response) => response.body.json())
        .then((result) => {
          notifications.show({
            title: __("Subscription changed"),
            message: __("Subscription changed successfully."),
            color: "green",
            icon: <IconMoneybagHeart />,
            className: classes["notification"],
          });
          return result as unknown as Site;
        })
        .catch((err) => {
          console.error("Error:", (err as Error).message);
          notifications.show({
            title: __("Error occured", TEXT_DOMAIN),
            message: (err as Error).message,
            color: "red",
            icon: <IconAlertCircle />,
            className: classes["notification"],
          });
          setClientSecret(null);
        })
        .finally(() => {
          setMutatingSubscription(undefined);
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["site", accountId],
      });
    },
  });

  const openPricingTable = useCallback(async () => {
    if (customerId) {
      get({
        apiName: "backend",
        path: `/account/${accountId}/billing-auth-session`,
      })
        .response.then((response) => response.body.json())
        .then((response) => {
          setClientSecret((response as { token: string }).token);
        })
        .catch((err) => {
          console.error("Error:", (err as Error).message);
          setClientSecret(null);
        });
    } else {
      setClientSecret(null);
    }
    stack.open("prices");
  }, [accountId, customerId, stack]);

  const openBillingPortalSession = useCallback(
    async (type?: "update") => {
      if (!subscription || creatingUpdateSubscriptionSession) {
        return;
      }
      setCreatingUpdateSubscriptionSession(type ?? "manage");
      const queryParams: {
        next_url: string;
        subscription_id: string;
        type?: "update";
      } = {
        next_url: window.location.href,
        subscription_id: subscription.id,
      };
      if (type) {
        queryParams.type = type;
      }
      await get({
        apiName: "backend",
        path: `/account/${accountId}/billing-portal-session`,
        options: {
          queryParams,
        },
      })
        .response.then((response) => response.body.json())
        .then((response) => {
          const url = (response as { url: string }).url;
          window.location.assign(url);
        })
        .catch((err) => {
          console.error("Error:", (err as Error).message);
          setCreatingUpdateSubscriptionSession(undefined);
        });
    },
    [accountId, creatingUpdateSubscriptionSession, subscription]
  );

  const openModal = useCallback(
    (site: Site, action: "cancel" | "cancel_schedule" | "renew") => {
      let buttonTitle = "Confirm";
      let description = <></>;
      switch (action) {
        case "cancel":
          buttonTitle = "Yes, Cancel";
          description = (
            <>
              <Text component="h3" mb="sm">
                Cancel Subscription
              </Text>{" "}
              <Text mb="sm">
                Your subscription will be canceled, but is still available until
                the end of your billing period on{" "}
                <strong>
                  {new Date(
                    (site.subscription?.currentPeriodEnd ?? 0) * 1000
                  )?.toLocaleString("en")}
                </strong>
                . If you change your mind, you can renew your subscription.
              </Text>
              <Text fw={500}>
                Are you sure you want to cancel your subscription?
              </Text>
            </>
          );
          break;
        case "cancel_schedule":
          buttonTitle = "Yes, Cancel";
          description = (
            <>
              <Text component="h3" mb="sm">
                Cancel Scheduled Change
              </Text>{" "}
              <Text mb="sm">
                If canceled, your subscription will continue with the original
                terms after{" "}
                <strong>
                  {new Date(
                    (site.subscription?.currentPeriodEnd ?? 0) * 1000
                  )?.toLocaleString("en")}
                </strong>
                .
              </Text>
              <Text fw={500}>
                Are you sure you want to cancel the scheduled change to your
                subscription?
              </Text>
            </>
          );
          break;
        case "renew":
          buttonTitle = "Yes, Renew";
          description = (
            <>
              <Text component="h3" mb="sm">
                Renew Subscription
              </Text>{" "}
              <Text size="sm">
                This subscription will no longer be canceled. It will renew on{" "}
                {new Date(
                  (site.subscription?.currentPeriodEnd ?? 0) * 1000
                )?.toLocaleString("en")}
                .
              </Text>
            </>
          );
          break;
      }

      modals.openConfirmModal({
        children: description,
        labels: { confirm: buttonTitle, cancel: "No" },
        confirmProps: {
          className: classes["console-button"],
        },
        cancelProps: {
          variant: "outline",
          className: classes["console-button-outline"],
        },
        withCloseButton: false,
        onConfirm: () => cancelOrNewSubscription.mutate({ site, action }),
        zIndex: 100000,
        xOffset: "1dvh",
        yOffset: "1dvh",
        centered: true,
      });
    },
    [cancelOrNewSubscription]
  );

  useEffect(() => {
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    setNoRegistrationBannerVisible(!dismissed);
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchUserAttributes().then((userAttributes) =>
        setEmail(userAttributes?.email)
      );
    }
  }, [apiUrl, authStatus]);

  const { data: account, isError: isAccountError } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => fetchAccount(accountId!),
    enabled: !!accountId && authStatus === "authenticated",
  });

  useEffect(() => {
    if (account) {
      setClientSecret(undefined);
      setCustomerId(account.customer ? (account?.customerId as string) : null);
    } else if (
      authStatus === "authenticated" &&
      (!accountId || isAccountError)
    ) {
      setClientSecret(undefined);
      setCustomerId(null);
    }
  }, [account, accountId, authStatus, isAccountError]);

  const { data: site, isError: isSiteError } = useQuery({
    queryKey: ["site", accountId, siteId],
    queryFn: () => fetchSite(accountId!, siteId!),
    enabled: !!accountId && !!siteId && authStatus === "authenticated",
  });

  useEffect(() => {
    if (site) {
      setSubscriptionType(site.subscriptionType ?? null);
      setSubscription(site.subscription);
      setResolvedConfig({
        ...JSON.parse(JSON.stringify(site.settings ?? {})),
        subscriptionType: site.subscriptionType,
        secondaryDomain: site.prodDomain,
      });
    } else if (
      authStatus === "authenticated" &&
      accountId &&
      (!siteId || isAccountError || isSiteError)
    ) {
      setSubscription(null);
      setSubscriptionType(config?.subscriptionType ?? null);
      setResolvedConfig(null);
    }
  }, [
    accountId,
    authStatus,
    config,
    isAccountError,
    isSiteError,
    setResolvedConfig,
    site,
    siteId,
  ]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      setSiteId(undefined);
      setSiteKey(undefined);
      queryClient.invalidateQueries({
        queryKey: ["site", accountId, siteId],
      });
    }
  }, [
    accountId,
    amplifyConfigured,
    authStatus,
    queryClient,
    setSiteId,
    setSiteKey,
    siteId,
  ]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setCustomerId(null);
      setClientSecret(undefined);
      setSubscription(null);
      setSubscriptionType(undefined);
    }
  }, [authStatus]);

  useEffect(() => {
    if (props.stripePublicKey) {
      loadStripe(props.stripePublicKey).then((stripe) => setStripe(stripe));
    }
  }, [props.stripePublicKey]);

  const clearCache = useCallback(
    async (siteSettings?: SiteSettings) => {
      if (siteSettings?.siteId && siteId !== siteSettings?.siteId) {
        Gatey.siteSettings.siteId = siteSettings.siteId;
        setSiteId(siteSettings.siteId);
        setSiteKey(siteSettings.siteKey);
        queryClient.invalidateQueries({
          queryKey: ["site", accountId, siteId],
        });
      }
      return fetch(Gatey.restUrl + "/update-site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": nonce,
        },
        body: JSON.stringify({
          accountId: siteSettings?.accountId ?? accountId,
          siteId: siteSettings?.siteId ?? siteId,
          siteKey: siteSettings?.siteKey ?? siteKey,
          lastUpdate: new Date().getTime(),
          subscriber: !!subscriptionType,
        }),
        credentials: "same-origin",
      });
    },
    [
      accountId,
      nonce,
      queryClient,
      setSiteId,
      setSiteKey,
      siteId,
      siteKey,
      subscriptionType,
    ]
  );

  const saveSiteSettingsMutation = useMutation({
    mutationFn: (siteSettings: SiteSettings) => {
      return clearCache(siteSettings);
    },
    onSuccess: async (response) => {
      if (response.ok) {
        notifications.show({
          title: __("Settings saved", TEXT_DOMAIN),
          message: __("Site settings saved successfully", TEXT_DOMAIN),
          color: "green",
          icon: <IconInfoCircle />,
          className: classes["notification"],
        });
      } else {
        const err = await response.json();
        console.error("Failed to connect site", err);
        notifications.show({
          title: __("Error occured", TEXT_DOMAIN),
          message: (err as Error).message,
          color: "red",
          icon: <IconAlertCircle />,
          className: classes["notification"],
        });
      }
      stack.close("connect-your-site");
      //window.location.reload();
    },
    onError: (error) => {
      notifications.show({
        title: __("Error occured", TEXT_DOMAIN),
        message: (error as Error).message,
        color: "red",
        icon: <IconAlertCircle />,
        className: classes["notification"],
      });
    },
  });

  return (
    <Group justify="space-between">
      <Modal.Stack>
        <Modal
          {...stack.register("connect-your-site")}
          withCloseButton
          size="auto"
          centered
          title={
            <Text size="lg" fw={700}>
              Connect Your Site
            </Text>
          }
        >
          <Authenticator
            loginMechanisms={["email"]}
            signUpAttributes={["email", "family_name", "given_name"]}
            formFields={{
              signUp: {
                "custom:acknowledgement": {
                  isRequired: true,
                  label:
                    'By creating an account, you agree to our <a href="https://wpsuite.io/privacy-policy" target="_blank" class="dark-link">Privacy Policy</a> and <a href="https://wpsuite.io/terms-of-use" target="_blank" class="dark-link">Terms of Use</a>, including the binding arbitration clause and class action waiver in Section 9.2.',
                  type: "checkbox",
                },
              },
            }}
          >
            {/*
            TODO: Account és Site választó komponens, amin a felhasználó kiválaszthatja a saját accountját és site-ját, amit csatlakoztatni szeretne
            A választás után az accountId-t és a siteId-t el kell menteni a /update-site-settings WP API-n, majd setLoadingSubscription(false)
          */}
            {amplifyConfigured && !accountId /*|| !siteId*/ && (
              <SiteSelectorSkeleton />
            )}
            {accountId /*&& siteId*/ && (
              <SiteSelector
                authStatus={authStatus}
                accountId={accountId}
                siteId={siteId}
                siteKey={siteKey}
                site={site}
                onSignOut={signOut}
                onConnect={saveSiteSettingsMutation.mutate}
              />
            )}
          </Authenticator>
        </Modal>
        {stripe && (
          <Modal
            {...stack.register("prices")}
            withCloseButton
            size={1050}
            zIndex={10000}
            centered
            title={
              <Text size="lg" fw={700}>
                Plans and Pricing
              </Text>
            }
          >
            {clientSecret !== undefined && email !== undefined && (
              <Group justify="center" mt={20}>
                <Stack w="100%" gap={20}>
                  {clientSecret ? (
                    <stripe-pricing-table
                      pricing-table-id={props.pricingTable}
                      publishable-key={props.stripePublicKey}
                      client-reference-id={props.accountId + "-" + props.siteId}
                      customer-session-client-secret={clientSecret}
                    />
                  ) : (
                    <stripe-pricing-table
                      pricing-table-id={props.pricingTable}
                      publishable-key={props.stripePublicKey}
                      client-reference-id={props.accountId + "-" + props.siteId}
                      customer-email={email}
                    />
                  )}
                  <Group align="center" className={classes.info}>
                    <Flex
                      align="start"
                      direction="column"
                      className={classes.text}
                      gap={{ base: 10, sm: 0 }}
                    >
                      <Title order={5}>Additional Information</Title>
                      <List spacing="xs" size="xs">
                        <List.Item className={classes.item}>
                          All prices are net amounts. Applicable taxes (e.g.,
                          VAT, Sales Tax) may be added depending on your
                          location and circumstances.
                        </List.Item>
                        <List.Item className={classes.item}>
                          FREE plan includes full AWS Cognito support (except
                          for social providers) and WordPress integration.
                        </List.Item>
                      </List>
                    </Flex>
                  </Group>
                </Stack>
              </Group>
            )}
          </Modal>
        )}
      </Modal.Stack>
      {authStatus === "unauthenticated" && (
        <>
          {noRegistrationBannerVisible && (
            <Alert
              color="green"
              title="No Registration Required"
              icon={<IconInfoCircle />}
              w="100%"
              withCloseButton
              onClose={handleDismissNoRegistrationRequired}
            >
              <Text size="sm" mb="xs">
                <strong>
                  All essential features work out of the box without
                  registration.
                </strong>{" "}
                Premium options like frontend customization (available on the
                BASIC plan), advanced forms, and social login become available
                after connecting your site and choosing a plan.
              </Text>
              <Text size="sm">
                Enjoy a <strong>14-day free trial</strong> with full access —{" "}
                <strong>no credit card required</strong>. See our{" "}
                <a
                  href="https://wpsuite.io/gatey/pricing/"
                  target="_blank"
                  rel="noreferrer"
                >
                  pricing page
                </a>{" "}
                for details.
              </Text>
            </Alert>
          )}
          <Group gap="xs">
            <IconUser size={16} />
            <Text size="sm">You are not signed in.</Text>
          </Group>
        </>
      )}
      {authStatus === "configuring" && <FullSkeleton />}
      {authStatus === "authenticated" && (
        <>
          {subscriptionType !== undefined &&
            subscriptionType !== null &&
            !subscription &&
            ((isAccountError && (
              <Alert
                color="red"
                title="Notice – Limited functionality due to network error"
                icon={<IconAlertCircle />}
                w="100%"
              >
                <Text size="sm" mb="xs">
                  You’re logged in to WordPress as an admin, but configuration
                  and PRO features are currently unavailable. Please try again
                  later — no action is needed on your side.
                </Text>
              </Alert>
            )) ||
              ((!siteId || isSiteError) && (
                <Alert
                  color="red"
                  title="Access denied – You don’t have access to this site’s PRO configuration"
                  icon={<IconAlertCircle />}
                  w="100%"
                >
                  <Text size="sm" mb="xs">
                    You’re logged in to WordPress as an admin, but the Gatey
                    account you used isn’t on the allowed members list for this
                    connected site.
                  </Text>
                </Alert>
              )))}

          <Group gap="xs">
            {!email && (
              <>
                <Skeleton height={24} circle />
                <EmailSkeleton />
              </>
            )}
            {email && (
              <Flex gap="xs" p="sm" align="center">
                <IconUser size={16} />
                <Text size="sm">{email}</Text>
              </Flex>
            )}
            {amplifyConfigured && subscriptionType === undefined && (
              <Skeleton height={48} width={300} />
            )}
            {amplifyConfigured && subscriptionType === null && (
              <Badge color="gray">FREE</Badge>
            )}
            {subscriptionType !== undefined && subscriptionType !== null && (
              <>
                <Flex
                  direction={{ base: "column", md: "row" }}
                  gap="sm"
                  p="sm"
                  bg="gray.0"
                  style={{ borderRadius: 6 }}
                >
                  {subscriptionType === "BASIC" && (
                    <Badge color="blue">BASIC</Badge>
                  )}
                  {subscriptionType === "PROFESSIONAL" && (
                    <Badge color="red">PRO</Badge>
                  )}
                  <Stack gap={2} style={{ flexGrow: 1 }}>
                    <Text size="sm" fw={500} component="div">
                      {subscription
                        ? subscription?.active
                          ? "Subscription active"
                          : "Subscription inactive"
                        : "Subscription inaccessible"}
                      {subscription &&
                        subscription.active &&
                        subscription.cancelAtPeriodEnd && (
                          <>
                            {" "}
                            — expires on{" "}
                            <strong>
                              {new Date(
                                subscription.currentPeriodEnd * 1000
                              ).toLocaleDateString()}
                            </strong>
                          </>
                        )}
                      {subscription &&
                        subscription.active &&
                        !subscription.cancelAtPeriodEnd && (
                          <>
                            {" "}
                            — renews automatically{" "}
                            {subscription.nextSubscriptionType &&
                              subscriptionType !==
                                subscription.nextSubscriptionType && (
                                <>
                                  as a{" "}
                                  <strong>
                                    {subscription.nextSubscriptionType}
                                  </strong>{" "}
                                  subscription{" "}
                                </>
                              )}
                            on{" "}
                            <strong>
                              {new Date(
                                subscription.currentPeriodEnd * 1000
                              ).toLocaleDateString()}
                            </strong>
                          </>
                        )}
                    </Text>
                  </Stack>
                </Flex>
              </>
            )}
          </Group>
        </>
      )}
      {subscriptionType === undefined && authStatus === "unauthenticated" && (
        <Group gap="xs">
          <Button
            variant="gradient"
            leftSection={<IconLogin size={16} />}
            onClick={() => {
              toSignIn();
              stack.open("connect-your-site");
            }}
            disabled={!amplifyConfigured}
          >
            Sign In and {accountId && siteId ? "Reconnect" : "Connect"} Your
            Site
          </Button>
          {!amplifyConfigured && (
            <HoverCard>
              <HoverCard.Target>
                <ActionIcon variant="subtle" size="xs">
                  <IconAlertCircle size={16} color="red" />
                </ActionIcon>
              </HoverCard.Target>
              <HoverCard.Dropdown maw={300} style={{ zIndex: 10000 }}>
                <Text size="sm">
                  🛑 <strong>Heads-up</strong>: Configuration is temporarily
                  unavailable. Please try again later — no action is needed on
                  your side.
                </Text>
              </HoverCard.Dropdown>
            </HoverCard>
          )}
        </Group>
      )}
      {authStatus === "authenticated" && (
        <Menu shadow="md" width={220}>
          <Menu.Target>
            <Button variant="subtle" leftSection={<IconSettings size={16} />}>
              Settings
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Site</Menu.Label>
            {subscriptionType !== undefined &&
              authStatus === "authenticated" &&
              accountId &&
              siteId && (
                <>
                  <Menu.Item
                    leftSection={<IconLink size={16} />}
                    onClick={() => stack.open("connect-your-site")}
                  >
                    Reconnect
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconClearAll size={16} />}
                    onClick={async () => {
                      try {
                        const response = await clearCache();
                        if (response.ok) {
                          notifications.show({
                            title: __("Cache cleared", TEXT_DOMAIN),
                            message: __(
                              "Front-end site configuration cleared successfully.",
                              TEXT_DOMAIN
                            ),
                            color: "green",
                            icon: <IconTrash />,
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
                      }
                    }}
                  >
                    Clear Cache
                  </Menu.Item>
                </>
              )}
            {subscriptionType !== undefined &&
              authStatus === "authenticated" &&
              (!accountId || !siteId) && (
                <Menu.Item
                  leftSection={<IconLink size={16} />}
                  onClick={() => stack.open("connect-your-site")}
                >
                  Connect
                </Menu.Item>
              )}
            <Menu.Divider />
            <Menu.Label>Subscription</Menu.Label>
            {subscriptionType === null && (
              <Menu.Item
                leftSection={<IconCreditCard size={16} />}
                onClick={() => openPricingTable()}
              >
                Plans &amp; Pricing
              </Menu.Item>
            )}
            {subscriptionType !== null && subscription && (
              <>
                <Menu.Item
                  leftSection={<IconCreditCard size={16} />}
                  disabled={
                    !!creatingUpdateSubscriptionSession ||
                    !!mutatingSubscription
                  }
                  onClick={() => openBillingPortalSession()}
                >
                  Manage Billing
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowsUp size={16} />}
                  disabled={
                    !!creatingUpdateSubscriptionSession ||
                    !!mutatingSubscription
                  }
                  onClick={() => openBillingPortalSession("update")}
                >
                  Update
                </Menu.Item>
                {(subscription.cancelAtPeriodEnd ||
                  (subscription.nextSubscriptionType &&
                    subscription.nextSubscriptionType !==
                      subscriptionType)) && (
                  <Menu.Item
                    leftSection={<IconReload size={16} />}
                    disabled={
                      !!creatingUpdateSubscriptionSession ||
                      !!mutatingSubscription
                    }
                    onClick={() =>
                      openModal(
                        site!,
                        subscription.cancelAtPeriodEnd
                          ? "renew"
                          : "cancel_schedule"
                      )
                    }
                  >
                    {subscription.cancelAtPeriodEnd
                      ? "Renew"
                      : "Cancel Scheduled Update"}
                  </Menu.Item>
                )}
                {!subscription.cancelAtPeriodEnd && (
                  <Menu.Item
                    leftSection={<IconCancel size={16} />}
                    disabled={
                      !!creatingUpdateSubscriptionSession ||
                      !!mutatingSubscription
                    }
                    onClick={() => openModal(site!, "cancel")}
                  >
                    Cancel
                  </Menu.Item>
                )}
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
};

function SiteSelectorSkeleton() {
  return (
    <>
      <Skeleton w={{ base: "100%", xs: 350 }} height={80} mb="md" />
      <Skeleton w={{ base: "100%", xs: 350 }} height={80} mb="md" />
      <Skeleton w={{ base: "100%", xs: 350 }} height={80} mb="md" />
    </>
  );
}

const CreateSiteSchema = z.object({
  siteId: z.string().optional(),
  name: z.string(),
  domain: z.string(),
  prodDomain: z.string().optional(),
});

type CreateSiteInput = z.infer<typeof CreateSiteSchema>;

interface SiteSelectorProps {
  authStatus: "authenticated" | "unauthenticated" | "configuring";
  accountId: string;
  siteId?: string;
  siteKey?: string;
  site?: Site;
  onSignOut: () => void;
  onConnect: (siteSettings: SiteSettings) => void;
}

function SiteSelector({
  authStatus,
  accountId,
  siteId,
  siteKey,
  site,
  onSignOut,
  onConnect,
}: SiteSelectorProps) {
  const [sitesReloading, setSitesReloading] = useState(false);
  const [sites, setSites] = useState<Site[] | undefined>();
  const [currentPage, setCurrentPage] = useState<Site[] | undefined>();
  const [activePage, setActivePage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const [siteEditing, setSiteEditing] = useState<boolean>(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(
    siteId
  );
  const [selectedSiteKey, setSelectedSiteKey] = useState<string | undefined>(
    siteKey
  );

  const form = useForm<CreateSiteInput>({
    mode: "uncontrolled",
    initialValues: {
      siteId: "",
      name: "",
      domain: "",
      prodDomain: "",
    },
    validate: zodResolver(CreateSiteSchema as never),
  });

  const fetchSites = useCallback(
    ({ pageParam = null }: { pageParam: string | null }) =>
      get({
        apiName: "backend",
        path: `/account/${accountId}/site`,
        options: pageParam
          ? {
              queryParams: {
                limit: String(PAGE_SIZE),
                last_key: pageParam,
              },
            }
          : {
              queryParams: {
                limit: String(PAGE_SIZE),
              },
            },
      })
        .response.then((res) => res.body.json())
        .then((result) => result as unknown as ListPage<Site>)
        .catch((err) => {
          console.error("Error fetching sites:", err);
          throw err;
        })
        .finally(() => {
          setSitesReloading(false);
        }),
    [accountId]
  );

  const {
    isPending: sitesPending,
    error: sitesError,
    data: sitesResult,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["sites", accountId],
    queryFn: fetchSites,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.lastKey ?? undefined,
    select: (data) => ({
      pages: data.pages.filter((p) => p.list.length > 0),
    }),
    enabled: !!accountId && authStatus === "authenticated",
  });

  const handleNextPage = useCallback(
    (page: number) => {
      if (page > totalPages && hasNextPage) {
        fetchNextPage().then((data) => {
          setActivePage(Math.min(page, data?.data?.pages.length ?? 0));
        });
      } else {
        setActivePage(page);
      }
    },
    [fetchNextPage, hasNextPage, totalPages]
  );

  const queryClient = useQueryClient();

  const updateSiteMutation = useMutation({
    mutationFn: async (siteDetails: {
      siteId?: string;
      name: string;
      domain: string;
      prodDomain?: string;
    }) => {
      const siteUpdateDetails: {
        name: string;
        prodDomain?: string;
      } = {
        name: siteDetails.name,
      };
      if (siteDetails.prodDomain) {
        siteUpdateDetails.prodDomain = siteDetails.prodDomain;
      }
      const result = await (siteDetails.siteId &&
      siteDetails.siteId.trim() !== ""
        ? API.put({
            apiName: "backend",
            path: `/account/${accountId}/site/${siteDetails.siteId}`,
            options: {
              body: siteUpdateDetails,
            },
          })
        : API.post({
            apiName: "backend",
            path: `/account/${accountId}/site`,
            options: {
              body: siteUpdateDetails,
            },
          })
      ).response
        .then((response) => response.body.json())
        .then((result) => {
          notifications.show({
            title: __("Site updated", TEXT_DOMAIN),
            message: __("Site updated successfully.", TEXT_DOMAIN),
            color: "green",
            icon: <IconInfoCircle />,
            className: classes["notification"],
          });
          return result as unknown as Site;
        })
        .catch((err) => {
          console.error("Error:", (err as Error).message);
          notifications.show({
            title: __("Error occured", TEXT_DOMAIN),
            message: (err as Error).message,
            color: "red",
            icon: <IconAlertCircle />,
            className: classes["notification"],
          });
        });

      return result as unknown as Site;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites", accountId] });
      setSiteEditing(false);
    },
    onError: (error) => {
      notifications.show({
        title: __("Error occured", TEXT_DOMAIN),
        message: (error as Error).message,
        color: "red",
        icon: <IconAlertCircle />,
        className: classes["notification"],
      });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      await API.del({
        apiName: "backend",
        path: `/account/${accountId}/site/${siteId}`,
      }).response;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["sites"] });
      const prev = queryClient.getQueryData(["sites"]);
      queryClient.setQueryData(["sites"], (data: typeof sitesResult) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((p: ListPage<Site>) => ({
            ...p,
            list: p.list.filter((s: Site) => s.siteId !== id),
          })),
        };
      });
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites", accountId] });
      if (selectedSiteId === siteId) {
        setSelectedSiteId(undefined);
        setSelectedSiteKey(undefined);
      }
    },
  });

  useEffect(() => {
    if (sitesResult?.pages) {
      setSites(
        sitesResult.pages.flatMap((p) => (p as ListPage<Site>).list) ?? []
      );
      setTotalPages(Math.max(sitesResult.pages.length, 1));
    }
  }, [sitesResult]);

  useEffect(() => {
    if (totalPages > 0 && activePage > totalPages) {
      setActivePage(totalPages);
    }
  }, [activePage, totalPages]);

  useEffect(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    setCurrentPage(sites?.slice(start, start + PAGE_SIZE));
  }, [sites, activePage]);

  if (isFetchingNextPage || sitesPending || sitesReloading) {
    return <SiteSelectorSkeleton />;
  }

  return (
    <>
      {sitesError ? (
        <Text c="red">Error: {sitesError?.message}</Text>
      ) : (
        <Radio.Group
          label="Select a site"
          description="Select a site to connect this WordPress instance to"
          mb="md"
          defaultValue={siteId}
          value={selectedSiteId + "|" + selectedSiteKey}
          onChange={(value) => {
            const values = value.split("|");
            setSelectedSiteId(values[0]);
            if (values.length > 1) {
              setSelectedSiteKey(values[1]);
            }
          }}
        >
          <Stack pt="md" mb="md" gap="xs">
            {(!currentPage?.length || currentPage.length === 0) &&
              !siteEditing && (
                <Stack
                  align="center"
                  gap="md"
                  py="xl"
                  mb="lg"
                  w={{ base: "100%", xs: 350 }}
                >
                  <Title order={4}>No Sites Found</Title>
                  <Text c="dimmed" size="sm" ta="center">
                    You haven't added any sites yet.
                  </Text>
                  <Button
                    variant="gradient"
                    size="xs"
                    leftSection={<IconPlus size={16} />}
                    onClick={() => {
                      form.setValues({
                        siteId: "",
                        name: "",
                        domain: location.hostname.split(":")[0],
                        prodDomain: "",
                      });
                      setSiteEditing(true);
                    }}
                  >
                    Add a new site
                  </Button>
                </Stack>
              )}
            {!siteEditing &&
              currentPage?.map((site) => (
                <Radio.Card
                  className={classes.radioCard}
                  component="div"
                  p="md"
                  radius="md"
                  value={site.siteId + "|" + site.siteKey}
                  key={site.siteId}
                  disabled={siteEditing}
                >
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <Stack gap="xs" style={{ flexGrow: 1 }}>
                      <Text
                        component="div"
                        fw={700}
                        lh={1.3}
                        size="md"
                        c="bright"
                      >
                        {site.name}
                        {site.domain === location.hostname.split(":")[0] && (
                          <Badge size="xs" ml="xs" variant="light">
                            Current domain
                          </Badge>
                        )}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {site.prodDomain ? site.prodDomain : site.domain}{" "}
                        {site.prodDomain && <>({site.domain})</>}
                      </Text>
                    </Stack>
                    <Tooltip label="Edit site">
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        aria-label="Edit site"
                        onClick={(e) => {
                          e.stopPropagation();
                          form.setValues({
                            siteId: site.siteId,
                            name: site.name,
                            domain: site.domain,
                            prodDomain: site.prodDomain,
                          });
                          setSiteEditing(true);
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip
                      label={
                        site.subscriptionType !== undefined
                          ? "Cannot delete site with active subscription"
                          : "Delete site"
                      }
                    >
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="red"
                        aria-label={
                          site.subscriptionType !== undefined
                            ? "Cannot delete site with active subscription"
                            : "Delete site"
                        }
                        disabled={site.subscriptionType !== undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          modals.openConfirmModal({
                            children: (
                              <>
                                <Text component="h3" mb="sm">
                                  Delete {site.name}?
                                </Text>{" "}
                                <Text mb="sm">
                                  This site does not have an active
                                  subscription, but it may still contain saved
                                  configuration settings from another WordPress
                                  instance.
                                </Text>
                                <Text mb="sm">
                                  Deleting this site will permanently remove all
                                  saved settings, and this action cannot be
                                  undone.
                                </Text>
                                <Text fw={500}>
                                  Are you sure you want to delete this site?
                                </Text>
                              </>
                            ),
                            labels: { confirm: "Yes, Delete", cancel: "No" },
                            confirmProps: {
                              className: classes["console-button"],
                            },
                            cancelProps: {
                              variant: "outline",
                              className: classes["console-button-outline"],
                            },
                            withCloseButton: false,
                            onConfirm: () =>
                              deleteSiteMutation.mutate(site.siteId),
                            zIndex: 100000,
                            xOffset: "1dvh",
                            yOffset: "1dvh",
                            centered: true,
                          });
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Radio.Card>
              ))}
            {!siteEditing && (
              <Pagination
                classNames={{
                  root: classes["pagination"],
                  control: classes["pagination-control"],
                }}
                total={
                  hasNextPage
                    ? Math.max(totalPages, activePage + 1)
                    : totalPages
                }
                value={activePage}
                onChange={handleNextPage}
                mt="md"
              />
            )}
            {siteEditing && (
              <Card
                component="form"
                withBorder
                w={{ base: "100%", xs: 350 }}
                onSubmit={form.onSubmit((values) => {
                  updateSiteMutation.mutate({
                    siteId: values.siteId,
                    name: values.name,
                    domain: values.domain,
                    prodDomain: values.prodDomain,
                  });
                })}
              >
                <LoadingOverlay
                  visible={updateSiteMutation.isPending}
                  zIndex={1000}
                  overlayProps={{ radius: "md", blur: 2 }}
                />
                <VisuallyHidden>
                  <TextInput
                    key={form.key("siteId")}
                    {...form.getInputProps("siteId")}
                  />
                </VisuallyHidden>
                <TextInput
                  label="Site name"
                  placeholder="My WordPress site"
                  key={form.key("name")}
                  {...form.getInputProps("name")}
                />
                <TextInput
                  label="Domain"
                  placeholder="dev.my-wordpress-site.com"
                  disabled
                  key={form.key("domain")}
                  {...form.getInputProps("domain")}
                  classNames={{
                    input:
                      site?.settings &&
                      form.getValues()["domain"] !==
                        location.hostname.split(":")[0]
                        ? classes["warning"]
                        : classes["input"],
                  }}
                />
                <TextInput
                  label="Production domain"
                  placeholder="my-wordpress-site.com"
                  key={form.key("prodDomain")}
                  {...form.getInputProps("prodDomain")}
                />
                <Group justify="space-between" mt="md">
                  <Button
                    variant="outline"
                    size="xs"
                    leftSection={<IconX size={16} />}
                    onClick={() => setSiteEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Flex gap={0}>
                    <Button
                      type="submit"
                      variant="gradient"
                      size="xs"
                      leftSection={<IconCheck size={16} />}
                    >
                      Save
                    </Button>
                    {site?.settings &&
                      form.getValues()["domain"] !==
                        location.hostname.split(":")[0] && (
                        <HoverCard>
                          <HoverCard.Target>
                            <ActionIcon variant="subtle" size="xs">
                              <IconAlertCircle size={16} color="red" />
                            </ActionIcon>
                          </HoverCard.Target>
                          <HoverCard.Dropdown
                            maw={300}
                            style={{ zIndex: 10000 }}
                          >
                            <Text size="sm">
                              ⚠️ <strong>Warning</strong>: The current WordPress
                              domain differs from the one stored for this site.
                              Saving changes will update the stored domain to
                              the current one. This may break the WordPress
                              configuration on the previous domain.
                            </Text>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      )}
                  </Flex>
                </Group>
              </Card>
            )}
            {currentPage && (
              <Group justify="center">
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    form.setValues({
                      siteId: "",
                      name: "",
                      domain: location.hostname.split(":")[0],
                      prodDomain: "",
                    });
                    setSiteEditing(true);
                  }}
                  disabled={siteEditing}
                >
                  Add a new site
                </Button>
              </Group>
            )}
          </Stack>
        </Radio.Group>
      )}

      <Group justify="space-between">
        <Button
          variant="outline"
          onClick={onSignOut}
          leftSection={<IconLogout size={16} />}
          disabled={siteEditing}
        >
          Sign Out
        </Button>
        <Button
          variant="gradient"
          onClick={() =>
            onConnect({
              accountId,
              siteId: selectedSiteId,
              siteKey: selectedSiteKey,
            })
          }
          leftSection={<IconLink size={16} />}
          disabled={!!sitesError || siteEditing}
        >
          Connect
        </Button>
      </Group>
    </>
  );
}

async function fetchAccount(accountId: string) {
  const response = await get({
    apiName: "backend",
    path: `/account/${accountId}`,
  }).response;
  const body = await response.body.json();

  return body as unknown as Account;
}

async function fetchSite(accountId: string, siteId: string) {
  const response = await get({
    apiName: "backend",
    path: `/account/${accountId}/site/${siteId}`,
  }).response;
  const body = await response.body.json();

  return body as unknown as Site;
}
