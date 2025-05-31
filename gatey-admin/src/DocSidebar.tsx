import {
  Alert,
  Anchor,
  Code,
  Drawer,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconInfoCircle,
  IconUsersGroup,
  IconCircle,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import classes from "./main.module.css";

const pages = {
  "user-pools": (
    <>
      <Title order={2}>Configuring AWS Cognito</Title>
      <Text>
        This plugin connects your WordPress site to{" "}
        <Anchor href="https://aws.amazon.com/pm/cognito" target="_blank">
          AWS Cognito
        </Anchor>{" "}
        for user authentication. To get started, you'll need to set up resources
        within your AWS account:
      </Text>
      <List size="sm" spacing="xs">
        <List.Item>
          <Anchor
            href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools.html"
            target="_blank"
          >
            Cognito User Pool
          </Anchor>
          : Manages user directories, sign-up, and sign-in.
        </List.Item>
        <List.Item>
          An{" "}
          <Anchor
            href="https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html"
            target="_blank"
          >
            App Client
          </Anchor>{" "}
          within the User Pool: Allows your site (the application) to interact
          with the User Pool.
        </List.Item>
        <List.Item>
          <Anchor
            href="https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html"
            target="_blank"
          >
            Cognito Identity Pool (Optional but Recommended)
          </Anchor>
          : Grants authenticated users temporary AWS credentials to access other
          AWS services if needed.
        </List.Item>
      </List>

      <Title order={3} mt="md">
        Default vs. Secondary User Pools
      </Title>
      <Text>You can configure two separate Cognito User Pool setups:</Text>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <strong>Default User Pool:</strong> This configuration is used when
          users authenticate directly on your WordPress domain. It's the
          standard setup for dynamic WordPress sites. If you also have a static
          export, this pool typically handles the development version served
          from the WordPress backend.
        </List.Item>
        <List.Item>
          <strong>Secondary User Pool:</strong> This is primarily for statically
          exported sites hosted on a <strong>different domain</strong> than your
          WordPress installation. Since Cognito requires precise redirect URIs
          based on the domain, a separate configuration (and potentially a
          separate App Client or even User Pool) is needed for the static site's
          domain.
        </List.Item>
      </List>
      <Text size="sm">
        For a standard dynamic WordPress site, you usually only need to
        configure the Default User Pool.
      </Text>

      <Title order={3} mt="md">
        Configuration Fields Explained
      </Title>
      <Text>
        Enter the details from your AWS Cognito setup into the corresponding
        fields:
      </Text>
      <List type="ordered" size="sm" spacing="sm" mt="xs" withPadding>
        <List.Item id="user-pool-id">
          <Text fw={500}>
            <span className="highlightable">User Pool ID</span>
          </Text>
          The unique identifier for your Cognito User Pool (e.g.,{" "}
          <Code>us-east-1_abcdef123</Code>). Find this on the User Pool overview
          page in the AWS console.
        </List.Item>
        <List.Item id="app-client-id">
          <Text fw={500}>
            <span className="highlightable">App Client ID</span>
          </Text>
          The unique ID for the App Client you created within your User Pool.
          Find this under "App integration" &gt; "App client list" in your User
          Pool settings. Ensure this App Client is configured correctly for your
          website's domain(s) and callback URLs.
        </List.Item>
        <List.Item id="region">
          <Text fw={500}>
            <span className="highlightable">Region</span>
          </Text>
          The AWS region where your User Pool and Identity Pool are located
          (e.g., <Code>us-east-1</Code>, <Code>eu-west-2</Code>).
        </List.Item>
        <List.Item id="identity-pool-id">
          <Text fw={500}>
            <span className="highlightable">Identity Pool ID</span>
          </Text>
          (Optional) The unique identifier for your Cognito Identity Pool (e.g.,{" "}
          <Code>us-east-1:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee</Code>). Required
          if you need to grant users access to other AWS resources.
        </List.Item>
        <List.Item id="oauth-domain">
          <Text fw={500}>
            <span className="highlightable">OAuth Domain</span>
          </Text>
          The full domain used for Cognito's hosted UI and OAuth endpoints. This
          is often in the format{" "}
          <Code>your-domain-prefix.auth.your-region.amazoncognito.com</Code>.
          Find this under "App integration" &gt; "Domain name" in your User Pool
          settings.
        </List.Item>
        <List.Item id="oauth-scopes">
          <Text fw={500}>
            <span className="highlightable">OAuth Scopes</span>
          </Text>
          Space-separated list of{" "}
          <Anchor
            href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html#cognito-user-pools-define-resource-servers-scopes"
            target="_blank"
          >
            OAuth scopes
          </Anchor>{" "}
          your application requests during authentication. Common scopes include{" "}
          <Code>openid</Code>, <Code>email</Code>, <Code>profile</Code>, and{" "}
          <Code>aws.cognito.signin.user.admin</Code>. Ensure these match the
          scopes enabled in your App Client settings under "Hosted UI".
        </List.Item>
      </List>
    </>
  ),
  general: (
    <>
      <Title order={2}>General Settings</Title>
      <Text>
        Configure core authentication behaviors, security measures, and page
        redirects for your users.
      </Text>
      <Title order={3} mt="md" id="login-mechanisms">
        <span className="highlightable">Login Mechanisms</span>
      </Title>
      <Text>
        Choose which identifiers users can use to sign in to their accounts via
        Cognito. Select one or more options:
      </Text>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <strong>Username:</strong> Allow users to sign in with the username
          they chose during registration.
        </List.Item>
        <List.Item>
          <strong>Email:</strong> Allow users to sign in using their verified
          email address.
        </List.Item>
        <List.Item>
          <strong>Phone Number:</strong> Allow users to sign in using their
          verified phone number.
        </List.Item>
      </List>
      <Text size="sm" mt="xs">
        Ensure your Cognito User Pool is configured to support the selected
        mechanisms under "Sign-in options".
      </Text>
      <Title order={3} mt="md">
        reCAPTCHA v3 Integration
      </Title>
      <Text>
        <Anchor href="https://www.google.com/recaptcha/about/" target="_blank">
          Google reCAPTCHA v3
        </Anchor>{" "}
        helps protect your site from spam and abuse by distinguishing between
        human users and automated bots without requiring user interaction (like
        solving puzzles). It analyzes user behavior and returns a score.
      </Text>
      <Text>
        Integrating reCAPTCHA adds a layer of security during user registration,
        to prevent automated sign-ups.
      </Text>
      <List size="sm" spacing="sm" mt="xs">
        <List.Item id="recaptcha-v3-public-key">
          <Text fw={500}>
            <span className="highlightable">Recaptcha V3 Public Key</span>
          </Text>
          If you wish to use reCAPTCHA v3, enter your site's Public Key
          (sometimes called Site Key) here. You can obtain this key by
          registering your site with{" "}
          <Anchor
            href="https://www.google.com/recaptcha/admin/create"
            target="_blank"
          >
            Google reCAPTCHA
          </Anchor>
          . You will also need to configure the corresponding Secret Key within
          your server-side environment or plugin settings (if applicable,
          depends on your plugin's specific handling).
        </List.Item>
      </List>
      <Title order={3} mt="md">
        Page Settings
      </Title>
      <Text>
        Select specific WordPress pages for key parts of the authentication
        flow. This ensures users are directed to the correct locations within
        your site.
      </Text>
      <List size="sm" spacing="sm" mt="xs">
        <List.Item id="sign-in-page">
          <Text fw={500}>
            <span className="highlightable">Sign In Page</span>
          </Text>
          Choose the WordPress page that contains your login form (either via a
          shortcode provided by this plugin or a custom implementation).
          Unauthenticated users attempting to access protected content may be
          redirected here.
        </List.Item>
        <List.Item id="default-redirect-after-signing-in">
          <Text fw={500}>
            <span className="highlightable">
              Default redirect after signing in
            </span>
          </Text>
          Select the default page users should be redirected to immediately
          after a successful login. This is often a user dashboard, profile
          page, or the site homepage.
        </List.Item>
        <List.Item id="default-redirect-after-signing-out">
          <Text fw={500}>
            <span className="highlightable">
              Default redirect after signing out
            </span>
          </Text>
          Select the default page users should be redirected to after they
          explicitly sign out. This is typically the login page or the site
          homepage.
        </List.Item>
      </List>
    </>
  ),
  "wordpress-login": (
    <>
      <Title order={2}>WordPress Login Integration</Title>
      <Text>
        This powerful feature allows you to synchronize user logins between your
        public-facing site (using Cognito) and the underlying WordPress
        instance.
      </Text>
      <Text>
        When enabled, users signing in via Cognito will also be automatically
        logged into the WordPress backend. This means:
      </Text>
      <List size="sm" spacing="xs" withPadding icon={<IconCheck size="1rem" />}>
        <List.Item>
          The WordPress admin bar will appear at the top of the site for
          logged-in users (if their role permits).
        </List.Item>
        <List.Item>
          Users can seamlessly access the WordPress admin area (
          <Code>/wp-admin/</Code>) based on their assigned role without needing
          a separate WordPress login.
        </List.Item>
      </List>
      <Text mt="sm">
        This is particularly useful for site administrators, editors, or any
        user who needs access to both the frontend user experience and backend
        WordPress management features.
      </Text>

      <Title order={3} mt="md">
        Enable Integration
      </Title>
      <List size="sm" spacing="sm" mt="xs">
        <List.Item id="integrate-wordpress-login">
          <Text fw={500}>
            <span className="highlightable">Integrate WordPress Login</span>
          </Text>
          Check this box to activate the synchronization between Cognito logins
          and WordPress user sessions. When checked, the configuration options
          below will become available. Unchecking this disables the feature
          entirely.
        </List.Item>
      </List>

      <Title order={3} mt="md">
        Cookie Expiration
      </Title>
      <List size="sm" spacing="sm" mt="xs">
        <List.Item id="cookie-expiration">
          <Text fw={500}>
            <span className="highlightable">Cookie Expiration (Seconds)</span>
          </Text>
          Enter the duration, in seconds, for which the WordPress authentication
          cookie should remain valid after a user logs in via Cognito. This
          controls how long the user stays logged into the WordPress backend
          portion of their session. For example, <Code>86400</Code> represents
          24 hours. Leave blank or set to <Code>0</Code> to use the WordPress
          default (typically session-based or 2 days, extendable with "Remember
          Me").
        </List.Item>
      </List>

      <Title order={3} mt="md" id="cognito-group-to-wordpress-role-mapping">
        <span className="highlightable">
          Cognito Group to WordPress Role Mapping
        </span>
      </Title>
      <Text>
        To grant appropriate permissions within WordPress, you must map the
        groups users belong to in Cognito to corresponding roles within
        WordPress. When a user logs in, the plugin checks their Cognito group
        memberships and assigns the mapped WordPress role.
      </Text>
      <Alert
        icon={<IconInfoCircle size="1rem" />}
        title="Important Security Note"
        color="yellow"
        radius="xs"
        mt="sm"
        mb="sm"
      >
        Correctly mapping groups to roles is crucial for security. Ensure users
        only receive the minimum necessary WordPress permissions based on their
        Cognito group. Misconfiguration could grant unintended access to
        sensitive areas of your WordPress site.
      </Alert>
      <Text>Use the table in the settings page to define these mappings:</Text>
      <List
        size="sm"
        spacing="xs"
        mt="sm"
        icon={<IconUsersGroup size="1rem" />}
      >
        <List.Item>
          <strong>Cognito Group Name:</strong> Enter the <i>exact</i> name of a
          group defined in your Cognito User Pool. Case sensitivity matters.
        </List.Item>
        <List.Item>
          <strong>WordPress Role:</strong> Select the desired WordPress role
          (e.g., Administrator, Editor, Author, Contributor, Subscriber) from
          the dropdown list that should be assigned to users in the specified
          Cognito group.
        </List.Item>
        <List.Item>
          Add as many rows as needed to cover all relevant Cognito groups that
          should grant WordPress access.
        </List.Item>
      </List>
      <Text size="sm" mt="sm">
        If a user belongs to multiple Cognito groups that are mapped here, the
        role corresponding to the <i>first</i> matching group in this table
        might be applied, or the highest privilege role depending on plugin
        logic (clarify this based on implementation). If a user logs in via
        Cognito but belongs to no mapped groups, they will typically not be
        logged into WordPress or will only get the default subscriber role.
      </Text>
    </>
  ),
  // ─────────────────────────────────────────────────────────────────────────────
  //  Add / replace inside the `pages` object in DocSidebar.tsx
  // ─────────────────────────────────────────────────────────────────────────────

  "api-settings": (
    <>
      <Title order={2} id="api-settings">
        <span className="highlightable">API Settings</span>
      </Title>
      <Text>
        Configure which REST or GraphQL endpoints your front end may call once
        the user is authenticated, and register optional hooks that fire
        immediately after <em>sign-in</em> or <em>sign-out</em>.
      </Text>

      {/* ── API definitions ─────────────────────────────────────────────── */}
      <Title order={3} mt="md" id="api-definitaions">
        <span className="highlightable">API definitions</span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item id="api-name">
          <Text fw={500}>
            <span className="highlightable">Name</span>
          </Text>
          Internal key you’ll use in&nbsp;
          <Code>Gatey.cognito.get(&#123;apiName:"name", …&#125;)</Code>.
        </List.Item>

        <List.Item id="api-endpoint">
          <Text fw={500}>
            <span className="highlightable">Endpoint</span>
          </Text>
          Base URL such as&nbsp;
          <Code>https://api.example.com</Code> or&nbsp;
          <Code>https://xyz.execute-api.us-east-1.amazonaws.com/prod</Code>.
        </List.Item>

        <List.Item id="api-authorization">
          <Text fw={500}>
            <span className="highlightable">Authorization</span>
          </Text>
          <Code mr="xs">IAM</Code>, <Code mr="xs">ACCESS_TOKEN</Code>, or&nbsp;
          <Code>ID_TOKEN</Code>. <Code>IAM</Code> uses SigV4; the token options
          send a Cognito&nbsp;JWT in the <code>Authorization</code> header.
        </List.Item>
      </List>

      {/* ── Hooks ────────────────────────────────────────────────────────── */}
      <Title order={3} mt="md" id="api-hooks">
        <span className="highlightable">Sign-in / Sign-out hooks</span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item id="hook-api">
          <Text fw={500}>
            <span className="highlightable">API</span>
          </Text>
          Select one of the API definitions above.
        </List.Item>

        <List.Item id="hook-path">
          <Text fw={500}>
            <span className="highlightable">Path</span>
          </Text>
          Endpoint path, e.g.&nbsp;<Code>/logins</Code>.
        </List.Item>

        <List.Item id="hook-credentials">
          <Text fw={500}>
            <span className="highlightable">With&nbsp;Credentials</span>
          </Text>
          Whether to send cookies / auth headers in browser requests.
        </List.Item>

        <List.Item id="hook-headers">
          <Text fw={500}>
            <span className="highlightable">Headers / Query Params</span>
          </Text>
          Free-form key/value pairs; duplicate keys are flagged in the editor.
        </List.Item>
      </List>
    </>
  ),

  "form-fields": (
    <>
      <Title order={2}>Form Field Editor</Title>
      <Text>
        Customise every field in the <em>Authenticator&nbsp;UI</em> — sign-in,
        sign-up, password reset, MFA, etc. Change order, label, required flag or
        even add custom Cognito attributes.
      </Text>

      {/* ── Social providers ─────────────────────────────────────────────── */}
      <Title order={3} mt="md" id="social-providers">
        <span className="highlightable">Social providers</span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <Text fw={500}>Providers</Text>
          Toggle Google, Facebook, Apple or Amazon buttons (requires
          corresponding Identity Provider in AWS console).
        </List.Item>
      </List>

      {/* ── Sign-up attributes ───────────────────────────────────────────── */}
      <Title order={3} mt="md" id="signup-attributes">
        <span className="highlightable">Sign-up attributes</span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <Text fw={500}>Standard attributes</Text>
          Choose which Cognito attributes are stored at sign-up —
          <Code ml="xs">email</Code>, <Code>phone_number</Code>, etc. These
          fields are rendered automatically by Cognito.
        </List.Item>
      </List>

      {/* ── Per-screen fields ────────────────────────────────────────────── */}
      <Title order={3} mt="md" id="screen-groups">
        <span className="highlightable">Per-screen fields</span>
      </Title>
      <List size="sm" spacing="xs" withPadding>
        <List.Item>
          <Text fw={500}>Screens</Text>
          Each screen (Sign In, Sign Up, Forgot Password…) maintains its own
          field list.
        </List.Item>

        <List.Item id="field-name">
          <Text fw={500}>
            <span className="highlightable">Name</span>
          </Text>
          Cognito attribute key, e.g. <Code>username</Code>,
          <Code ml="xs">preferred_username</Code>,
          <Code ml="xs">confirmation_code</Code>
        </List.Item>

        <List.Item id="field-label">
          <Text fw={500}>
            <span className="highlightable">Label</span>
          </Text>
          Caption shown to the user.
        </List.Item>

        <List.Item id="field-type">
          <Text fw={500}>
            <span className="highlightable">Type</span>
          </Text>
          <List spacing="xs" size="sm" icon={<IconCircle size={12} />}>
            <List.Item>
              <Code>default</Code>&nbsp;– Uses Cognito’s built-in type for the
              selected attribute (e.g.&nbsp;<Code>username</Code> →{" "}
              <Code>text</Code>,<Code>confirm_password</Code> →{" "}
              <Code>password</Code>). For custom attributes it falls back to{" "}
              <Code>text</Code>.
            </List.Item>

            <List.Item>
              <Code>text</Code>&nbsp;– Single-line text input.
            </List.Item>

            <List.Item>
              <Code>password</Code>&nbsp;– Password input (characters hidden).
            </List.Item>

            <List.Item>
              <Code>tel</Code>&nbsp;– Telephone / number-pad input.
            </List.Item>

            <List.Item>
              <Code>checkbox</Code>&nbsp;– Single checkbox (true / false).
            </List.Item>

            <List.Item>
              <Code>radio</Code>&nbsp;– Radio-button group. Define options in
              the&nbsp;
              <em>Options</em> list.
            </List.Item>

            <List.Item>
              <Code>select</Code>&nbsp;– Drop-down list. Define options in
              the&nbsp;
              <em>Options</em> list.
            </List.Item>
          </List>
          <Text size="sm" c="dimmed" mt="sm">
            <strong>Tip:</strong> If you’re unsure, keep the type on&nbsp;
            <Code>default</Code>—Cognito will pick the correct control for
            built-in attributes, and custom fields will appear as plain text
            inputs.
          </Text>{" "}
        </List.Item>

        <List.Item id="field-options">
          <Text fw={500}>
            <span className="highlightable">
              Placeholder / Required / Hidden / Options
            </span>
          </Text>
          Fine-grained UX options per field.
        </List.Item>

        <List.Item id="field-special">
          <Text fw={500}>
            <span className="highlightable">Special types</span>
          </Text>
          <Code mr="xs">phone_number</Code> (dial-code picker),
          <Code ml="xs">QR</Code> (TOTP setup → issuer / username).
        </List.Item>
      </List>

      <Alert
        icon={<IconInfoCircle size="1rem" />}
        title="PRO feature"
        color="yellow"
        radius="xs"
        mt="sm"
      >
        Custom field and screen editing is available in PRO plans. In free mode
        your settings are saved, but the UI falls back to Cognito’s default
        fields.
      </Alert>
    </>
  ),
};

interface DocSidebarProps {
  opened: boolean;
  close: () => void;
  page: keyof typeof pages;
  scrollToId: string;
}

export default function DocSidebar({
  opened,
  close,
  page,
  scrollToId,
}: DocSidebarProps) {
  //const previousOpened = usePrevious(opened);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    //console.log("ENTER useEffect");

    // Clear any pending scroll/highlight operations from previous renders/opens
    if (scrollHighlightTimeoutRef.current) {
      clearTimeout(scrollHighlightTimeoutRef.current);
      scrollHighlightTimeoutRef.current = null;
    }
    // Clear any lingering highlight timeouts
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    // Always remove existing highlights immediately when the effect re-runs or drawer closes
    document
      .querySelectorAll(classes["highlighted-doc-item"])
      .forEach((el) => el.classList.remove(classes["highlighted-doc-item"]));

    // Only proceed if the drawer is currently open and has an ID to scroll to
    if (!opened || !scrollToId) {
      //console.log("EXIT useEffect (drawer closed or no scrollToId)");
      return;
    }

    // Schedule the DOM manipulation to run after the current render cycle
    scrollHighlightTimeoutRef.current = setTimeout(() => {
      //console.log("ENTER setTimeout for scroll/highlight");
      const targetElement = document.getElementById(scrollToId);
      //console.log("targetElement", targetElement);

      if (!targetElement) {
        //console.log("EXIT setTimeout (targetElement not found)");
        scrollHighlightTimeoutRef.current = null;
        return;
      }

      // 3. Scroll to the element
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      //console.log("Scrolled to targetElement");

      // 4. Highlight the element
      const highlightableEl = targetElement.querySelector(".highlightable");
      //console.log("highlightableEl", highlightableEl);

      if (highlightableEl) {
        //console.log("highlightableEl found");

        // Clear previous highlight timeout if any (should be cleared above, but double-check)
        if (highlightTimeoutRef.current) {
          //console.log("clearing existing highlight timeout");
          clearTimeout(highlightTimeoutRef.current);
          highlightTimeoutRef.current = null;
          // Ensure previous highlight is removed immediately
          document
            .querySelectorAll(classes["highlighted-doc-item"])
            .forEach((el) =>
              el.classList.remove(classes["highlighted-doc-item"])
            );
        }

        highlightableEl.classList.add(classes["highlighted-doc-item"]);
        //console.log("added highlighted-doc-item");

        // Remove the highlight after a short duration
        highlightTimeoutRef.current = setTimeout(() => {
          //console.log("removing highlighted-doc-item after delay");
          highlightableEl.classList.remove(classes["highlighted-doc-item"]);
          highlightTimeoutRef.current = null;
        }, 2000); // Highlight for 2 seconds
        //console.log("set highlight removal timeout");
      }
      scrollHighlightTimeoutRef.current = null; // Clear the ref once done
      //console.log("EXIT setTimeout (success)");
    }, 0); // Delay of 0ms pushes execution after the current event loop cycle

    // Cleanup function for the useEffect
    return () => {
      //console.log("CLEANUP useEffect");
      // Clear the main scroll/highlight timeout if the component unmounts or dependencies change
      if (scrollHighlightTimeoutRef.current) {
        //console.log("Clearing scrollHighlightTimeoutRef in cleanup");
        clearTimeout(scrollHighlightTimeoutRef.current);
        scrollHighlightTimeoutRef.current = null;
      }
      // Clear the highlight removal timeout if the component unmounts or dependencies change
      if (highlightTimeoutRef.current) {
        //console.log("Clearing highlightTimeoutRef in cleanup");
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      // Ensure highlights are removed on cleanup as well
      document
        .querySelectorAll(classes["highlighted-doc-item"])
        .forEach((el) => el.classList.remove(classes["highlighted-doc-item"]));
    };
  }, [opened, scrollToId]);

  return (
    <Drawer
      opened={opened}
      onClose={close}
      position="right"
      title="Documentation"
      zIndex={999999}
    >
      <Stack>{pages[page]}</Stack>
    </Drawer>
  );
}
