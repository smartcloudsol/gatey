import { Alert, Button, Card, Group, Modal, Stack, Text } from "@mantine/core";
import {
  Authenticator,
  translations,
  useAuthenticator,
} from "@smart-cloud/aws-amplify-ui-react";
import {
  IconCheck,
  IconInfoCircle,
  IconLogin,
  IconLogout,
} from "@tabler/icons-react";
import { useSelect } from "@wordpress/data";
import { fetchUserAttributes, signOut } from "aws-amplify/auth";
import { I18n } from "aws-amplify/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getGateyPlugin,
  getStoreDispatch,
  getStoreSelect,
  type Account,
  type Settings,
  type Store,
} from "@smart-cloud/gatey-core";

import "@smart-cloud/aws-amplify-ui-react/styles.css";

I18n.putVocabularies(translations);

const currentPoolIsConfigured = (settings: Settings): boolean => {
  const hostname = window.location.hostname.toLowerCase().split(":")[0];
  const useSecondary = Boolean(
    settings.secondaryUserPoolDomains &&
      hostname.match(settings.secondaryUserPoolDomains.toLowerCase()) &&
      settings.userPoolConfigurations.secondary?.Auth?.Cognito?.userPoolId,
  );
  const configuration = useSecondary
    ? settings.userPoolConfigurations.secondary
    : settings.userPoolConfigurations.default;
  const cognito = configuration?.Auth?.Cognito;

  return Boolean(cognito?.userPoolId && cognito.userPoolClientId);
};

const sessionIdentity = (account: Account): string | undefined =>
  account.userAttributes?.email ??
  account.userAttributes?.preferred_username ??
  account.username;

type SignInFormProps = {
  settings: Settings;
  onSignedIn: () => void;
  onClose: () => void;
};

const SignInConfirmation = ({
  onSignedIn,
  onClose,
}: Pick<SignInFormProps, "onSignedIn" | "onClose">) => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const notified = useRef(false);

  useEffect(() => {
    if (authStatus === "authenticated" && !notified.current) {
      notified.current = true;
      // Do not use a cancellable timer here. `user` and `authStatus` are
      // populated in adjacent Authenticator updates, so an effect cleanup can
      // otherwise cancel the opener-card refresh after this success panel is
      // already visible.
      void Promise.resolve().then(onSignedIn);
    }
  }, [authStatus, onSignedIn]);

  if (authStatus !== "authenticated") {
    return null;
  }
  console.log("Auth status:", authStatus);
  return (
    <Alert icon={<IconCheck size={16} />} color="green" title="Signed in">
      <Stack gap="sm">
        <Text size="sm">
          Your Cognito session is ready for this browser&apos;s protected
          backend API calls.
        </Text>
        <Group>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
};

const SignInForm = ({ settings, onSignedIn, onClose }: SignInFormProps) => {
  return (
    <Authenticator
      initialState="signIn"
      hideSignUp={true}
      loginMechanisms={settings.loginMechanisms}
      passwordless={settings.passwordlessSettings}
    >
      <SignInConfirmation onSignedIn={onSignedIn} onClose={onClose} />
    </Authenticator>
  );
};

const CognitoAdminSessionContent = ({ store }: { store: Store }) => {
  const gatey = getGateyPlugin();
  const settings = gatey?.settings;
  const { authStatus, user } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
  ]);
  const account = useSelect(() => getStoreSelect(store).getAccount(), [store]);
  const [opened, setOpened] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Keep the card responsive even when a WordPress data-store subscriber has
  // not rerendered yet after the Authenticator completes its session update.
  // `undefined` means that the initial session check has not resolved; `null`
  // is a confirmed signed-out state.
  const [sessionAccount, setSessionAccount] = useState<
    Account | null | undefined
  >(undefined);
  const configured = useMemo(
    () => (settings ? currentPoolIsConfigured(settings) : false),
    [settings],
  );

  const refreshSession = useCallback(async () => {
    try {
      const userAttributes = await fetchUserAttributes();
      const nextAccount: Account = {
        // Amplify may publish the authenticated status a moment before its
        // `user` object is populated. The attributes still give us a stable
        // identity for the card, so never convert that short transition into
        // a local sign-out.
        username:
          user?.username ??
          userAttributes.email ??
          userAttributes.preferred_username ??
          "",
        userAttributes,
      };
      setSessionAccount(nextAccount);
      getStoreDispatch(store).setAccount(nextAccount);
      getStoreDispatch(store).setSignedIn(true);
    } catch {
      // Authenticator is authoritative for the session state. A temporary
      // attribute-read failure must not mark a still-authenticated session as
      // signed out while an admin page is mounting. The authenticated
      // `authStatus` effect will retry on the next render; only an explicit
      // unauthenticated status is allowed to clear this card and the store.
    }
  }, [store, user]);

  useEffect(() => {
    if (configured && authStatus === "authenticated") {
      // Defer this stateful refresh until after the Authenticator provider has
      // committed its Hub-driven status update.
      const timer = window.setTimeout(() => void refreshSession(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [authStatus, configured, refreshSession]);

  const handleSignedIn = useCallback(async () => {
    await refreshSession();
  }, [refreshSession]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSessionAccount(null);
      getStoreDispatch(store).clearAccount();
      getStoreDispatch(store).setSignedIn(false);
      setSigningOut(false);
    }
  }, [store]);

  if (!settings || settings.integrateWpLogin) {
    return null;
  }

  // Only the shared Authenticator status decides whether a persisted account
  // is shown. This avoids treating a page remount or a delayed attribute read
  // as a sign-out, while still hiding a stale account after a real sign-out.
  const visibleAccount =
    authStatus === "unauthenticated"
      ? undefined
      : undefined === sessionAccount
      ? account
      : sessionAccount;
  const identity = visibleAccount ? sessionIdentity(visibleAccount) : undefined;
  const checking = configured && authStatus === "configuring";

  return (
    <Card withBorder radius="md" padding="lg" mt="xl">
      <Stack gap="sm">
        <Group gap="xs">
          <IconLogin size={20} />
          <Text fw={600}>Cognito session for protected backend APIs</Text>
        </Group>
        <Text size="sm">
          This signs in to this site&apos;s Gatey-configured Cognito user pool.
          It does not connect the WordPress site to a WP Suite workspace and
          does not change the current WordPress administrator session.
        </Text>

        {!configured ? (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="yellow"
            title="Configure and save a user pool first"
          >
            Save a User Pool ID and App Client ID on the User Pools page, then
            reload this settings page. An Identity Pool is only needed when your
            backend requires AWS credentials in addition to a Cognito JWT.
          </Alert>
        ) : identity ? (
          <Alert
            icon={<IconCheck size={16} />}
            color="green"
            title="Signed in to this site's Cognito user pool"
          >
            <Stack gap="sm">
              <Text size="sm">Authenticated as {identity}.</Text>
              <Group>
                <Button
                  type="button"
                  color="red"
                  variant="filled"
                  leftSection={<IconLogout size={16} />}
                  loading={signingOut}
                  onClick={() => void handleSignOut()}
                >
                  Sign out of Cognito
                </Button>
              </Group>
            </Stack>
          </Alert>
        ) : (
          <Group>
            <Button
              type="button"
              leftSection={<IconLogin size={16} />}
              loading={checking}
              onClick={() => setOpened(true)}
            >
              Sign in to configured Cognito user pool
            </Button>
          </Group>
        )}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Sign in to this site's Cognito user pool"
        centered
        size="lg"
      >
        <Text size="sm" mb="md">
          This session authorizes protected AI-Kit, Flow, and other configured
          backend APIs in this browser. It does not sign you in to WordPress or
          to a WP Suite workspace.
        </Text>
        <SignInForm
          settings={settings}
          onSignedIn={handleSignedIn}
          onClose={() => setOpened(false)}
        />
      </Modal>
    </Card>
  );
};

export const CognitoAdminSession = ({ store }: { store: Store }) => (
  <Authenticator.Provider>
    <CognitoAdminSessionContent store={store} />
  </Authenticator.Provider>
);
