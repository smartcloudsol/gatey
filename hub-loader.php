<?php

namespace SmartCloud\WPSuite\Hub;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

const GATEY_HUB_VERSION = '2.0.0';

final class GateyHubLoader
{
    private static ?GateyHubLoader $instance = null;

    private string $plugin;

    private string $text_domain;

    /** Hub admin instance */
    private HubAdmin $admin;

    private function __construct($plugin, $text_domain)
    {
        $this->plugin = $plugin;
        $this->text_domain = $text_domain;
        $this->includes();
    }

    /**
     * Access the singleton instance.
     */
    public static function instance($plugin, $text_domain): GateyHubLoader
    {
        return self::$instance ?? (self::$instance = new self($plugin, $text_domain));
    }

    /**
     * Hub init callback
     */
    public function init(): void
    {
        if (!isset($this->admin)) {
            return;
        }
        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'), 10);

        $this->admin->init();
    }

    public function createAdminMenu(): void
    {
        if (!isset($this->admin)) {
            return;
        }
        $icon_url = $this->admin->getIconUrl();
        add_menu_page(
            __('WPSuite.io', 'gatey'),
            __('WPSuite.io', 'gatey'),
            'manage_options',
            WPSUITE_SLUG,
            null,
            $icon_url,
            58,
        );

        $connect_suffix = add_submenu_page(
            WPSUITE_SLUG,
            __('Connect your Site', 'gatey'),
            __('Connect your Site', 'gatey'),
            'manage_options',
            WPSUITE_SLUG,
            array($this->admin, 'renderAdminPage'),
        );

        /*
        $diagnostics_suffix = add_submenu_page(
            WPSUITE_SLUG,
            __('Diagnostics', 'gatey'),
            __('Diagnostics', 'gatey'),
            'manage_options',
            WPSUITE_SLUG . '-diagnostics',
            array($this->admin, 'renderAdminPage'),
        );
        */

        $this->admin->enqueueAdminScripts($connect_suffix /*, $diagnostics_suffix */);
    }

    /**
     * Check configuration and license.
     */
    public function check(): void
    {
        if (!isset($this->admin)) {
            return;
        }
        $this->admin->check();
    }

    private function includes()
    {
        if (!function_exists('is_plugin_active')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        if (!empty($GLOBALS['wpsuitehub_menu_parent']) || is_plugin_active('hub-for-wpsuiteio/hub-for-wpsuiteio.php')) {
            return false;
        }

        // If Hub is not present, try to create a single common top-level menu
        // Mutex: first writer wins on the option
        if (!defined('WPSUITE_SLUG')) {
            define('WPSUITE_SLUG', 'hub-for-wpsuiteio');
        }
        $fallback_parent = WPSUITE_SLUG; // common top-level slug
        $owner_option = WPSUITE_SLUG . '/top-menu-owner';

        $owner = get_option($owner_option); // may be string or false/null
        $owner_version = get_option($owner_option . '/version') ?? "1.0.0";
        $owner_missing = empty($owner);
        $owner_is_me = ($owner === $this->plugin);
        $owner_inactive = ($owner && !is_plugin_active($owner));
        $owner_version_is_smaller = version_compare($owner_version, GATEY_HUB_VERSION) === -1;
        $owner_version_equals = version_compare($owner_version, GATEY_HUB_VERSION) === 0;

        // If there is no owner yet, try to claim it
        if ($owner_missing || $owner_is_me || $owner_inactive || $owner_version_is_smaller) {
            $result = false;
            // add_option atomic: only one can win in case of multiple concurrent requests
            if (empty($GLOBALS['wpsuite_fallback_parent_added'])) {
                $GLOBALS['wpsuite_fallback_parent_added'] = true;
                $result = true;

                define('WPSUITE_VERSION', GATEY_HUB_VERSION);
                define('WPSUITE_PATH', plugin_dir_path(__FILE__) . 'wpsuite-admin/');
                define('WPSUITE_URL', plugin_dir_url(__FILE__) . 'wpsuite-admin/');
                define('WPSUITE_READY_HOOK', WPSUITE_SLUG . '/ready');

                if (file_exists(WPSUITE_PATH . 'index.php')) {
                    require_once WPSUITE_PATH . 'index.php';
                }
                if (class_exists('\SmartCloud\WPSuite\Hub\HubAdmin')) {
                    $this->admin = new HubAdmin();
                }
                if (!$owner_is_me || !$owner_version_equals) {
                    update_option($owner_option, $this->plugin, false);
                    update_option($owner_option . '/version', GATEY_HUB_VERSION, false);
                }
            }
            if (!$owner_is_me && $owner_version_is_smaller) {
                update_option($owner_option, $this->plugin, false);
                update_option($owner_option . '/version', GATEY_HUB_VERSION, false);
            }
            return $result;
        }

        return false;
    }

}