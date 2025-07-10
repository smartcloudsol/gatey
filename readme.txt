=== Gatey - Login & SSO with Amazon Cognito ===
Contributors: smartcloud
Tags: cognito, login, user management, mfa, sso
Requires at least: 6.7
Tested up to: 6.8
Requires PHP: 8.1
Stable tag: 1.4.1
License: MIT
License URI: https://mit-license.org/
Text Domain: gatey

Drag-and-drop Amazon Cognito integration for WordPress: 22-language Authenticator screens, SSO, MFA, secure API access, and more—in minutes.

== Description ==

Gatey provides a seamless integration with Amazon Cognito for secure, scalable authentication in WordPress. This plugin supports both dynamic WordPress sites and statically generated WordPress frontends.

Key features include:
  - Amazon Cognito user pool **login** and **registration**
  - Fully translatable Authenticator screens — **22 built-in languages** plus a custom-JSON option for overriding any string or **adding new languages**
  - **SSO support** with customizable pages
  - **Gutenberg block** and Elementor **shortcode** support
  - Multi-factor authentication (**MFA**)
  - **Profile editing** and **password reset** features
  - Secure API access with **JWT** or **AWS IAM** Signature authorization
  - Role-based access control

You can find the plugin’s continuously expanding, detailed documentation at:

[WP Suite – Gatey Docs](https://wpsuite.io/gatey/docs/)

What’s on the site?
  - Get Started guide — quick start, installation, first‑time setup.
  - CSS/JS references — components, API, usage examples.
  - Creating User Pools — step‑by‑step instructions with AWS CloudFormation / CDK scripts.
  - Protecting static sites — full tutorial with point‑by‑point walkthroughs and AWS scripts.

This plugin is not affiliated with or endorsed by Amazon Web Services or the WordPress Foundation. All trademarks are property of their respective owners.

== Free and Premium Usage Notice ==

Gatey works entirely offline and provides full login and registration functionality via your WordPress installation without requiring any registration or subscription.

Optional premium features (like advanced customization or frontend integrations) are only available after connecting your WordPress instance via a secure frontend-only JavaScript authenticator to our Gatey service. Registration and subscription are not required to use the core plugin functionality. All premium interactions happen client-side using standard AWS Amplify and Stripe components – no external PHP code is loaded or executed.

== Installation ==

Upload the plugin files to the /wp-content/plugins/gatey directory, or install via the WordPress plugin repository.

Activate the plugin through the “Plugins” screen in WordPress.

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

= Where are the subscription-based configuration files stored, and how often are they refreshed? =
All Pro settings you create in the Gatey Settings—API Settings, custom Form Fields—are saved server-side and, whenever you hit Save, an encrypted copy is written to your site’s wp-content/uploads/ folder.
The small licence file needed to decrypt that config are also stored in uploads. A licence is valid for one month, so the plugin automatically downloads a fresh file every seven days while your subscription is active. 
If you run a static export, you’ll still need that weekly refresh (a short tutorial covers this topic), but a normal WordPress install handles it for you automatically.

= Can I cancel or upgrade later? =
Yes, at any time. The plugin will still work in Free mode, and your site’s blocks won’t break — only premium features will deactivate.

== Screenshots ==

Drag‑and‑drop Sign‑in block in the Gutenberg editor

Drag-and-drop **Sign-in** block in the Gutenberg editor (Arabic, RTL view)

Account attribute shown for a logged‑in user

User profile form with attribute editing

Custom Sign‑up screen overridden with Custom Blocks and Form Fields

Custom Sign‑up form rendered on a live page

Custom Setup TOTP device form rendered on a live page

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

= 1.4.1 =
Added a **Custom CSS** field to the Authenticator block: style any element inside the widget without touching theme files.

= 1.4.0 =
**Live form-builder in Gutenberg** – Sign-Up and Edit-Account screens are now edited directly in the block editor. Drag fields, Rows, Stacks and any other core layout blocks, and see your changes instantly.
Field order, labels, visibility and full page layout are all controlled in one place—no more sidebar lists.

= 1.3.6 =
The reCAPTCHA provider is now enqueued inside the Gutenberg editor whenever a Site Key is set, so the Authenticator block renders correctly during editing.

= 1.3.5 =
Second observer.js patch: fixed a bug that could prevent Gatey Gutenberg blocks from rendering (they stayed invisible but produced no error).

= 1.3.4 =
Patched observer.js: eliminated edge-case errors that could appear in the browser console (rendering was unaffected).

= 1.3.3 =
Improved licence handling: secondary-domain detection and validation logic have been fixed, ensuring licences activate correctly on all mapped domains.

= 1.3.2 =
**Flexible reCAPTCHA options**: In Gatey → Settings → General you can now choose Classic v3 or Enterprise keys, and switch between google.com and the China-friendly recaptcha.net domain.
**Reduced-motion polish**: Additional fixes ensure all editor and front-end animations fully respect the user’s “prefers-reduced-motion” setting (follow-up to 1.2.7).
**Insecure-host compatibility**: All features, including licence validation, now work on plain-HTTP sites lacking the browser Crypto API.

= 1.3.1 =
reCAPTCHA upgrade: Gatey now works exclusively with reCAPTCHA Enterprise (v3) keys.

= 1.3.0 =
Sign-up attributes unlocked: all standard Cognito attributes are now available in the free plan.
Form-field editor moved down to BASIC: customise field order, labels, and validation rules without a PRO licence.
New field type – country: autocomplete selector with the full ISO list, translated in all 22 Gatey languages.
Enhanced phone_number field: country-code picker now uses the same autocomplete component and localisation as the new country field.

= 1.2.7 =
Fixed the **Copy Shortcode** button in **Gatey** › **Patterns** so it now works on sites served over “http://”. Also removed animations from Mantine Select components in the admin UI to prevent tab freezes on Windows when OS-level animations are disabled.

= 1.2.6 =
Added a licence-file download guide to the admin screen, plus three JavaScript helpers—`Gatey.cognito.toSignIn()`, `Gatey.cognito.toSignUp()`, and `Gatey.cognito.toForgotPassword()`—for switching screens inside custom blocks.

= 1.2.5 =
Filled in the last untranslated UI strings and exposed two client-side helpers: `Gatey.cognito.setLanguage()` and `Gatey.cognito.setDirection()` for runtime language or LTR/RTL switching.

= 1.2.4 =
Fixed attribute parsing in the [gatey] shortcode; all parameters now load correctly even in edge-case combinations.

= 1.2.3 =
Small fixes: the shortcode’s direction attribute now accepts auto, and shortcode previews inside the Elementor editor render correctly even when multiple Gatey shortcodes are placed on the same page.

= 1.2.2 =
Added “**Auto (by language)**” to the Direction setting: the Authenticator now switches to RTL for Arabic or Hebrew and stays LTR for all other languages. You can still override this at any time by selecting **LTR** or **RTL** explicitly.

= 1.2.1 =
Added a Custom Translations URL field under Gatey › Settings › General. Point it to a JSON file to override any of the 22 built-in languages—or add completely new languages—without touching the code.

= 1.2.0 =
The front-end Authenticator screens are now fully localised: choose from 22 languages and switch text direction (LTR / RTL) as needed.

= 1.1.2 =
Refined the Settings screen: subscription-management actions now appear only for users who have permission to manage the site’s active plan.

= 1.1.1 =
Added the JavaScript chunks that were accidentally left out of 1.1.0; all blocks and admin screens now load correctly.

= 1.1.0 =
New on-disk configuration system eliminates all front-end config downloads. Config + weekly licence file now live in the WordPress uploads folder (static exports still refresh the licence weekly). Because downloads are gone, **all plans are now flat-priced—there is no longer any “Additional Usage” charge**.
The admin screen makes it clear whether the site is linked to a WPSuite workspace and whose workspace it is. 

= 1.0.5 =
Added new style controls (typography, spacing, colours, etc.) to the Account Attribute block and fixed a configuration-loading bug that could prevent the admin UI from appearing.

= 1.0.4 =
Authenticator block: added optional trigger‑button properties — render a button first, and open the Authenticator only after users click it. Perfect for building lean profile pages (see updated Get Started guide).
Account block: now supports full Gutenberg styling controls — alignment, custom HTML tag, box‑shadow, spacing (margin/padding), min‑height, typography (font‑size, line‑height, text‑align) and color (background & text).

= 1.0.3 =
Bumped the Authenticator block version to invalidate cached frontend assets—ensures the updated view.js is loaded. No functional changes.

= 1.0.2 =
Pro features for an already‑connected site can now be edited even if the WordPress administrator is not logged in to wpsuite.io.
Fixed [gatey] shortcode: the screen, variation, and colormode attributes are now honoured (previously only the pattern defaults were shown).

= 1.0.1 =
Authenticator block: added optional “Signing in”, “Signing out” and “Redirecting” message fields, so you no longer need to listen for gatey‑authenticator events for basic feedback. Defaults are empty.

= 1.0.0 =
Initial release.

== Upgrade Notice ==

= 1.4.1 =
Update to apply per-block Custom CSS to the Authenticator—fine-tune colours, spacing, or hide elements right from the editor.

= 1.4.0 =
Update to design Sign-Up and Edit-Account forms visually inside Gutenberg: reorder fields, add layout rows or stacks, and preview the result in real time.

= 1.3.6 =
Update if the Authenticator block was blank in Gutenberg when reCAPTCHA was enabled; the editor preview now loads as expected.

= 1.3.5 =
Update immediately if you’re on 1.3.4; this patch restores the visual rendering of Gatey blocks that were not appearing in Gutenberg.

= 1.3.4 =
Update to remove stray console warnings; no functional changes, just a cleaner log.

= 1.3.3 =
Update if you use a secondary domain; licences will now validate and refresh properly across every configured domain.

= 1.3.2 =
Update to:
1. Select Classic v3 or Enterprise reCAPTCHA and optionally recaptcha.net.
2. Get smoother reduced-motion behaviour.
3. Use Gatey on non-HTTPS hosts with full licence checks intact.

= 1.3.1 =
After updating, generate a new Site Key in Google Cloud → reCAPTCHA Enterprise and paste it into Gatey → Settings → General → Google reCAPTCHA Enterprise (v3) Site Key. Update any Lambda that verifies the token to read validationData.recaptchaToken; legacy reCAPTCHA keys will no longer work.

= 1.3.0 =
After updating you can add Cognito sign-up attributes on every site, customise form fields starting with the BASIC plan, and use the new country and improved phone fields in any language.

= 1.2.7 =
Update if the shortcode-copy button failed on non-HTTPS sites or if you experienced admin-tab freezes on Windows; both issues are resolved.

= 1.2.6 =
Update to see licence-file instructions in the admin area and to use the new helper functions for seamless Sign-In / Sign-Up / Forgot-Password screen switching in your custom Gatey blocks.

= 1.2.5 =
Update to get complete translations and use the new JavaScript methods to change language or text-direction on the fly.

= 1.2.4 =
Update if you rely on shortcode attributes—screens, button labels, direction, etc. will now be applied exactly as entered.

= 1.2.3 =
Update to use direction="auto" in shortcodes and to see accurate previews for every Gatey shortcode instance inside Elementor.

= 1.2.2 =
Update to get automatic text-direction handling, with the option to force LTR or RTL manually whenever you need.

= 1.2.1 =
After updating, head to Settings › General to supply your own translation-JSON URL and tailor the Authenticator text in any language you need.

= 1.2.0 =
After updating, open the Authenticator block or shortcode attributes to pick your preferred language and direction—no more English-only UI.

= 1.1.2 =
Update to hide subscription controls from non-authorised admins and keep the Settings menu clean.

= 1.1.1 =
This update only restores missing JS assets. Install it to ensure every Gatey block and the admin UI work as expected.

= 1.1.0 =
After updating, config and licence files are stored locally, the admin panel shows clearer linkage details, and pricing is simpler: every plan is pay-once with no extra usage fees.

= 1.0.5 =
This update restores the admin interface and unlocks extra styling options for the Account Attribute block; review the block’s settings to fine-tune its appearance after upgrading.

= 1.0.4 =
New trigger‑button option for the Authenticator block and full Gutenberg style support in the Account block. Update to simplify profile‑page layouts and unlock richer styling options.

= 1.0.3 =
This release only bumps the Authenticator block version to refresh cached view.js assets. No functional changes—safe to update immediately.

= 1.0.2 =
You can now edit Pro feature settings for a connected site without logging in to wpsuite.io. 
The release also fixes the [gatey] shortcode so that screen, variation, and colormode attributes work as expected.

= 1.0.1 =
You can now customise the messages shown while users are signing in, signing out, or being redirected. Leave the new fields blank to keep the previous silent behaviour, or remove any custom JavaScript listeners you added for the corresponding events.

= 1.0.0 =
Initial stable release.

