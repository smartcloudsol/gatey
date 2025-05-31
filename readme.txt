=== Gatey - Login & SSO with Amazon Cognito ===
Contributors: smartcloud
Tags: cognito, login, user management, mfa, sso
Requires at least: 6.7
Tested up to: 6.8
Requires PHP: 8.2
Stable tag: 1.0.0
License: MIT
License URI: https://mit-license.org/
Text Domain: gatey

Gatey - Login & SSO with Amazon Cognito

== Description ==

Gatey provides a seamless integration with Amazon Cognito for secure, scalable authentication in WordPress. This plugin supports both dynamic WordPress sites and statically generated WordPress frontends.

Key features include:

Amazon Cognito user pool login and registration

SSO support with customizable pages

Gutenberg block and Elementor shortcode support

Multi-factor authentication (MFA)

Profile editing and password reset features

Secure API access with JWT or AWS IAM Signature authorization

Role-based access control

This plugin is not affiliated with or endorsed by Amazon Web Services or the WordPress Foundation. All trademarks are property of their respective owners.

== Free and Premium Usage Notice ==

Gatey works entirely offline and provides full login and registration functionality via your WordPress installation without requiring any registration or subscription.

Optional premium features (like advanced customization or frontend integrations) are only available after connecting your WordPress instance via a secure frontend-only JavaScript authenticator to our Gatey service. Registration and subscription are not required to use the core plugin functionality. All premium interactions happen client-side using standard AWS Amplify and Stripe components – no external PHP code is loaded or executed.

== Installation ==

Upload the plugin files to the /wp-content/plugins/gatey directory, or install via the WordPress plugin repository.

Activate the plugin through the 'Plugins' screen in WordPress.

Navigate to WP Admin > Gatey > Settings to configure your AWS Cognito user pool and integration settings.

== Frequently Asked Questions ==

= What is Gatey? =
Gatey is a WordPress plugin that lets you integrate AWS Cognito authentication into your site — using Gutenberg blocks, shortcodes, or CSS. No coding required.

= Is my user data stored or processed by Gatey? =
No. All authentication runs through your own AWS Cognito setup. Gatey simply integrates it into WordPress. We do not access or store your end‑user data.

= Is my data shared with any third party? =
Gatey never shares your personal data or WordPress site data with any third party. Authentication flows run directly between your site and your AWS Cognito user pool. If you enable premium features, subscription management is handled securely via Stripe using hosted forms and client‑side JavaScript. No payment data is stored or processed by Gatey.

= Do I need AWS or Cognito knowledge to use it? =
Basic AWS Cognito setup is needed (e.g. user pool, app client). But the plugin handles all frontend logic — sign‑in, sign‑up, MFA, attribute access — visually.

= Can I show or hide content based on the logged‑in user? =
Yes. You can use shortcodes or CSS variables like --gatey-account-group-admin or --gatey-account-attribute-email to control visibility.

= Is Gatey compatible with my theme? =
Yes. It works with all WordPress themes and builders like Elementor, using Gutenberg blocks or shortcodes.

= Do I need to register or subscribe to use Gatey? =
No. Gatey works fully offline out of the box and requires no registration or subscription to function. You can configure your AWS Cognito user pool directly inside WordPress and use login, registration, MFA, and profile features without ever connecting to wpsuite.io. Premium features are entirely optional and only become available after connecting your site using secure client‑side JavaScript.

= What’s the difference between plans? =
Free includes all core blocks, but frontend customizations are hidden. Basic shows custom blocks on live pages. Professional unlocks social login, JWT/IAM‑secured APIs, and advanced Gatey control.

= How are configuration downloads counted? =
Each time a user interacts with the plugin on the frontend, a configuration file is loaded from wpsuite.io. This file is cached per user for up to one month. The Free plan loads configuration locally only and has no external limit. Paid plans include usage caps of 100,000 (Basic) or 1,000,000 (Professional) configuration loads per month.

= Can I cancel or upgrade later? =
Yes, at any time. The plugin will still work in Free mode, and your site’s blocks won’t break — only premium features will deactivate.

== Screenshots ==

Drag‑and‑drop Sign‑in block in the Gutenberg editor

Sign‑up block rendered on a live page

Custom Sign-in screen overridden with WordPress blocks

Conditional content shown using shortcode for a logged‑in user

User profile form with attribute editing

Setup MFA device form

Admin settings page showing the Gatey configuration wizard

== External Services ==

This plugin integrates with the following third-party services:

1. **Amazon Cognito**  
   - **What it is & what it’s used for:**  
     A managed user-identity and authentication service from Amazon Web Services (AWS). We use Cognito User Pools to handle user registration, login, multi-factor authentication (MFA), password resets, and JWT issuance.  
   - **What data is sent & when:**  
     - **Registration / Sign-up:** username, email, and any required attributes are sent to Cognito for account creation.  
     - **Sign-in / Authentication:** username and password (and MFA code if enabled) are sent to Cognito for verification.  
     - **Token exchange:** on successful login, Cognito returns ID, access, and refresh tokens which are stored client-side for session management.  
     - **Password reset & profile updates:** relevant identifiers and new credentials or attributes are sent when users trigger those flows.  
   - **Endpoints called:**  
     - `https://cognito-idp.{region}.amazonaws.com/{userPoolId}`  
     - Other AWS API endpoints under the `amazonaws.com` domain.  
   - **Links:**  
     - Terms of Service: https://aws.amazon.com/service-terms/  
     - Privacy Policy: https://aws.amazon.com/privacy/

2. **Google reCAPTCHA v3**  
   - **What it is & what it’s used for:**  
     A client-side bot-detection widget from Google that provides a score for interactions. We integrate reCAPTCHA v3 into the Authenticator block’s sign-up form by fetching a token in the browser.  
   - **What data is sent & when:**  
     - **Client-side only:** the plugin’s JS calls `grecaptcha.execute()` to retrieve a reCAPTCHA token and then includes that token in the sign-up request sent to Amazon Cognito.  
     - **Server-side verification:** only happens if *you* configure a Pre-SignUp Lambda in your Cognito user pool that calls Google’s `siteverify` API with your secret key. That Lambda is wholly under your control—Gatey does *not* handle or store your secret.  
   - **Configuration in WordPress:**  
     - Enter your **reCAPTCHA v3 Site Key** in **Settings → General → reCAPTCHA v3 Public Key**.  
     - No Secret Key is required by the plugin.  
   - **Links:**  
     - About reCAPTCHA v3: https://www.google.com/recaptcha/about/  
     - Google Terms of Service: https://policies.google.com/terms  
     - Google Privacy Policy: https://policies.google.com/privacy

== Client-Side Libraries ==

1. **AWS Amplify Authenticator**  
   - **What it is & why we use it:**  
     A React UI component library from the Amplify Framework. We embed its `<Authenticator>` component inside our Gutenberg block to render and manage the login/signup flows.  
   - **What it does:**  
     - Renders sign-in, sign-up, MFA, and password-reset forms.  
     - Under the hood it calls the Amazon Cognito APIs (see External Services entry), but **does not** itself authenticate or store secrets.  
   - **Docs & source:**  
     - GitHub repo: https://github.com/aws-amplify/amplify-ui  
     - Docs: https://ui.docs.amplify.aws/react/connected-components/authenticator
     
== Trademark Notice ==

Amazon Web Services, AWS, and Amazon Cognito are trademarks of Amazon.com, Inc. or its affiliates.  

Gatey is an independent open-source project and is **not affiliated with, sponsored by, or endorsed by Amazon Web Services**.

All references to “Amazon Cognito” are made purely to describe this plugin’s interoperability.

== Source & Build ==

**Public (free) source code:**  
All of the code that ships in this public ZIP (the “free” version) is published here: https://github.com/smartcloudsol/gatey

**Premium-only features:**
We maintain a fork of the AWS Amplify Authenticator (with Edit Account, Setup TOTP, etc.) and any additional paid-only screens and services in a private repository. Those files are not part of this public source.

== Changelog ==

= 1.0.0 =

Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial stable release.

