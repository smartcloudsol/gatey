<?php
/**
 * Plugin Name:       Gatey - Login & SSO with Amazon Cognito
 * Plugin URI:        https://wpsuite.io/gatey
 * Description:       Easily integrate Amazon Cognito for secure authentication, SSO, and advanced user management in WordPress or static sites generated from WordPress.
 * Requires at least: 6.7
 * Tested up to:      6.8
 * Requires PHP:      8.1
 * Version:           1.0.1
 * Author:            Smart Cloud Solutions Inc.
 * Author URI:        https://smart-cloud-solutions.com
 * License:           MIT
 * License URI:       https://mit-license.org/
 * Text Domain:       gatey
 *
 * @package           gatey
 */

namespace SmartCloud\WPSuite\Gatey;

const VERSION = '1.0.1';

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

        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'));

        // Front‑end assets + shortcodes
        add_action('wp_enqueue_scripts', array($this, 'enqueueAssets'));
        add_action('admin_init', array($this, 'enqueueAssets'));
        add_action('elementor/editor/after_enqueue_scripts', array($this, 'enqueueAssets'));

        add_shortcode('gatey', array($this, 'shortcode'));
        add_shortcode('gatey-account', array($this, 'shortcodeAccount'));
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
     * Init callback – registers blocks.
     */
    public function init(): void
    {
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
            'slug' => 'smartcloud-wpsuite',
            'title' => __('SmartCloud\WPSuite', 'gatey'),
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

        $data = array(
            'cognito' => array(),
            'restUrl' => rest_url(GATEY_SLUG . '/v1'),
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
    }

    /**
     * Shortcode handler for [gatey]
     */
    public function shortcode($atts = array(), $content = null): string
    {
        $a = shortcode_atts(
            array(
                'id' => false,
                'screen' => false,
                'variation' => false,
                'colormode' => false,
                'signingin' => '',
                'signingout' => '',
                'redirecting' => '',
            ),
            $atts
        );
        $id = $a['id'];
        $screen = $a['screen'];
        $variation = $a['variation'];
        $colorMode = $a['colormode'];
        $signingInMessage = $a['signingin'];
        $signingOutMessage = $a['signingout'];
        $redirectingMessage = $a['redirecting'];

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
                $content = render_block($block);
                $content = str_replace("gatey-is-preview", ($is_preview ? 'true' : 'false'), $content);
                if ($screen) {
                    $content = preg_replace('/screen: "(.*)"/', 'screen: "' . $screen . '"', $content);
                }
                if ($variation) {
                    $content = preg_replace('/variation: "(.*)"/', 'variation: "' . $variation . '"', $content);
                }
                if ($colorMode) {
                    $content = preg_replace('/color_mode: "(.*)"/', 'color_mode: "' . $colorMode . '"', $content);
                }
                if ($signingInMessage) {
                    $content = preg_replace('/signing_in_message: "(.*)"/', 'signing_in_message: "' . $signingInMessage . '"', $content);
                }
                if ($signingOutMessage) {
                    $content = preg_replace('/signing_out_message: "(.*)"/', 'signing_out_message: "' . $signingOutMessage . '"', $content);
                }
                if ($redirectingMessage) {
                    $content = preg_replace('/redirecting_message: "(.*)"/', 'redirecting_message: "' . $redirectingMessage . '"', $content);
                }
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
                'attribute' => false,
                'custom' => false,
            ),
            $atts
        );
        $is_admin = is_admin();
        if (!$is_admin && did_action('elementor/loaded') && class_exists('\Elementor\Plugin')) {
            $plugin = \Elementor\Plugin::$instance;
            if (isset($plugin->preview) && method_exists($plugin->preview, 'is_preview_mode')) {
                $is_admin = $plugin->preview->is_preview_mode();
            }
        }
        return '<p gatey-account-attribute-' . (strcmp($a['attribute'], 'custom') != 0 ?
            $a['attribute']
            :
            'custom-' . $a['custom']
        ) . ' style="margin:0;padding:0;">' . ($is_admin ? $a['attribute'] . (strcmp($a['attribute'], 'custom') == 0 ? '-' . $a['custom'] : '') : '') . '</p>';
    }

    /**
     * Filter login URL to optionally point to a Cognito-driven page.
     */
    public function login_page(string $login_url, string $redirect, bool $force_reauth): string
    {
        $settings = $this->admin->getSettings();
        if (!empty($settings->signInPage)) {
            return site_url($settings->signInPage) . ($redirect ? '?redirect_to=' . urlencode($redirect) : '');
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
if (defined('COGNITOPRESS_BOOTSTRAPPED')) {
    return;
}
define('COGNITOPRESS_BOOTSTRAPPED', true);
add_action('init', 'SmartCloud\WPSuite\Gatey\gatey_init');
function gatey_init()
{
    $instance = Gatey_Plugin::instance();
    $instance->init();
}


