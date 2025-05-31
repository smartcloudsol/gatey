import { useEffect, useState, useCallback } from "react";
import { Alert, List, ListItem, Stack, Text } from "@mantine/core";
import { IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";

import { type Settings } from "@smart-cloud/gatey-core";
import classes from "./onboarding.module.css";

const LOCAL_STORAGE_KEY = "gatey_onboarding_dismissed";

export const OnboardingBanner = ({ settings }: { settings: Settings }) => {
  const [userPoolOk, setUserPoolOk] = useState(false);
  const [signInPageOk, setSignInPageOk] = useState(false);
  const [wpIntegrationOk, setWpIntegrationOk] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    setVisible(false);
  }, []);

  useEffect(() => {
    setUserPoolOk(
      !!settings.userPoolConfigurations.default.Auth?.Cognito?.userPoolId &&
        !!settings.userPoolConfigurations.default.Auth?.Cognito
          ?.userPoolClientId
    );

    setSignInPageOk(!!settings.loginMechanisms.length && !!settings.signInPage);
    setWpIntegrationOk(settings.integrateWpLogin);
  }, [settings]);

  useEffect(() => {
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    setVisible(!dismissed);
  }, []);

  if (!visible) return null;

  return (
    <Alert
      icon={<IconInfoCircle size={20} />}
      title="First time using Gatey?"
      color="blue"
      withCloseButton
      onClose={handleDismiss}
      radius="xs"
      w="100%"
    >
      <Stack gap="xs">
        <Text size="sm">Follow these quick steps to get started:</Text>
        <List
          size="sm"
          spacing="xs"
          withPadding
          classNames={{
            itemWrapper: classes.listItemWrapper,
            itemIcon: classes.listItemIcon,
          }}
        >
          <ListItem
            icon={
              <IconCircleCheck
                size={14}
                color={userPoolOk ? "green" : "gray"}
              />
            }
            classNames={{
              itemLabel: userPoolOk ? classes.listItemLabelDone : undefined,
            }}
          >
            <strong>Configure your default User Pool</strong> using your AWS
            Cognito details.
          </ListItem>
          <ListItem
            icon={
              <IconCircleCheck
                size={14}
                color={signInPageOk ? "green" : "gray"}
              />
            }
            classNames={{
              itemLabel: signInPageOk ? classes.listItemLabelDone : undefined,
            }}
          >
            <strong>Create a login page</strong> with the <em>Authenticator</em>{" "}
            block in Gutenberg, then go to the <strong>General</strong> tab and
            set login mechanism, sign-in, and redirect pages.
            <br />
            <em>Optional:</em> use a shortcode in any page (Elementor
            supported).
          </ListItem>
          <ListItem
            icon={
              <IconCircleCheck
                size={14}
                color={wpIntegrationOk ? "green" : "gray"}
              />
            }
            classNames={{
              itemLabel: wpIntegrationOk
                ? classes.listItemLabelDone
                : undefined,
            }}
          >
            <em>Optional:</em> Enable WordPress login override in the{" "}
            <strong>WordPress Login</strong> tab.
          </ListItem>
        </List>
        {userPoolOk && signInPageOk ? (
          <Text size="sm" c="green" fw={500}>
            ✅ Great job! You are all set up and ready to go.
          </Text>
        ) : (
          <>
            <Text size="sm" c="orange" fw={500}>
              ⚠️ When all steps are complete, green checkmarks will confirm your
              setup.
            </Text>
            <Text size="sm">
              You can find more details in the{" "}
              <a
                href="https://wpsuite.io/gatey/docs/getting-started/"
                target="_blank"
              >
                Getting Started with Gatey
              </a>{" "}
              guide.
            </Text>
          </>
        )}
      </Stack>
    </Alert>
  );
};
