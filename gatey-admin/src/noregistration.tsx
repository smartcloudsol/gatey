import { useEffect, useState, useCallback } from "react";
import { Alert, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

const LOCAL_STORAGE_KEY = "gatey_noregistration_required_dismissed";

export const NoRegistrationRequiredBanner = () => {
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    setVisible(false);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY);
    setVisible(!dismissed);
  }, []);

  if (!visible) return null;

  return (
    visible && (
      <Alert
        color="green"
        title="No Registration Required"
        icon={<IconInfoCircle />}
        w="100%"
        withCloseButton
        onClose={handleDismiss}
      >
        <Text size="sm" mb="xs">
          <strong>
            All essential features work out of the box without registration.
          </strong>{" "}
          Premium options like frontend customization (available on the BASIC
          plan), advanced forms, and social login become available after
          connecting your site and choosing a plan.
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
    )
  );
};
