<?php
/**
 * Plugin Name:       Gatey - Login & SSO with Amazon Cognito
 * Plugin URI:        https://wpsuite.io/gatey/
 * Description:       Easily integrate Amazon Cognito for secure authentication, SSO, and advanced user management in WordPress or static sites generated from WordPress.
 * Requires at least: 6.7
 * Tested up to:      6.9
 * Requires PHP:      8.1
 * Version:           2.0.10
 * Author:            Smart Cloud Solutions Inc.
 * Author URI:        https://smart-cloud-solutions.com
 * License:           MIT
 * License URI:       https://mit-license.org/
 * Text Domain:       gatey
 *
 * @package           gatey
 */

namespace SmartCloud\WPSuite\Gatey;

const VERSION = '2.0.10';

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
final class Gatey
{

    /** Singleton instance */
    private static ?Gatey $instance = null;

    /** Admin instance */
    private Admin $admin;

    private function __construct()
    {
        $this->defineConstants();
        $this->includes();
    }

    /**
     * Access the singleton instance.
     */
    public static function instance(): Gatey
    {
        return self::$instance ?? (self::$instance = new self());
    }

    /**
     * Init callback – registers blocks.
     */
    public function init(): void
    {
        // Register Gutenberg blocks (authenticator etc.)
        if (function_exists('register_block_type')) {
            register_block_type(GATEY_PATH . 'gatey-blocks/dist/authenticator');
            register_block_type(GATEY_PATH . 'gatey-blocks/dist/custom-block');
            register_block_type(GATEY_PATH . 'gatey-blocks/dist/account-attribute');
            register_block_type(GATEY_PATH . 'gatey-blocks/dist/form-field');
        }

        // Assets
        add_action('wp_enqueue_scripts', array($this, 'enqueueAssets'), 20);
        add_action('admin_init', array($this, 'enqueueAssets'), 20);
        add_action('elementor/preview/after_enqueue_scripts', array($this, 'enqueueAssets'), 20);

        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'), 20);

        // Shortcodes
        add_shortcode('gatey', array($this, 'shortcodeAuthenticator'));
        add_shortcode('gatey-account', array($this, 'shortcodeAccount'));

        // Category for custom blocks.
        add_filter('block_categories_all', array($this, 'registerBlockCategory'), 20, 2);

        if ($this->admin->getSettings()->integrateWpLogin && $this->admin->getSettings()->signInPage) {
            add_filter('login_url', array($this, 'loginPage'), 20, 3);
            add_filter('logout_url', array($this, 'logoutPage'), 20, 3);
        }
    }

    /**
     * Include admin classes or additional files.
     */
    public function registerWidgets(): void
    {
        if (file_exists(GATEY_PATH . 'gatey-elementor-widgets.php')) {
            add_action('elementor/init', static function () {
                require_once GATEY_PATH . 'gatey-elementor-widgets.php';
            });
        }
    }

    /**
     * Register custom block category.
     */
    public function registerBlockCategory(array $categories, \WP_Block_Editor_Context $context): array
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

        wp_register_script(
            'wpsuite-webcrypto-vendor',
            GATEY_URL . 'assets/js/wpsuite-webcrypto-vendor.min.js',
            array(),
            \SmartCloud\WPSuite\Hub\VERSION_WEBCRYPTO,
            false
        );

        wp_register_script(
            'wpsuite-amplify-vendor',
            GATEY_URL . 'assets/js/wpsuite-amplify-vendor.min.js',
            array("react", "react-dom"),
            \SmartCloud\WPSuite\Hub\VERSION_AMPLIFY,
            false
        );

        wp_register_script(
            'wpsuite-mantine-vendor',
            GATEY_URL . 'assets/js/wpsuite-mantine-vendor.min.js',
            array("react", "react-dom"),
            \SmartCloud\WPSuite\Hub\VERSION_MANTINE,
            false
        );

        $main_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'gatey-main/dist/index.asset.php')) {
            $main_script_asset = require(GATEY_PATH . 'gatey-main/dist/index.asset.php');
        }
        $main_script_asset['dependencies'] = array_merge($main_script_asset['dependencies'], array('wpsuite-webcrypto-vendor', 'wpsuite-amplify-vendor'));
        wp_enqueue_script('gatey-main-script', GATEY_URL . 'gatey-main/dist/index.js', $main_script_asset['dependencies'], GATEY_VERSION, false);
        wp_enqueue_style('gatey-main-style', GATEY_URL . 'gatey-main/dist/index.css', array(), GATEY_VERSION);
        add_editor_style(GATEY_URL . 'gatey-main/dist/index.css');

        $blocks_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'gatey-blocks/dist/index.asset.php')) {
            $blocks_script_asset = require(GATEY_PATH . 'gatey-blocks/dist/index.asset.php');
        }
        $blocks_script_asset['dependencies'] = array_merge($blocks_script_asset['dependencies'], array('gatey-main-script'));
        wp_enqueue_script('gatey-blocks-script', GATEY_URL . 'gatey-blocks/dist/index.js', $blocks_script_asset['dependencies'], GATEY_VERSION, false);
        wp_enqueue_style('gatey-blocks-style', GATEY_URL . 'gatey-blocks/dist/index.css', array(), GATEY_VERSION);
        add_editor_style(GATEY_URL . 'gatey-blocks/dist/index.css');

        $upload_info = wp_upload_dir();
        $data = array(
            'key' => GATEY_SLUG,
            'version' => GATEY_VERSION,
            'status' => 'initializing',
            'cognito' => array(),
            'settings' => $settings,
            'restUrl' => rest_url(GATEY_SLUG . '/v1'),
            'nonce' => wp_create_nonce('wp_rest'),
        );


        $js = 'const __gateyGlobal = (typeof globalThis !== "undefined") ? globalThis : window;
__gateyGlobal.WpSuite.plugins.gatey = {};
Object.assign(__gateyGlobal.WpSuite.plugins.gatey, ' . wp_json_encode($data) . ');
';
        if ($settings->integrateWpLogin) {
            $js = $js .
                '__gateyGlobal.WpSuite.plugins.gatey.settings.integrateWpLogin = checkDomain();' .
                'function checkDomain() {' .
                '	return [...window.location.origin].reverse().join("")==="' . strrev(site_url()) . '"' .
                '};
                ';
        }
        $js = $js . '// backward compatibility
__gateyGlobal.Gatey = __gateyGlobal.WpSuite.plugins.gatey;
';
        wp_add_inline_script('gatey-main-script', $js, 'before');
    }

    /**
     * Shortcode handler for [gatey]
     */
    public function shortcodeAuthenticator($atts = array(), $content = null): string
    {
        $a = shortcode_atts(
            array(
                'id' => null,
                'screen' => null,
                'variation' => null,
                'colormode' => null,
                'language' => null,
                'direction' => null,
                'totp' => null,
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
                    'uid' => $block['attrs']['uid'] ?? '',
                    'customCSS' => $block['attrs']['customCSS'] ?? '',
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
                    'totpIssuer' => $a['totp'] ?? $block['attrs']['totpIssuer'] ?? '',
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
                'prefix' => null,
                'postfix' => null,
                'custom' => null,
                'colormode' => null,
                'language' => null,
                'direction' => null,
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
            'prefix' => $a['prefix'] ?? $block['attrs']['prefix'] ?? '',
            'postfix' => $a['postfix'] ?? $block['attrs']['postfix'] ?? '',
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
    public function loginPage(string $login_url, string $redirect, bool $force_reauth): string
    {
        $settings = $this->admin->getSettings();
        if (!empty($settings->signInPage)) {
            return site_url($settings->signInPage) . ($redirect ? '?redirect_to=' . urlencode($redirect) : '') . ($force_reauth ? '&reauth=1' : '');
        }
        return $login_url;
    }

    public function logoutPage(string $logout_url, string $redirect): string
    {
        $settings = $this->admin->getSettings();
        if (!empty($settings->signInPage)) {
            return site_url($settings->signInPage) . '?loggedout=true' . ($redirect ? '&redirect_to=' . urlencode($redirect) : '');
        }
        return $logout_url;
    }

    /**
     * Add settings page in wp-admin.
     */
    public function createAdminMenu(): void
    {
        $this->admin->addMenu();
    }

    /**
     * Define required constants.
     */
    private function defineConstants(): void
    {
        define('GATEY_VERSION', VERSION);
        define('GATEY_SLUG', 'gatey');
        define('GATEY_PATH', plugin_dir_path(__FILE__));
        define('GATEY_URL', plugin_dir_url(__FILE__));
    }

    /**
     * Include admin classes or additional files.
     */
    private function includes(): void
    {
        // Composer autoloader if shipped.
        if (file_exists(GATEY_PATH . 'vendor/autoload.php') && !class_exists('\SmartCloud\WPSuite\Gatey\Admin')) {
            require_once GATEY_PATH . 'vendor/autoload.php';
        }

        // Hub admin classes.
        if (file_exists(GATEY_PATH . 'hub-loader.php')) {
            require_once GATEY_PATH . 'hub-loader.php';
        }

        // Admin classes.
        if (file_exists(GATEY_PATH . 'gatey-admin/index.php')) {
            require_once GATEY_PATH . 'gatey-admin/index.php';
        }
        if (class_exists('\SmartCloud\WPSuite\Gatey\Admin')) {
            $this->admin = new \SmartCloud\WPSuite\Gatey\Admin();
        }
    }

}

// Bootstrap plugin.
if (defined('GATEY_BOOTSTRAPPED')) {
    return;
}
define('GATEY_BOOTSTRAPPED', true);

add_action('init', 'SmartCloud\WPSuite\Gatey\gateyInit', 15);
add_action('plugins_loaded', 'SmartCloud\WPSuite\Gatey\gateyLoaded', 20);
function gateyInit()
{
    $instance = gatey();
    if (class_exists('\SmartCloud\WPSuite\Hub\GateyHubLoader')) {
        $loader = loader();
        $loader->init();
    }
    $instance->init();
}
function gateyLoaded()
{
    $instance = gatey();
    if (class_exists('\SmartCloud\WPSuite\Hub\GateyHubLoader')) {
        $loader = loader();
        $loader->check();
    }

    $instance->registerWidgets();
}

/**
 * Accessor function
 *
 * @return \SmartCloud\WPSuite\Gatey\Gatey
 */
function gatey()
{
    return Gatey::instance();
}

/**
 * Accessor function
 *
 * @return \SmartCloud\WPSuite\Hub\GateyHubLoader
 */
function loader()
{
    return \SmartCloud\WPSuite\Hub\GateyHubLoader::instance('gatey/gatey.php', 'gatey');
}
