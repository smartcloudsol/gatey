<?php
/**
 * Admin class to create settings page and  REST API endpoint to handle parameter updates coming from the settings front-end,
 * and load the settings.
 *
 */

namespace SmartCloud\WPSuite\Gatey;

use TypeError;
use Exception;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use UQI\Cognito\Tokens\CognitoTokenVerifier;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}
require_once GATEY_PATH . 'admin/model.php';
class Admin
{
    private Settings $settings;
    private SiteSettings $siteSettings;
    public function __construct()
    {
        $defaultSettings = new Settings(
            userPoolConfigurations: new UserPoolConfigurations(
                default: new ResourceConfiguration(
                    new AuthConfiguration(new Configuration('', '', '', new LoginWithOAuthConfiguration(new OAuthConfiguration('', array())))),
                    new ApiConfiguration(new RestConfiguration(''))
                ),
                secondary: new ResourceConfiguration(
                    new AuthConfiguration(new Configuration('', '', '', new LoginWithOAuthConfiguration(new OAuthConfiguration('', array())))),
                    new ApiConfiguration(new RestConfiguration(''))
                )
            ),
            mappings: [],
            loginMechanisms: [],
            integrateWpLogin: false,
            cookieExpiration: 43200,
            signInPage: '',
            redirectSignIn: '',
            redirectSignOut: '',
            reCaptchaPublicKey: '',
            customTranslationsUrl: '',
        );
        $defaultSiteSettings = new SiteSettings(
            accountId: '',
            siteId: '',
            lastUpdate: 0,
            subscriber: false,
            siteKey: '',
        );
        try {
            $this->settings = get_option(GATEY_SLUG, $defaultSettings);
            $this->settings->userPoolConfigurations ??= new UserPoolConfigurations(
                default: new ResourceConfiguration(
                    new AuthConfiguration(new Configuration('', '', '', new LoginWithOAuthConfiguration(new OAuthConfiguration('', array())))),
                    new ApiConfiguration(new RestConfiguration(''))
                ),
                secondary: new ResourceConfiguration(
                    new AuthConfiguration(new Configuration('', '', '', new LoginWithOAuthConfiguration(new OAuthConfiguration('', array())))),
                    new ApiConfiguration(new RestConfiguration(''))
                )
            );
            $this->settings->mappings ??= [];
            $this->settings->loginMechanisms ??= [];
            $this->settings->integrateWpLogin ??= false;
            $this->settings->cookieExpiration ??= 43200;
            $this->settings->signInPage ??= '';
            $this->settings->redirectSignIn ??= '';
            $this->settings->redirectSignOut ??= '';
            $this->settings->reCaptchaPublicKey ??= '';
            $this->settings->customTranslationsUrl ??= '';
            $this->siteSettings = get_option(GATEY_SLUG . '/site-settings', $defaultSiteSettings);
            $this->siteSettings->accountId ??= '';
            $this->siteSettings->siteId ??= '';
            $this->siteSettings->lastUpdate ??= 0;
            $this->siteSettings->subscriber ??= false;
            $this->siteSettings->siteKey ??= '';
        } catch (TypeError | Exception $e) {
            $this->settings = $defaultSettings;
            $this->siteSettings = $defaultSiteSettings;
        }
        $this->registerRestRoutes();
        add_filter('auth_cookie_expiration', array($this, 'setAuthCookieExpiration'), 10, 3);
    }
    public function getSettings(): Settings
    {
        return $this->settings;
    }

    public function getSiteSettings(): SiteSettings
    {
        return $this->siteSettings;
    }

    function addMenu()
    {
        $icon_url = 'data:image/svg+xml;base64,PHN2ZwogICAgd2lkdGg9IjIwcHgiCiAgICBoZWlnaHQ9IjIwcHgiCiAgICB2aWV3Qm94PSIwIDAgNDggNDgiCiAgICB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCglmaWxsPSIjYTdhYWFkIgogID4KICAgIDx0aXRsZT5BdXRoZW50aWNhdG9yPC90aXRsZT4KICAgIDxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPgogICAgICA8ZyBpZD0iYXV0aGVudGljYXRvciIgZGF0YS1uYW1lPSJpY29ucyBRMiI+CiAgICAgICAgPHBhdGggZD0iTTI0LDJTNiw3LjEsNiw4VjI2LjJjMCw5LjIsMTMuMywxNy4zLDE3LDE5LjVhMS44LDEuOCwwLDAsMCwyLDBjMy44LTIuMSwxNy0xMC4zLDE3LTE5LjVWOEM0Miw3LjEsMjQsMiwyNCwyWm0wLDM5LjZhNTQsNTQsMCwwLDEtOC40LTYuMUEyNS4zLDI1LjMsMCwwLDEsMjQsMzRhMjQuOCwyNC44LDAsMCwxLDguNCwxLjVBNDQuNyw0NC43LDAsMCwxLDI0LDQxLjZaTTM4LDI2LjJjMCwxLjYtLjgsMy43LTIuNiw2LjFBMzAuOSwzMC45LDAsMCwwLDI0LDMwYTMwLDMwLDAsMCwwLTExLjMsMi4zYy0xLjktMi40LTIuNy00LjUtMi43LTYuMVYxMC41YzIuOS0xLjEsOC43LTIuOCwxNC00LjMsNS4zLDEuNSwxMS4xLDMuMywxNCw0LjNaIiAvPgogICAgICAgIDxwYXRoIGQ9Ik0yNCwxNGE0LDQsMCwxLDEtNCw0LDQsNCwwLDAsMSw0LTRtMC00YTgsOCwwLDEsMCw4LDgsOCw4LDAsMCwwLTgtOFoiIC8+CiAgICAgIDwvZz4KICAgIDwvZz4KICA8L3N2Zz4=';
        add_menu_page(
            __('Gatey', 'gatey'),
            __('Gatey', 'gatey'),
            'manage_options',
            GATEY_SLUG,
            null,
            $icon_url,
        );

        $generate_suffix = add_submenu_page(
            GATEY_SLUG,
            __('Settings', 'gatey'),
            __('Settings', 'gatey'),
            'manage_options',
            GATEY_SLUG,
            array($this, 'renderCognitoSettingsPage'),
        );

        add_submenu_page(
            GATEY_SLUG,
            __('Patterns', 'gatey'),
            __('Patterns', 'gatey'),
            'edit_posts',
            admin_url('edit.php?post_type=wp_block&s=gatey'),
        );

        add_action("admin_print_scripts-{$generate_suffix}", array($this, 'addScripts'));

        add_filter('parent_file', array($this, 'highlightMenu'));
        add_filter('submenu_file', array($this, 'highlightSubmenu'));

        add_filter('manage_edit-wp_block_columns', array($this, 'addShortcodeColumn'), 20);
        add_action('manage_wp_block_posts_custom_column', array($this, 'renderShortcodeColumn'), 10, 2);
        add_action('admin_enqueue_scripts', array($this, 'copyShortcode'));
    }

    function addShortcodeColumn($columns)
    {
        $columns['wpc_shortcode'] = __('Shortcode', 'gatey');
        return $columns;
    }

    function renderShortcodeColumn($column, $post_id)
    {
        if ('wpc_shortcode' !== $column) {
            return;
        }

        $shortcode = sprintf('[gatey id="%d"]', $post_id);

        printf(
            '<span class="wpc-shortcode" id="wpc-sc-%1$d"><code>%2$s</code></span>
            <div class="row-actions">
                <span class="copy">
                    <a href="#" class="wpc-copy" data-target="wpc-sc-%1$d">Copy</a>
                </span>
            </div>',
            (int) $post_id,
            esc_html($shortcode),
            esc_html__('Copy', 'gatey')
        );
    }

    function copyShortcode($hook)
    {

        // Csak a „Blokkok” (wp_block) listán van rá szükség
        $screen = get_current_screen();
        if ('edit.php' !== $hook || 'wp_block' !== $screen->post_type) {
            return;
        }

        wp_add_inline_script(
            'jquery-core',
            "
            (function($){
                function copyText( text, onSuccess, onFail ) {
    
                    if ( navigator.clipboard && window.isSecureContext ) {
                        navigator.clipboard.writeText( text )
                            .then( onSuccess )
                            .catch( function(){ legacyCopy( text, onSuccess, onFail ); } );
                        return;
                    }
    
                    legacyCopy( text, onSuccess, onFail );
                }
    
                function legacyCopy( text, onSuccess, onFail ) {
                    var \$tmp = $('<textarea readonly>')
                        .css({position:'absolute',left:'-9999px',top:0,opacity:0})
                        .val( text )
                        .appendTo('body')
                        .select();
    
                    try {
                        if ( document.execCommand('copy') ) {
                            onSuccess();
                            \$tmp.remove();
                            return;
                        }
                    } catch(e) {}
    
                    \$tmp.remove();
                    onFail();
                }
    
                $(document).on('click', '.wpc-copy', function(e){
                    e.preventDefault();
    
                    var \$btn   = $(this),
                        orig   = \$btn.text(),
                        text   = $('#' + \$btn.data('target')).text();
    
                    function showOk(){
                        \$btn.text( '" . esc_js(__('Copied!', 'gatey')) . "' );
                        setTimeout( function(){ \$btn.text( orig ); }, 1500 );
                    }
                    function showFail(){
                        window.prompt( '" . esc_js(__('Copy manually (Ctrl+C):', 'gatey')) . "', text );
                    }
    
                    copyText( text, showOk, showFail );
                });
            })(jQuery);
            "
        );
    }
    function highlightMenu($parent_file)
    {
        if (get_query_var('post_type') == 'wp_block' && get_query_var('s') == 'gatey') {
            return GATEY_SLUG;
        }
        return $parent_file;
    }

    function highlightSubmenu($submenu_file)
    {
        if (get_query_var('post_type') == 'wp_block' && get_query_var('s') == 'gatey') {
            return admin_url("edit.php?post_type=wp_block&s=gatey");
        }
        return $submenu_file;
    }

    function addScripts()
    {
        $screen = get_current_screen();
        /*
        $options = Options::reinstance();
        */
        $script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'gatey-admin/dist/index.asset.php')) {
            $script_asset = require_once(GATEY_PATH . 'gatey-admin/dist/index.asset.php');
        }
        wp_enqueue_script('gatey-admin-script', GATEY_URL . 'gatey-admin/dist/index.js', $script_asset['dependencies'], GATEY_VERSION, true);

        // Make the blocks translatable.
        if (function_exists('wp_set_script_translations')) {
            wp_set_script_translations('gatey-admin-script', 'gatey', GATEY_PATH . '/languages');
        }

        wp_enqueue_style('gatey-admin-style', GATEY_URL . 'gatey-admin/dist/index.css', array('wp-components'), GATEY_VERSION);
    }

    function renderCognitoSettingsPage()
    {
        echo '<div id="gatey-admin"></div>';
    }

    function registerRestRoutes()
    {
        if (!class_exists('WP_REST_Controller')) {
            return;
        }

        add_action('rest_api_init', array($this, 'initRestApi'));
    }

    function initRestApi()
    {
        register_rest_route(
            GATEY_SLUG . '/v1',
            '/login',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'login'),
                'permission_callback' => '__return_true',
            )
        );
        register_rest_route(
            GATEY_SLUG . '/v1',
            '/logout',
            array(
                'methods' => 'GET',
                'callback' => array($this, 'logout'),
                'permission_callback' => '__return_true',
            )
        );
        register_rest_route(
            GATEY_SLUG . '/v1',
            '/get-roles',
            array(
                'methods' => 'GET',
                'callback' => array($this, 'getRoles'),
                'permission_callback' => function () {
                    if (!current_user_can('manage_options')) {
                        return new WP_Error('rest_forbidden', esc_html__('Forbidden', 'gatey'), array('status' => 403));
                    }
                    return true;
                },
            )
        );
        register_rest_route(
            GATEY_SLUG . '/v1',
            '/update-settings',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'updateSettings'),
                'permission_callback' => function () {
                    if (!current_user_can('manage_options')) {
                        return new WP_Error('rest_forbidden', esc_html__('Forbidden', 'gatey'), array('status' => 403));
                    }
                    return true;
                },
            )
        );
        register_rest_route(
            GATEY_SLUG . '/v1',
            '/update-site-settings',
            array(
                'methods' => 'POST',
                'callback' => array($this, 'updateSiteSettings'),
                'permission_callback' => function () {
                    if (!current_user_can('manage_options')) {
                        return new WP_Error('rest_forbidden', esc_html__('Forbidden', 'gatey'), array('status' => 403));
                    }
                    return true;
                },
            )
        );
    }

    function login(WP_REST_Request $request)
    {
        $data = $request->get_body_params();
        if (wp_get_current_user()->has_prop('user_email') && wp_get_current_user()->get('user_email') == $data['email']) {
            //return new WP_REST_Response(array('success' => true, 'message' => __('Already logged in.', 'gatey')), 200);
        }

        $region = $this->settings->userPoolConfigurations->default->API->GraphQL->region;
        $poolId = $this->settings->userPoolConfigurations->default->Auth->Cognito->userPoolId;
        $clientId = $this->settings->userPoolConfigurations->default->Auth->Cognito->userPoolClientId;
        $token = $request->get_header('Authorization');
        if (
            strpos($token, 'Bearer ')
            !== 0
        ) {
            return new WP_REST_Response(array('success' => false, 'message' => __('Invalid token.', 'gatey')), 401);
        }
        $token = substr($token, 7);

        $verifier = new CognitoTokenVerifier(
            $region,
            $poolId,
            $clientId
        );
        try {
            $t = $verifier->verifyIdToken($token);
        } catch (Exception $e) {
            return new WP_REST_Response(array('success' => false, 'message' => __('Invalid token.', 'gatey')), 401);
        }

        // Check if the $clientId is the same as the one in the token ($t['aud']) and the $poolId is the same as the one in the token ($t['iss'])
        if ($clientId != $t['aud'] || "https://cognito-idp.$region.amazonaws.com/$poolId" != $t['iss']) {
            return new WP_REST_Response(array('success' => false, 'message' => __('Invalid token.', 'gatey')), 401);
        }
        $updated = false;
        $user = array_key_exists('email', $t) ? get_user_by('email', $t['email']) : get_user_by('login', $t['cognito:username']);
        if (!$user) {
            $userdata = array(
                'user_login' => $t['cognito:username'],
                'user_pass' => /*$data['password'] ? $data['password'] : */ wp_generate_password(),
                'user_email' => array_key_exists('email', $t) ? $t['email'] : null,
                'first_name' => array_key_exists('given_name', $t) ? $t['given_name'] : null,
                'last_name' => array_key_exists('family_name', $t) ? $t['family_name'] : null,
                'nickname' => array_key_exists('preferred_username', $t) ? $t['preferred_username'] : null,
            );
            $user_id = wp_insert_user($userdata);
            if (is_wp_error($user_id)) {
                $user = get_user_by('email', $t['email']);
            } else {
                $user = get_user_by('id', $user_id);
            }
        } else if (
            (array_key_exists('email', $t) && $user->user_email != $t['email']) ||
            (array_key_exists('given_name', $t) && $user->first_name != $t['given_name']) ||
            (array_key_exists('family_name', $t) && $user->last_name != $t['family_name']) ||
            (array_key_exists('preferred_username', $t) && $user->nickname != $t['preferred_username'])
        ) {
            $user->user_email = array_key_exists('email', $t) ? $t['email'] : null;
            $user->first_name = array_key_exists('given_name', $t) ? $t['given_name'] : null;
            $user->last_name = array_key_exists('family_name', $t) ? $t['family_name'] : null;
            $user->nickname = array_key_exists('preferred_username', $t) ? $t['preferred_username'] : null;
            $updated = true;
        }

        if (!empty($this->settings->mappings)) {
            // get new roles from cognito groups, and remove all the other roles, than add the new ones and update the user
            $roles_by_cognito_groups = array_map(function ($mapping) {
                return $mapping->wordpressRole;
            }, $this->settings->mappings);
            $diff = array_diff($user->roles, $roles_by_cognito_groups);
            if (!empty($diff)) {
                foreach ($diff as $role) {
                    $user->remove_role($role);
                }
                $updated = true;
            }
        }
        if ($t['cognito:groups']) {
            // if $this->settings->mappings empty, than if the cognito groups contains admin, add the user to the administrator role, otherwise to the subscriber role
            if (empty($this->settings->mappings)) {
                if (!empty($diff)) {
                    if (in_array('admin', $t['cognito:groups'])) {
                        $user->add_role('administrator');
                    } else {
                        $user->add_role('subscriber');
                    }
                    $updated = true;
                }
            } else {
                foreach ($this->settings->mappings as $mapping) {
                    if (in_array($mapping->cognitoGroup, $t['cognito:groups']) && !in_array($mapping->wordpressRole, $user->roles)) {
                        $user->add_role($mapping->wordpressRole);
                        $updated = true;
                    } else if (!in_array($mapping->cognitoGroup, $t['cognito:groups']) && in_array($mapping->wordpressRole, $user->roles)) {
                        $user->remove_role($mapping->wordpressRole);
                        $updated = true;
                    }
                }
            }
        }
        if (empty($user->roles)) {
            $user->set_role('subscriber');
            $updated = true;
        }
        if ($updated) {
            $user_id = wp_update_user($user);
            if (!is_wp_error($user_id)) {
                $user = get_user_by('id', $user_id);
            }
        }

        if (in_array('administrator', $user->roles)) {
            $next_url = admin_url();
        } else {
            $next_url = home_url();
        }

        wp_set_current_user($user->ID, $user->user_login);
        wp_set_auth_cookie($user->ID, true);
        do_action('wp_login', $user->user_login, $user);
        return new WP_REST_Response(array('success' => true, 'message' => __('Logged in.', 'gatey'), 'redirect' => $next_url), 200);
    }

    function logout(WP_REST_Request $request)
    {
        $user = wp_get_current_user();
        if ($user && is_array($user->roles) && sizeof($user->roles) > 0 && in_array($user->roles[0], array('administrator'))) {
            $next_url = admin_url();
        } else {
            $next_url = home_url();
        }
        wp_logout();
        return new WP_REST_Response(array('success' => true, 'message' => __('Logged out.', 'gatey'), 'redirect' => $next_url), 200);
    }
    function getRoles(WP_REST_Request $request)
    {
        global $wp_roles;
        return new WP_REST_Response(array_keys(array_map(array($this, 'getRoleName'), $wp_roles->roles)), 200);
    }
    function getRoleName($role)
    {
        return $role['name'];
    }
    function updateSettings(WP_REST_Request $request)
    {
        $settings_param = json_decode($request->get_body());

        $this->settings = new Settings(
            new UserPoolConfigurations(
                new ResourceConfiguration(
                    new AuthConfiguration(
                        new Configuration(
                            $settings_param?->userPoolConfigurations?->default?->Auth?->Cognito?->userPoolId,
                            $settings_param?->userPoolConfigurations?->default?->Auth?->Cognito?->identityPoolId,
                            $settings_param?->userPoolConfigurations?->default?->Auth?->Cognito?->userPoolClientId,
                            new LoginWithOAuthConfiguration(
                                new OAuthConfiguration(
                                    $settings_param?->userPoolConfigurations?->default?->Auth?->Cognito?->loginWith?->oauth?->domain,
                                    $settings_param?->userPoolConfigurations?->default?->Auth?->Cognito?->loginWith?->oauth?->scopes
                                )
                            )
                        )
                    ),
                    new ApiConfiguration(
                        new RestConfiguration(
                            $settings_param?->userPoolConfigurations?->default?->API?->GraphQL?->region,
                        ),
                    ),
                ),
                new ResourceConfiguration(
                    new AuthConfiguration(
                        new Configuration(
                            $settings_param?->userPoolConfigurations?->secondary?->Auth?->Cognito?->userPoolId,
                            $settings_param?->userPoolConfigurations?->secondary?->Auth?->Cognito?->identityPoolId,
                            $settings_param?->userPoolConfigurations?->secondary?->Auth?->Cognito?->userPoolClientId,
                            new LoginWithOAuthConfiguration(
                                new OAuthConfiguration(
                                    $settings_param?->userPoolConfigurations?->secondary?->Auth?->Cognito?->loginWith?->oauth?->domain,
                                    $settings_param?->userPoolConfigurations?->secondary?->Auth?->Cognito?->loginWith?->oauth?->scopes
                                )
                            )
                        )
                    ),
                    new ApiConfiguration(
                        new RestConfiguration(
                            $settings_param?->userPoolConfigurations?->secondary?->API?->GraphQL?->region,
                        ),
                    ),
                ),
            ),
            $settings_param?->mappings,
            $settings_param->loginMechanisms ?? [],
            $settings_param->integrateWpLogin ?? false,
            isset($settings_param?->cookieExpiration) && $settings_param->cookieExpiration > 0 ? $settings_param->cookieExpiration : 43200,
            $settings_param->signInPage ?? "",
            $settings_param->redirectSignIn ?? "",
            $settings_param->redirectSignOut ?? "",
            $settings_param->reCaptchaPublicKey ?? "",
            $settings_param->customTranslationsUrl ?? "",
        );

        // Frissített beállítások mentése
        update_option(GATEY_SLUG, $this->settings);
        return new WP_REST_Response(array('success' => true, 'message' => __('Settings updated successfully.', 'gatey')), 200);
    }

    function updateSiteSettings(WP_REST_Request $request)
    {
        $settings_param = json_decode($request->get_body());

        if ($settings_param->accountId) {
            $this->siteSettings = new SiteSettings(
                $settings_param->accountId,
                $settings_param->siteId,
                $settings_param->lastUpdate,
                $settings_param->subscriber,
                $settings_param->siteKey
            );

            update_option(GATEY_SLUG . '/site-settings', $this->siteSettings);
        } else {
            $this->siteSettings = new SiteSettings(
                accountId: '',
                siteId: '',
                lastUpdate: 0,
                subscriber: false,
                siteKey: '',
            );
            delete_option(GATEY_SLUG . '/site-settings');
        }

        if ($settings_param->subscriber) {
            $this->reloadConfig(
                $settings_param->accountId,
                $settings_param->siteId,
                $settings_param->siteKey
            );
        } else {
            $this->deleteConfig();
        }

        return new WP_REST_Response(array('success' => true, 'message' => __('Site settings updated successfully.', 'gatey')), 200);
    }

    function reloadConfig($accountId, $siteId, $siteKey)
    {
        $api_base = 'https://api.wpsuite.io';

        // Ha a WordPress-URL tartalmazza a dev-domaint, akkor /dev-et fűzünk hozzá
        if (strpos(get_site_url(), 'dev.wpsuite.io') !== false) {
            $api_base .= '/dev';
        }

        $endpoint = sprintf(
            '%s/account/%s/site/%s/license',
            $api_base,
            $accountId,
            $siteId
        );

        $args = [
            'headers' => [
                'Accept' => 'application/json',
                'X-Site-Key' => $siteKey,
            ],
            'timeout' => 10,
        ];

        $response = wp_remote_get($endpoint, $args);

        if (!is_wp_error($response)) {
            $status = wp_remote_retrieve_response_code($response);
            if (200 === $status) {
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);
                if (is_array($data) && isset($data['config'], $data['jws'])) {
                    $upload_dir_info = wp_upload_dir();
                    $base_dir = trailingslashit($upload_dir_info['basedir']);
                    $plugin_subdir = trailingslashit($base_dir . GATEY_SLUG);

                    wp_mkdir_p($plugin_subdir);

                    $config_path = $plugin_subdir . 'config.enc';
                    $jws_path = $plugin_subdir . 'lic.jws';

                    // Biztonságosabb fájl-írás WP_Filesystem-mel, de röviden:
                    file_put_contents($config_path, sanitize_text_field($data['config']));
                    file_put_contents($jws_path, sanitize_text_field($data['jws']));

                    update_option(GATEY_SLUG . '/license-last-refresh', time());
                }
            }
        }
    }

    function deleteConfig()
    {
        $upload_dir_info = wp_upload_dir();
        $base_dir = trailingslashit($upload_dir_info['basedir']);
        $plugin_subdir = trailingslashit($base_dir . GATEY_SLUG);

        $config_path = $plugin_subdir . 'config.enc';
        $jws_path = $plugin_subdir . 'lic.jws';

        if (file_exists($config_path)) {
            unlink($config_path);
        }
        if (file_exists($jws_path)) {
            unlink($jws_path);
        }
    }

    function setAuthCookieExpiration($length, $user_id, $remember)
    {
        return $this->settings->cookieExpiration;
    }

}