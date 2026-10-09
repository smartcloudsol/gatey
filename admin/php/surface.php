<?php
namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/placement-inspection.php';

/** Plugin-owned local setup. Never reads or writes the Pro configuration. */
final class AdminSurface
{
    private static function help(): array
    {
        $topics = array(
            array('sign-in-pool', __('Connect your sign-in service', 'gatey'), __('Use an existing Cognito user pool and a public app client.', 'gatey'), array(__('Copy the user pool identifier from your existing Cognito user pool. Gatey determines the AWS region automatically from the user pool ID. Saving these identifiers does not create resources or verify connectivity.', 'gatey'), __('Use the app client identifier from the same pool. The app client must not have a client secret because visitors sign in from their browser.', 'gatey'), __('This wizard edits only the default pool. Other pools, role mappings and Pro configuration remain unchanged.', 'gatey'))),
            array('identity-pool', __('AWS credentials for backend access', 'gatey'), __('An Identity Pool is optional for sign-in, but required for backend calls that use AWS IAM credentials.', 'gatey'), array(__('A user pool signs users in and issues JWTs. An Identity Pool exchanges a signed-in session for temporary AWS credentials. Configure one when your AI-Kit, Flow or other backend uses IAM authorization; JWT-only APIs do not require it.', 'gatey'), __('Use an existing Identity Pool that trusts this user pool and app client, with roles permitted to call your backend. Saving an ID here does not create that trust or grant permissions. The Identity Pool can be in a different region.', 'gatey'))),
            array('sign-in-method', __('Choose a sign-in identifier', 'gatey'), __('Choose a method supported by your existing Cognito pool.', 'gatey'), array(__('Email, username and phone number describe the identifier visitors enter. The selected method must match your pool and app client configuration; choosing it here does not change the Cognito pool.', 'gatey'), __('Keep current preserves the listed identifiers in their existing order. An empty configuration uses Username by default. These identifiers are separate from password, OTP and passkey authentication methods. WordPress login integration is managed separately in Advanced.', 'gatey'))),
            array('sign-in-page', __('Choose your sign-in page', 'gatey'), __('Select an existing page or enter its path manually.', 'gatey'), array(__('Search by page title, path or page number, then select the result. You can also type a path manually, including a nested path.', 'gatey'), __('The path selects where visitors sign in. Saving it does not insert a sign-in screen: open the page editor and add the Authenticator block or an existing login pattern.', 'gatey'))),
            array('sign-in-registration', __('Registration visibility', 'gatey'), __('Hide the registration option in the sign-in interface.', 'gatey'), array(__('This preference changes whether the interface offers registration. It does not change the Cognito pool’s registration policy; the pool must permit any registration offered to visitors.', 'gatey'))),
            array('wordpress-login', __('WordPress login integration', 'gatey'), __('Choose how administrators sign in to protected backends.', 'gatey'), array(__('WordPress login and a Cognito session are separate. A WordPress administrator session alone does not provide the Cognito JWT or temporary AWS credentials needed by your protected backend.', 'gatey'), __('With WordPress login integration disabled, open Advanced login settings and use Cognito session for protected backend APIs to sign in to the configured user pool. This keeps your current WordPress administrator session.', 'gatey'), __('You can enable WordPress login integration and configure role mappings in the same detailed settings. Integration is optional. This wizard preserves the existing choice and never changes WordPress login behavior.', 'gatey'))),
            array('authenticator-placement', __('Add your sign-in screen', 'gatey'), __('Place the Authenticator block on the selected sign-in page.', 'gatey'), array(__('Open the sign-in page in the WordPress editor and insert Authenticator, or use an existing Gatey login pattern. Configure the block’s authored content and appearance in its block settings.', 'gatey'), __('Detection checks the configured published WordPress page and its published synced patterns. Site templates and other placement methods are not inspected. Cycles, missing patterns and inspection limits produce a partial result.', 'gatey'), __('Preview the page to check its placement. Saving configuration or detecting a block does not verify that visitors can sign in.', 'gatey'))),
            array('account-attribute-placement', __('Show an account attribute', 'gatey'), __('Display information from the currently signed-in account.', 'gatey'), array(__('Insert Account Attribute on a WordPress page. In its block settings, choose a standard account attribute such as email or given name, or select a custom attribute and enter its name.', 'gatey'), __('Choose the display element and any prefix, suffix or link in the block settings. This block displays an existing account value; it does not edit the account.', 'gatey'), __('The published block shows the current signed-in user’s attribute. If no account or value is available, it has no attribute text to show. The editor preview shows the attribute name instead of a visitor’s personal data.', 'gatey'), __('Usage inspection covers at most 200 published pages and posts, including published synced patterns within bounded depth and size. Results are cached for five minutes and invalidated when content changes. Site templates and other placement methods are not included; a partial inspection is not proof of absence.', 'gatey'))),
        );
        return array_map(static fn(array $topic): array => array('id' => $topic[0], 'title' => $topic[1], 'summary' => $topic[2], 'paragraphs' => $topic[3]), $topics);
    }
    private static function existingMethodsLabel(array $methods): string
    {
        if ($methods === array()) { return __('Username (default)', 'gatey'); }
        $labels = array('email' => __('Email', 'gatey'), 'username' => __('Username', 'gatey'), 'phone_number' => __('Phone number', 'gatey'));
        foreach ($methods as $method) {
            if (!is_string($method) || !isset($labels[$method])) { return __('Keep existing advanced configuration', 'gatey'); }
        }
        return sprintf(__('Keep current: %s', 'gatey'), implode(', ', array_map(static fn(string $method): string => $labels[$method], $methods)));
    }

    private static function raw(): mixed { return get_option(GATEY_SLUG, false); }
    private static function revision(mixed $raw): string { return hash('sha256', serialize($raw)); }
    private static function error(string $message, int $status = 400): \WP_Error
    {
        return new \WP_Error('gatey_surface', $message, array('status' => $status));
    }

    public static function read(): array|\WP_Error
    {
        if (!current_user_can('manage_options')) { return self::error(__('Forbidden', 'gatey'), 403); }
        $raw = self::raw();
        $settings = Settings::fromMixed($raw);
        $pool = $settings->userPoolConfigurations->default->Auth->Cognito;
        $configured = $pool->userPoolId !== '' && $pool->userPoolClientId !== '';
        $mechanism = count($settings->loginMechanisms) === 1 && in_array($settings->loginMechanisms[0], array('email', 'username', 'phone_number'), true) ? $settings->loginMechanisms[0] : 'existing';
        $links = array(
            array('label' => __('Advanced login settings', 'gatey'), 'url' => admin_url('admin.php?page=' . GATEY_SLUG . '&section=wordpress-login')),
        );
        return array(
            'schema_version' => 1, 'configured' => $configured, 'can_edit' => true,
            'revision' => self::revision($raw),
            'status' => array('state' => $configured ? 'ready' : 'needs_setup', 'label' => $configured ? __('Login configured', 'gatey') : __('Set up your sign-in connection', 'gatey')),
            'notice' => $settings->integrateWpLogin
                ? __('WordPress login integration is enabled. Protected backends still require a valid Cognito session and the appropriate permissions.', 'gatey')
                : __('WordPress login integration is off. For protected backends, open Advanced login settings and sign in under Cognito session for protected backend APIs. Your WordPress administrator login alone does not provide backend access.', 'gatey'),
            'introduction' => array(
                'title' => __('Getting started with Login & Access', 'gatey'),
                'description' => __('Connect your existing sign-in service, then add a sign-in screen to your site.', 'gatey'),
                'items' => array(
                    array('title' => __('No WP Suite subscription required', 'gatey'), 'description' => __('Basic Cognito sign-in and Gatey blocks work without a WP Suite account. You need an existing Cognito user pool and public app client; AWS service charges may apply.', 'gatey')),
                    array('title' => __('Set up sign-in', 'gatey'), 'description' => __('Use this setup to select your user pool, sign-in identifier and page. Choose a method supported by your pool. Saving the settings does not create AWS resources or test a visitor login.', 'gatey')),
                    array('title' => __('Place the sign-in screen', 'gatey'), 'description' => __('Add Authenticator in the WordPress editor or reuse a Gatey pattern on your sign-in page, then preview and test sign-in. Account Attribute can display information from the signed-in account.', 'gatey')),
                    array('title' => __('Choose how to access your backend', 'gatey'), 'description' => __('WordPress login integration is optional. Without it, open Advanced login settings and sign in under Cognito session for protected backend APIs before using your own protected backend. IAM-based APIs also need an Identity Pool. Rerunning setup preserves integration and role mappings.', 'gatey')),
                ),
            ),
            'help' => self::help(),
            'metrics' => array(
                array('label' => __('WordPress login integration', 'gatey'), 'help_id' => 'wordpress-login', 'value' => $settings->integrateWpLogin ? __('Enabled', 'gatey') : __('Disabled', 'gatey')),
                array('label' => __('Registration', 'gatey'), 'help_id' => 'sign-in-registration', 'value' => $settings->hideSignUp ? __('Hidden', 'gatey') : __('Shown', 'gatey')),
            ),
            'values' => array('userPoolId' => $pool->userPoolId, 'userPoolClientId' => $pool->userPoolClientId, 'identityPoolId' => $pool->identityPoolId, 'loginMechanism' => $mechanism, 'signInPage' => $settings->signInPage, 'hideSignUp' => $settings->hideSignUp),
            'steps' => array(
                array('id' => 'connection', 'title' => __('Connect your sign-in service', 'gatey'), 'help_id' => 'sign-in-pool', 'description' => __('Use an existing Cognito pool; no WP Suite account is required.', 'gatey'), 'fields' => array(
                    array('id' => 'userPoolId', 'label' => __('User pool ID', 'gatey'), 'type' => 'text', 'required' => true, 'help_id' => 'sign-in-pool', 'description' => __('The ID of your existing Cognito user pool. Its AWS region is detected automatically.', 'gatey')),
                    array('id' => 'userPoolClientId', 'label' => __('Public app client ID', 'gatey'), 'type' => 'text', 'required' => true, 'help_id' => 'sign-in-pool', 'description' => __('Use an app client without a client secret.', 'gatey')),
                    array('id' => 'identityPoolId', 'label' => __('Identity pool ID (optional)', 'gatey'), 'type' => 'text', 'help_id' => 'identity-pool', 'description' => __('Required for IAM-based backend access; not needed for basic sign-in or JWT-only APIs.', 'gatey')),
                )),
                array('id' => 'experience', 'title' => __('Choose the sign-in experience', 'gatey'), 'help_id' => 'sign-in-method', 'description' => __('Choose how visitors sign in. WordPress login integration remains unchanged. Without integration, administrators can sign in separately under Advanced login settings → Cognito session for protected backend APIs.', 'gatey'), 'fields' => array(
                    array('id' => 'loginMechanism', 'label' => __('Sign-in identifier', 'gatey'), 'type' => 'select', 'help_id' => 'sign-in-method', 'description' => __('Choose an identifier your Cognito pool supports, or preserve the listed current identifiers.', 'gatey'), 'options' => array(
                        array('value' => 'existing', 'label' => self::existingMethodsLabel($settings->loginMechanisms)),
                        array('value' => 'email', 'label' => __('Email', 'gatey')),
                        array('value' => 'username', 'label' => __('Username', 'gatey')),
                        array('value' => 'phone_number', 'label' => __('Phone number', 'gatey')),
                    )),
                    array('id' => 'signInPage', 'label' => __('Sign-in page path', 'gatey'), 'type' => 'text', 'help_id' => 'sign-in-page', 'suggestions_url' => rest_url('gatey/v1/admin/page-suggestions'), 'description' => __('Search existing pages or enter a path manually.', 'gatey')),
                    array('id' => 'hideSignUp', 'label' => __('Hide registration', 'gatey'), 'type' => 'checkbox', 'help_id' => 'sign-in-registration', 'description' => __('Hide the registration option; the Cognito pool still controls who may register.', 'gatey')),
                )),
            ),
            'actions' => array(), 'links' => $links,
            'use_on_site' => self::useOnSite($settings),
            'runtime_plugin' => 'gatey', 'runtime_fields' => array(
                array('label' => __('Pro API registrations', 'gatey'), 'path' => 'apiConfigurations.default.apis', 'format' => 'count'),
                array('label' => __('Pro custom providers', 'gatey'), 'path' => 'customProviders', 'format' => 'count'),
            ),
        );
    }

    /** Placement guidance and a scoped, read-only check of the selected page. */
    private static function useOnSite(Settings $settings): array
    {
        $links = array();
        $editLink = null;
        $previewLink = null;
        $path = $settings->signInPage;
        $status = __('No sign-in page path selected.', 'gatey');
        if ($path !== '' && self::validPath($path)) {
            $pagePath = trim($path, '/');
            $page = $pagePath === ''
                ? (get_option('show_on_front') === 'page' ? get_post((int) get_option('page_on_front', 0)) : null)
                : get_page_by_path($pagePath, OBJECT, 'page');
            $status = __('Sign-in page:', 'gatey') . ' ' . $path . ' · ';
            if ($page && $page->post_type === 'page' && $page->post_status === 'publish') {
                $previewLink = array('label' => __('Preview sign-in', 'gatey'), 'url' => site_url($path));
                $inspection = PlacementInspection::inspect($page, 'gatey/authenticator');
                $status .= $inspection['detected']
                    ? __('Authenticator block detected on the configured WordPress page', 'gatey')
                    : ($inspection['partial'] ? __('Authenticator inspection incomplete', 'gatey') : __('No Authenticator block detected on the configured WordPress page', 'gatey'));
                if ($inspection['detected'] && $inspection['partial']) { $status .= ' · ' . __('Inspection incomplete', 'gatey'); }
                if (current_user_can('edit_post', $page->ID)) {
                    $editUrl = get_edit_post_link($page->ID, 'raw');
                    if (is_string($editUrl) && $editUrl !== '') {
                        $editLink = array('label' => $inspection['detected'] ? __('Edit sign-in page', 'gatey') : __('Add Authenticator to sign-in page', 'gatey'), 'url' => $editUrl);
                    }
                }
            } else {
                $status .= __('The configured path does not resolve to a published WordPress page that can be inspected automatically.', 'gatey');
            }
        } elseif ($path !== '') {
            $status = __('Review the sign-in page path in Advanced.', 'gatey');
        }
        if ($editLink !== null) {
            $links[] = $editLink;
        } elseif (current_user_can('edit_pages')) {
            $links[] = array('label' => __('Create sign-in page', 'gatey'), 'url' => admin_url('post-new.php?post_type=page'));
        }
        $accountLinks = array();
        $usage = PlacementInspection::accountUsage();
        foreach ($usage['matches'] as $id) {
            if (current_user_can('edit_post', $id)) {
                $editUrl = get_edit_post_link($id, 'raw');
                if (is_string($editUrl) && $editUrl !== '') {
                    $accountLinks[] = array('label' => sprintf(__('Edit account information on %s', 'gatey'), get_page_uri($id)), 'url' => $editUrl);
                    if (count($accountLinks) >= 5) { break; }
                }
            }
        }
        $accountStatus = $usage['matches']
            ? sprintf(__('Account Attribute found in %d inspected published pages or posts', 'gatey'), count($usage['matches']))
            : __('No Account Attribute block found in the inspected published pages or posts', 'gatey');
        if ($usage['partial']) { $accountStatus .= ' · ' . __('Partial inspection', 'gatey'); }
        if (current_user_can('edit_posts')) {
            $links[] = array('label' => __('Manage login patterns', 'gatey'), 'url' => admin_url('edit.php?post_type=wp_block&s=gatey'));
        }
        if ($previewLink !== null) { $links[] = $previewLink; }
        return array(
            'description' => __('Add Gatey blocks in the WordPress page editor.', 'gatey'),
            'items' => array(
                array('id' => 'authenticator', 'title' => __('Sign-in screen', 'gatey'),
                    'description' => __('Insert the Authenticator block in Gutenberg, choose Gatey Authenticator in Elementor, or use [gatey id="123"] with your login pattern ID.', 'gatey'),
                    'help_id' => 'authenticator-placement', 'status' => $status, 'links' => $links),
                array('id' => 'account-attribute', 'title' => __('Account Attribute', 'gatey'),
                    'description' => __('Insert the Account Attribute block in Gutenberg, choose Gatey Account attribute in Elementor, or use [gatey-account attribute="name"] to display a signed-in user attribute.', 'gatey'),
                    'help_id' => 'account-attribute-placement', 'status' => $accountStatus, 'links' => $accountLinks),
            ),
        );
    }

    private static function validPath(string $value): bool
    {
        return $value === '' || (!str_starts_with($value, '//') && !preg_match('/[\\\\\x00-\x20?#:]/', $value));
    }

    public static function save(array $values, string $revision): array|\WP_Error
    {
        if (!current_user_can('manage_options')) { return self::error(__('Forbidden', 'gatey'), 403); }
        $raw = self::raw();
        if (!hash_equals(self::revision($raw), $revision)) { return self::error(__('Settings changed. Reload before saving.', 'gatey'), 409); }
        if (!$values || array_diff(array_keys($values), array('userPoolId', 'userPoolClientId', 'identityPoolId', 'loginMechanism', 'signInPage', 'hideSignUp'))) {
            return self::error(__('Unsupported setting.', 'gatey'));
        }
        foreach ($values as $key => $value) {
            $valid = match ($key) {
                'userPoolId' => is_string($value) && Configuration::regionFromUserPoolId($value) !== '',
                'userPoolClientId' => is_string($value) && preg_match('/^[a-z0-9]{1,128}$/D', $value),
                'identityPoolId' => is_string($value) && ($value === '' || preg_match('/^[a-z]{2}(?:-[a-z0-9]+)+-\d+:[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/D', $value)),
                'loginMechanism' => is_string($value) && in_array($value, array('existing', 'email', 'username', 'phone_number'), true),
                'signInPage' => is_string($value) && strlen($value) <= 512 && self::validPath($value),
                'hideSignUp' => is_bool($value),
                default => false,
            };
            if (!$valid) { return self::error(__('Invalid setting.', 'gatey')); }
        }
        $existing = is_object($raw) ? get_object_vars($raw) : (is_array($raw) ? $raw : array());
        if (array_intersect(array_keys($values), array('userPoolId', 'userPoolClientId', 'identityPoolId'))
            && !empty($existing['userPoolConfigurations'])
            && !($existing['userPoolConfigurations'] instanceof UserPoolConfigurations)) {
            // The legacy normalizer cannot safely hydrate arbitrary pool arrays.
            // Refuse instead of replacing secondary pools with empty defaults.
            return self::error(__('The existing user pool configuration needs review in Advanced before this setup can update it.', 'gatey'), 409);
        }
        // Clone the typed tree, preserving all nested fields and secondary pools.
        $settings = unserialize(serialize(Settings::fromMixed($raw)));
        foreach ($values as $key => $value) {
            if (in_array($key, array('userPoolId', 'userPoolClientId', 'identityPoolId'), true)) {
                $settings->userPoolConfigurations->default->Auth->Cognito->{$key} = $value;
            } elseif ($key === 'loginMechanism') {
                if ($value !== 'existing') { $settings->loginMechanisms = array($value); }
            } else { $settings->{$key} = $value; }
        }
        if (array_intersect(array_keys($values), array('userPoolId', 'userPoolClientId', 'identityPoolId'))) {
            $settings->userPoolConfigurations->default->API->GraphQL->region = Configuration::regionFromUserPoolId($settings->userPoolConfigurations->default->Auth->Cognito->userPoolId);
        }
        // Retain unknown top-level fields for forward-compatible rolling upgrades.
        $updated = is_object($raw) ? clone $raw : (is_array($raw) ? $raw : $settings);
        $changed = array();
        foreach (array_keys($values) as $key) {
            if (in_array($key, array('userPoolId', 'userPoolClientId', 'identityPoolId'), true)) { $changed[] = 'userPoolConfigurations'; }
            elseif ($key === 'loginMechanism') { if ($values[$key] !== 'existing') { $changed[] = 'loginMechanisms'; } }
            else { $changed[] = $key; }
        }
        foreach (array_unique($changed) as $key) {
            if (is_array($updated)) { $updated[$key] = $settings->{$key}; } else { $updated->{$key} = $settings->{$key}; }
        }
        update_option(GATEY_SLUG, $updated);
        return self::read();
    }
}
