<?php
/**
 * Plugin Name:       Gatey - Login & SSO with Amazon Cognito
 * Plugin URI:        https://wpsuite.io/gatey
 * Description:       Easily integrate Amazon Cognito for secure authentication, SSO, and advanced user management in WordPress or static sites generated from WordPress.
 * Requires at least: 6.7
 * Tested up to:      6.8
 * Requires PHP:      8.1
 * Version:           1.3.3
 * Author:            Smart Cloud Solutions Inc.
 * Author URI:        https://smart-cloud-solutions.com
 * License:           MIT
 * License URI:       https://mit-license.org/
 * Text Domain:       gatey
 *
 * @package           gatey
 */

namespace SmartCloud\WPSuite\Gatey;

const VERSION = '1.3.3';

if (!defined('ABSPATH')) {
    exit;
}

if (version_compare(PHP_VERSION, '8.1', '<')) {
    deactivate_plugins(plugin_basename(__FILE__));
    wp_die(
        esc_html__('Gatey requires PHP 8.1 or higher.', 'gatey'),
        esc_html__('Plugin dependency check', 'gatey'),
        array('back_link' => true)
    );
}

/**
 * Main plugin class.
 */
final class Gatey_Plugin
{

    /** Singleton instance */
    private static ?Gatey_Plugin $instance = null;

    /** Admin instance */
    private Admin $admin;

    private function __construct()
    {
        $this->define_constants();
        $this->includes();
    }

    /**
     * Access the singleton instance.
     */
    public static function instance(): Gatey_Plugin
    {
        return self::$instance ?? (self::$instance = new self());
    }

    /**
     * Define required constants.
     */
    private function define_constants(): void
    {
        define('GATEY_VERSION', VERSION);
        define('GATEY_PATH', plugin_dir_path(__FILE__));
        define('GATEY_URL', plugin_dir_url(__FILE__));
        define('GATEY_SLUG', 'gatey');
    }

    /**
     * Include admin classes or additional files.
     */
    private function includes(): void
    {
        // Composer autoloader if shipped.
        if (file_exists(__DIR__ . '/vendor/autoload.php') && !class_exists('\SmartCloud\WPSuite\Gatey\Admin')) {
            require_once __DIR__ . '/vendor/autoload.php';
        }

        // Admin classes (refactored earlier).
        if (file_exists(__DIR__ . '/admin/index.php')) {
            require_once __DIR__ . '/admin/index.php';
        }
        if (class_exists('\SmartCloud\WPSuite\Gatey\Admin')) {
            $this->admin = new \SmartCloud\WPSuite\Gatey\Admin();
        }
    }

    /**
     * Check configuration and license.
     */
    public function check(): void
    {
        $siteSettings = $this->admin->getSiteSettings();
        if ($siteSettings->subscriber) {
            // If the site is a subscriber, we need to check if the configuration and the license exist.

            $lock_key = GATEY_SLUG . '/license-refresh-lock';
            $time_key = GATEY_SLUG . '/license-last-refresh';

            /* ---- 1.  handling race-conditions (5-minute lock) ---- */
            if (get_transient($lock_key)) {
                return;
            }
            set_transient($lock_key, 1, 5 * MINUTE_IN_SECONDS);

            /* ---- 2.  do we need to refresh? ---- */
            $need_refresh = false;

            $upload_dir_info = wp_upload_dir();
            $base_dir = trailingslashit($upload_dir_info['basedir']);
            $plugin_subdir = trailingslashit($base_dir . GATEY_SLUG);
            $config_path = $plugin_subdir . 'config.enc';
            $jws_path = $plugin_subdir . 'lic.jws';
            $exists = file_exists($config_path) && file_exists($jws_path);

            if (!$exists) {
                $need_refresh = true;
            }

            // 2/b) was the last successful refresh more than a week ago?
            $last = (int) get_option($time_key, 0);
            if (time() - $last >= WEEK_IN_SECONDS) {
                $need_refresh = true;
            }

            /* ---- 3.  refresh if we need to ---- */
            if ($need_refresh) {
                $this->admin->reloadConfig(
                    $siteSettings->accountId,
                    $siteSettings->siteId,
                    $siteSettings->siteKey
                );
            }
            /* ---- 4.  unlock ---- */
            delete_transient($lock_key);
        }
    }

    /**
     * Init callback – registers blocks.
     */
    public function init(): void
    {
        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'));

        // Front‑end assets + shortcodes
        add_action('wp_enqueue_scripts', array($this, 'enqueueAssets'));
        add_action('admin_init', array($this, 'enqueueAssets'));
        add_action('elementor/editor/after_enqueue_scripts', array($this, 'enqueueAssets'));

        add_shortcode('gatey', array($this, 'shortcode'));
        add_shortcode('gatey-account', array($this, 'shortcodeAccount'));

        // Register Gutenberg blocks (authenticator etc.)
        if (function_exists('register_block_type')) {
            register_block_type(__DIR__ . '/gatey-blocks/dist/authenticator');
            register_block_type(__DIR__ . '/gatey-blocks/dist/custom-block');
            register_block_type(__DIR__ . '/gatey-blocks/dist/account-attribute');
        }

        // Category for custom blocks.
        add_filter('block_categories_all', array($this, 'register_block_category'), 10, 2);

        if ($this->admin->getSettings()->integrateWpLogin && $this->admin->getSettings()->signInPage) {
            add_filter('login_url', array($this, 'login_page'), 10, 3);
        }
    }

    /**
     * Register custom block category.
     */
    public function register_block_category(array $categories, \WP_Block_Editor_Context $context): array
    {
        $categories[] = array(
            'slug' => 'wpsuite-gatey',
            'title' => __('WPSuite-Gatey', 'gatey'),
            'icon' => null,
        );
        return $categories;
    }

    /**
     * Enqueue inline scripts that expose PHP constants to JS.
     */
    public function enqueueAssets(): void
    {
        // Build data passed to JS.
        $settings = $this->admin->getSettings();
        $siteSettings = $this->admin->getSiteSettings();

        $script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'gatey-main/dist/index.asset.php')) {
            $script_asset = require(GATEY_PATH . 'gatey-main/dist/index.asset.php');
        }
        wp_enqueue_script('gatey-main-script', GATEY_URL . 'gatey-main/dist/index.js', $script_asset['dependencies'], GATEY_VERSION, false);
        wp_enqueue_style('gatey-main-style', GATEY_URL . 'gatey-main/dist/index.css', array('wp-components'), GATEY_VERSION);
        add_editor_style(GATEY_URL . 'gatey-main/dist/index.css');

        $upload_info = wp_upload_dir();
        $data = array(
            'cognito' => array(),
            'restUrl' => rest_url(GATEY_SLUG . '/v1'),
            'uploadUrl' => trailingslashit($upload_info['baseurl']) . GATEY_SLUG . '/',
            'nonce' => wp_create_nonce('wp_rest'),
            'siteSettings' => array(
                'accountId' => $siteSettings->accountId,
                'siteId' => $siteSettings->siteId,
                'lastUpdate' => $siteSettings->lastUpdate,
                'subscriber' => $siteSettings->subscriber,
            ),
            'settings' => $settings,
        );
        if (is_admin()) {
            $data['siteSettings']['siteKey'] = $siteSettings->siteKey;
        }
        $js = 'const Gatey = ' . wp_json_encode($data) . ';';
        if ($settings->integrateWpLogin) {
            $js = $js .
                'Gatey.settings.integrateWpLogin = checkDomain();' .
                'function checkDomain() {' .
                '	return [...window.location.origin].reverse().join("")==="' . strrev(site_url()) . '"' .
                '};';
        }
        wp_add_inline_script('gatey-main-script', $js, 'before');

        wp_add_inline_script(
            'gatey-authenticator-view-script',
            file_get_contents(GATEY_PATH . 'observer.js'),
            'after'
        );
    }

    /**
     * Shortcode handler for [gatey]
     */
    public function shortcode($atts = array(), $content = null): string
    {
        $a = shortcode_atts(
            array(
                'id' => null,
                'screen' => null,
                'variation' => null,
                'colormode' => null,
                'language' => null,
                'direction' => null,
                'showopen' => null,
                'open' => null,
                'signingin' => null,
                'signingout' => null,
                'redirecting' => null,
            ),
            $atts
        );
        $id = $a['id'];

        // bad id
        if (!is_numeric($id)) {
            return '';
        }

        // find the post
        $post = get_post($id);

        if (!$post || !has_block('gatey/authenticator', $post)) {
            // bad post
            return '';
        }

        $blocks = parse_blocks($post->post_content);

        $is_preview = is_admin();
        if (!$is_preview && did_action('elementor/loaded') && class_exists('\Elementor\Plugin')) {
            $plugin = \Elementor\Plugin::$instance;
            if (isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode')) {
                $is_preview = $plugin->preview->is_preview_mode();
            }
        }
        foreach ($blocks as $block) {

            if ('gatey/authenticator' === $block['blockName']) {
                // parsing the block attributes
                $attrs = array(
                    'id' => $id,
                    'screen' => $a['screen'] ?? $block['attrs']['screen'] ?? 'signIn',
                    'variation' => $a['variation'] ?? $block['attrs']['variation'] ?? 'default',
                    'colorMode' => $a['colormode'] ?? $block['attrs']['colorMode'] ?? 'system',
                    'language' => $a['language'] ?? $block['attrs']['language'] ?? 'en',
                    'direction' => $a['direction'] ?? $block['attrs']['direction'] ?? 'auto',
                    'showOpenButton' => $a['showopen'] != false ? $a['showopen'] : ($block['attrs']['showOpenButton'] ?? false),
                    'openButtonTitle' => $a['open'] ?? $block['attrs']['openButtonTitle'] ?? '',
                    'signingInMessage' => $a['signingin'] ?? $block['attrs']['signingInMessage'] ?? '',
                    'signingOutMessage' => $a['signingout'] ?? $block['attrs']['signingOutMessage'] ?? '',
                    'redirectingMessage' => $a['redirecting'] ?? $block['attrs']['redirectingMessage'] ?? '',
                );
                $newBlock = [
                    'blockName' => 'gatey/authenticator',
                    'attrs' => $attrs,
                    'innerBlocks' => $block['innerBlocks'],
                    'innerHTML' => $block['innerHTML'],
                    'innerContent' => $block['innerContent'],
                ];
                $content = render_block($newBlock);
                $content = str_replace("gatey-is-preview", ($is_preview ? 'true' : 'false'), $content);
                return $content;
            }
        }
        return '';
    }

    /**
     * Shortcode handler for [gatey-account]
     */
    public function shortcodeAccount($atts = array(), $content = null): string
    {
        $a = shortcode_atts(
            array(
                'component' => null,
                'attribute' => null,
                'custom' => null,
            ),
            $atts
        );
        $is_preview = is_admin();
        if (!$is_preview && did_action('elementor/loaded') && class_exists('\Elementor\Plugin')) {
            $plugin = \Elementor\Plugin::$instance;
            if (isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode')) {
                $is_preview = $plugin->preview->is_preview_mode();
            }
        }
        $attrs = array(
            'component' => $a['component'] ?? $block['attrs']['component'] ?? 'div',
            'attribute' => $a['attribute'] ?? $block['attrs']['attribute'] ?? 'sub',
            'custom' => $a['custom'] ?? $block['attrs']['custom'] ?? '',
            'colorMode' => $a['colormode'] ?? $block['attrs']['colorMode'] ?? 'system',
            'language' => $a['language'] ?? $block['attrs']['language'] ?? 'en',
            'direction' => $a['direction'] ?? $block['attrs']['direction'] ?? 'auto',
        );
        $newBlock = [
            'blockName' => 'gatey/account-attribute',
            'attrs' => $attrs,
        ];
        $content = render_block($newBlock);
        $content = str_replace("gatey-is-preview", ($is_preview ? 'true' : 'false'), $content);
        return $content;
    }

    /**
     * Filter login URL to optionally point to a Cognito-driven page.
     */
    public function login_page(string $login_url, string $redirect, bool $force_reauth): string
    {
        $settings = $this->admin->getSettings();
        if (!empty($settings->signInPage)) {
            return site_url($settings->signInPage) . ($redirect ? '?redirect_to=' . urlencode($redirect) : '') . ($force_reauth ? '&reauth=1' : '');
        }
        return $login_url;
    }

    /**
     * Add settings page in wp-admin.
     */
    public function createAdminMenu(): void
    {
        $this->admin->addMenu();
    }
}

// Bootstrap plugin.
if (defined('GATEY_BOOTSTRAPPED')) {
    return;
}
define('GATEY_BOOTSTRAPPED', true);

add_action('plugins_loaded', 'SmartCloud\WPSuite\Gatey\gatey_check', 20);
add_action('init', 'SmartCloud\WPSuite\Gatey\gatey_init');
function gatey_check()
{
    $instance = gatey();
    $instance->check();
}
function gatey_init()
{
    $instance = gatey();
    $instance->init();
}

/**
 * Accessor function
 *
 * @return \SmartCloud\WPSuite\Gatey\Gatey_Plugin
 */
function gatey()
{
    return Gatey_Plugin::instance();
}
