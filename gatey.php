<?php
/**
 * Plugin Name:       Gatey - Login & SSO with Amazon Cognito
 * Plugin URI:        https://wpsuite.io/gatey/
 * Description:       Easily integrate Amazon Cognito for secure authentication, SSO, and advanced user management in WordPress or static sites generated from WordPress.
 * Requires at least: 6.7
 * Tested up to:      7.0
 * Requires PHP:      8.1
 * Version:           2.4.1
 * Author:            Smart Cloud Solutions Inc.
 * Author URI:        https://smart-cloud-solutions.com
 * License:           MIT
 * License URI:       https://mit-license.org/
 * Text Domain:       gatey
 *
 * @package           gatey
 */

namespace SmartCloud\WPSuite\Gatey;

const VERSION = '2.4.1';

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

    /** @var string[] */
    private array $blocks = [
        'authenticator',
        'account-attribute',
        'custom-block',
        'form-field',
    ];

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
        add_filter('block_bindings_supported_attributes', array($this, 'filterBlockBindingsSupportedAttributes'), 20, 2);
        add_filter('block_bindings_supported_attributes_gatey/authenticator', array($this, 'filterAuthenticatorBlockBindingsSupportedAttributes'), 20, 1);

        $this->registerBlocks();

        // Assets

        add_action('wp_head', array($this, 'addMainScript', ), 1);
        add_action('admin_head', array($this, 'addMainScript'), 1);

        add_action('admin_init', array($this, 'enqueueAdminRuntimeAssets'), 20);
        add_action('wp_enqueue_scripts', array($this, 'enqueueFrontendAssets'), 20);
        add_action('elementor/preview/after_enqueue_scripts', array($this, 'enqueueFrontendAssets'), 20);

        add_action('enqueue_block_editor_assets', array($this, 'enqueueEditorAssets'), 20);
        add_filter('block_categories_all', array($this, 'registerBlockCategory'), 20, 2);

        // Hooks.
        add_action('admin_menu', array($this, 'createAdminMenu'), 22);

        // Shortcodes
        add_shortcode('gatey', array($this, 'shortcodeAuthenticator'));
        add_shortcode('gatey-account', array($this, 'shortcodeAccount'));
        add_filter('no_texturize_shortcodes', function ($shortcodes) {
            $shortcodes[] = 'gatey';
            $shortcodes[] = 'gatey-account';
            return $shortcodes;
        });

        if ($this->admin->getSettings()->integrateWpLogin && $this->admin->getSettings()->signInPage) {
            add_filter('login_url', array($this, 'loginPage'), 20, 3);
            add_filter('logout_url', array($this, 'logoutPage'), 20, 3);
        }
    }

    public function registerBlocks(): void
    {
        if (!function_exists('register_block_type')) {
            return;
        }

        foreach ($this->blocks as $block) {
            $metadata_path = GATEY_PATH . 'blocks/' . $block;
            if (file_exists($metadata_path . '/block.json')) {
                register_block_type($metadata_path);
            }
        }
    }

    /**
     * Extend Block Bindings support for the Gatey authenticator block.
     *
     * Pattern Overrides uses the same supported-attributes registry.
     * Marking these attributes as bindable allows synced patterns to override
     * the authenticator's screen and presentation per instance.
     *
     * @param string[] $supported_attributes
     * @return string[]
     */
    public function filterAuthenticatorBlockBindingsSupportedAttributes(array $supported_attributes): array
    {
        return array_values(array_unique(array_merge($supported_attributes, $this->getAuthenticatorBindableAttributes())));
    }

    /**
     * Add Gatey authenticator binding support through the generic filter too.
     *
     * @param string[] $supported_attributes
     * @param string|null $block_type_name
     * @return string[]
     */
    public function filterBlockBindingsSupportedAttributes(array $supported_attributes, ?string $block_type_name = null): array
    {
        if ($block_type_name !== 'gatey/authenticator') {
            return $supported_attributes;
        }

        return $this->filterAuthenticatorBlockBindingsSupportedAttributes($supported_attributes);
    }

    /**
     * Authenticator attributes that should participate in block bindings and pattern overrides.
     *
     * @return string[]
     */
    private function getAuthenticatorBindableAttributes(): array
    {
        return array(
            'style',
            'screen',
            'language',
            'direction',
            'variation',
            'colorMode',
            'showOpenButton',
            'openButtonTitle',
        );
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
            'slug' => 'smartcloud-gatey',
            'title' => __('SmartCloud - Gatey', 'gatey'),
            'icon' => null,
        );
        return $categories;
    }

    private function getWpsuiteThemeCssHref(): ?string
    {
        if (!defined('SMARTCLOUD_WPSUITE_SLUG')) {
            return null;
        }

        $upload_dir_info = wp_upload_dir();
        $css_path = trailingslashit($upload_dir_info['basedir']) . SMARTCLOUD_WPSUITE_SLUG . '/wpsuite-theme.css';

        if (!file_exists($css_path)) {
            return null;
        }

        $css_url = trailingslashit($upload_dir_info['baseurl']) . SMARTCLOUD_WPSUITE_SLUG . '/wpsuite-theme.css';
        $version = filemtime($css_path) ?: GATEY_VERSION;

        return add_query_arg('ver', (string) $version, $css_url);
    }

    /**
     * Add inline scripts that expose PHP constants to JS.
     */
    public function addMainScript(): void
    {
        $settings = $this->admin->getSettings();
        $data = array(
            'key' => GATEY_SLUG,
            'version' => GATEY_VERSION,
            'status' => 'initializing',
            'cognito' => array(),
            'settings' => $settings,
            'restUrl' => rest_url(GATEY_SLUG . '/v1'),
            'nonce' => wp_create_nonce('wp_rest'),
        );
        $constants = array(
            'authenticatorViewCssHref' => file_exists(GATEY_PATH . 'blocks/authenticator-view.css')
                ? add_query_arg(
                    'ver',
                    GATEY_VERSION,
                    GATEY_URL . 'blocks/authenticator-view.css'
                )
                : null,
            'wpsuiteThemeCssHref' => $this->getWpsuiteThemeCssHref(),
        );
        $js = 'const __gateyGlobal = (typeof globalThis !== "undefined") ? globalThis : window;
__gateyGlobal.WpSuite = __gateyGlobal.WpSuite ?? {};
__gateyGlobal.WpSuite.plugins = __gateyGlobal.WpSuite.plugins ?? {};
__gateyGlobal.WpSuite.events = __gateyGlobal.WpSuite.events ?? {
    emit: function (type, detail) { window.dispatchEvent(new CustomEvent(type, { detail })); },
    on: function (type, cb, opts) { window.addEventListener(type, cb, opts); },
};
__gateyGlobal.WpSuite.plugins.gatey = __gateyGlobal.WpSuite.plugins.gatey ?? {};
Object.assign(__gateyGlobal.WpSuite.plugins.gatey, ' . wp_json_encode($data) . ');
__gateyGlobal.WpSuite.constants = __gateyGlobal.WpSuite.constants ?? {};
__gateyGlobal.WpSuite.constants.gatey = ' . wp_json_encode($constants) . ';
var WpSuite = __gateyGlobal.WpSuite;
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
        wp_print_inline_script_tag(wp_kses_post($js));
    }

    private function enqueueMainRuntimeScript($args = false): void
    {
        $main_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'main/index.asset.php')) {
            $main_script_asset = require(GATEY_PATH . 'main/index.asset.php');
        }
        $main_script_dependencies = array_merge(
            $main_script_asset['dependencies'] ?? array(),
            array('smartcloud-wpsuite-webcrypto-vendor', 'smartcloud-wpsuite-amplify-vendor')
        );
        if (wp_script_is('smartcloud-wpsuite-main-script', 'registered')) {
            $main_script_dependencies[] = 'smartcloud-wpsuite-main-script';
        }
        $main_script_asset['dependencies'] = array_values(array_unique($main_script_dependencies));
        wp_enqueue_script('smartcloud-gatey-main-script', GATEY_URL . 'main/index.js', $main_script_asset['dependencies'], GATEY_VERSION, $args);
        wp_enqueue_style('smartcloud-gatey-main-style', GATEY_URL . 'main/index.css', array(), GATEY_VERSION);
        add_editor_style(GATEY_URL . 'main/index.css');

        //wp_add_inline_script('smartcloud-gatey-main-script', $js, 'before');
    }

    private function enqueueViewAssets(): void
    {
        $view_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'blocks/authenticator-view.asset.php')) {
            $view_script_asset = require(GATEY_PATH . 'blocks/authenticator-view.asset.php');
        }
        $view_script_dependencies = array_merge(
            $view_script_asset['dependencies'] ?? array(),
            array('smartcloud-gatey-main-script')
        );
        if (wp_script_is('smartcloud-gatey-main-script', 'registered')) {
            $view_script_dependencies[] = 'smartcloud-gatey-main-script';
        }
        $view_script_asset['dependencies'] = array_values(array_unique($view_script_dependencies));
        wp_enqueue_script('smartcloud-gatey-authenticator-view-script', GATEY_URL . 'blocks/authenticator-view.js', $view_script_asset['dependencies'], GATEY_VERSION, array('in_footer' => true, 'strategy' => 'defer'));

        $view_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'blocks/account-attribute-view.asset.php')) {
            $view_script_asset = require(GATEY_PATH . 'blocks/account-attribute-view.asset.php');
        }
        $account_view_script_dependencies = array_merge(
            $view_script_asset['dependencies'] ?? array(),
            array('smartcloud-gatey-main-script')
        );
        if (wp_script_is('smartcloud-gatey-main-script', 'registered')) {
            $account_view_script_dependencies[] = 'smartcloud-gatey-main-script';
        }
        $view_script_asset['dependencies'] = array_values(array_unique($account_view_script_dependencies));
        wp_enqueue_script('smartcloud-gatey-account-attribute-view-script', GATEY_URL . 'blocks/account-attribute-view.js', $view_script_asset['dependencies'], GATEY_VERSION, array('in_footer' => true, 'strategy' => 'defer'));
    }

    public function enqueueFrontendAssets(): void
    {
        $this->enqueueMainRuntimeScript(array('in_footer' => true, 'strategy' => 'defer'));
        $this->enqueueViewAssets();
    }

    public function enqueueEditorAssets(): void
    {
        $this->registerEditorRuntimeAssets();

        $this->attachEditorRuntimeDependencies();

        if (file_exists(GATEY_PATH . 'blocks/editor.css')) {
            wp_enqueue_style(
                'smartcloud-gatey-blocks-editor-style',
                GATEY_URL . 'blocks/editor.css',
                array(),
                GATEY_VERSION
            );
        }
    }

    public function enqueueAdminRuntimeAssets(): void
    {
        $this->enqueueMainRuntimeScript();
    }

    private function registerEditorRuntimeAssets(): void
    {
        $blocks_script_asset = array();
        if (file_exists(filename: GATEY_PATH . 'blocks/editor.asset.php')) {
            $blocks_script_asset = require(GATEY_PATH . 'blocks/editor.asset.php');
        }
        $blocks_script_asset['dependencies'] = array_merge($blocks_script_asset['dependencies'], array('smartcloud-gatey-main-script'));
        wp_enqueue_script('smartcloud-gatey-blocks-editor-script', GATEY_URL . 'blocks/editor.js', $blocks_script_asset['dependencies'], GATEY_VERSION, array('in_footer' => true, 'strategy' => 'defer'));
        wp_enqueue_style('smartcloud-gatey-blocks-editor-style', GATEY_URL . 'blocks/editor.css', array(), GATEY_VERSION);
        add_editor_style(GATEY_URL . 'blocks/editor.css');

    }

    private function attachEditorRuntimeDependencies(): void
    {
        if (!class_exists('\WP_Block_Type_Registry')) {
            return;
        }

        $registry = \WP_Block_Type_Registry::get_instance();
        $scripts = wp_scripts();
        $required_deps = array('smartcloud-gatey-main-script');

        foreach ($registry->get_all_registered() as $block_type) {
            if (!is_object($block_type) || !isset($block_type->name) || !str_starts_with((string) $block_type->name, 'gatey/')) {
                continue;
            }

            $handles = isset($block_type->editor_script_handles) && is_array($block_type->editor_script_handles)
                ? $block_type->editor_script_handles
                : array();

            foreach ($handles as $handle) {
                if (!is_string($handle) || !isset($scripts->registered[$handle])) {
                    continue;
                }

                $scripts->registered[$handle]->deps = array_values(array_unique(array_merge(
                    $scripts->registered[$handle]->deps ?? array(),
                    $required_deps
                )));
            }
        }
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
                'themeoverrides' => null,
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
                $attrs = is_array($block['attrs'] ?? null) ? $block['attrs'] : array();

                $override_map = array(
                    'screen' => 'screen',
                    'variation' => 'variation',
                    'colormode' => 'colorMode',
                    'language' => 'language',
                    'direction' => 'direction',
                    'totp' => 'totpIssuer',
                    'open' => 'openButtonTitle',
                    'signingin' => 'signingInMessage',
                    'signingout' => 'signingOutMessage',
                    'redirecting' => 'redirectingMessage',
                );

                foreach ($override_map as $shortcode_key => $attribute_key) {
                    $value = $a[$shortcode_key] ?? null;
                    if ($value === null || $value === '') {
                        continue;
                    }

                    $attrs[$attribute_key] = $value;
                }

                if (($a['showopen'] ?? null) !== null && $a['showopen'] !== '') {
                    $show_open = $a['showopen'];
                    if ($show_open === 'true' || $show_open === '1' || $show_open === true || $show_open === 'yes') {
                        $attrs['showOpenButton'] = true;
                    } elseif ($show_open === 'false' || $show_open === '0' || $show_open === false || $show_open === 'no') {
                        $attrs['showOpenButton'] = false;
                    }
                }

                $theme_overrides = $a['themeoverrides'] ?? null;
                if ((!is_string($theme_overrides) || trim($theme_overrides) === '') && is_string($content)) {
                    $theme_overrides = $this->extractThemeOverridesFromShortcodeContent($content);
                }
                if (is_string($theme_overrides) && trim($theme_overrides) !== '') {
                    $attrs['themeOverrides'] = $theme_overrides;
                }

                $attrs['uid'] = $attrs['uid'] ?? '';
                $attrs['screen'] = $attrs['screen'] ?? 'signIn';
                $attrs['variation'] = $attrs['variation'] ?? 'default';
                $attrs['colorMode'] = $attrs['colorMode'] ?? 'system';
                $attrs['language'] = $attrs['language'] ?? 'en';
                $attrs['direction'] = $attrs['direction'] ?? 'auto';
                $attrs['showOpenButton'] = $attrs['showOpenButton'] ?? false;
                $attrs['openButtonTitle'] = $attrs['openButtonTitle'] ?? '';
                $attrs['signingInMessage'] = $attrs['signingInMessage'] ?? '';
                $attrs['signingOutMessage'] = $attrs['signingOutMessage'] ?? '';
                $attrs['redirectingMessage'] = $attrs['redirectingMessage'] ?? '';
                $attrs['totpIssuer'] = $attrs['totpIssuer'] ?? '';

                $newBlock = [
                    'blockName' => 'gatey/authenticator',
                    'attrs' => $attrs,
                    'innerBlocks' => $block['innerBlocks'],
                    'innerHTML' => $block['innerHTML'],
                    'innerContent' => $block['innerContent'],
                ];
                $content = render_block($newBlock);
                $content = str_replace("smartcloud-gatey-is-preview", ($is_preview ? 'true' : 'false'), $content);
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
                'themeoverrides' => null,
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
            'component' => $a['component'] ?? 'div',
            'attribute' => $a['attribute'] ?? 'sub',
            'custom' => $a['custom'] ?? '',
            'prefix' => $a['prefix'] ?? '',
            'postfix' => $a['postfix'] ?? '',
            'colorMode' => $a['colormode'] ?? 'system',
            'language' => $a['language'] ?? 'en',
            'direction' => $a['direction'] ?? 'auto',
        );

        $theme_overrides = $a['themeoverrides'] ?? null;
        if ((!is_string($theme_overrides) || trim($theme_overrides) === '') && is_string($content)) {
            $theme_overrides = $this->extractThemeOverridesFromShortcodeContent($content);
        }
        if (is_string($theme_overrides) && trim($theme_overrides) !== '') {
            $attrs['themeOverrides'] = $theme_overrides;
        }

        $newBlock = [
            'blockName' => 'gatey/account-attribute',
            'attrs' => $attrs,
        ];
        $content = render_block($newBlock);
        $content = str_replace("smartcloud-gatey-is-preview", ($is_preview ? 'true' : 'false'), $content);
        return $content;
    }

    private function normalizeShortcodeContent(?string $content): string
    {
        if (!is_string($content) || $content === '') {
            return '';
        }

        $text = html_entity_decode($content, ENT_QUOTES, get_bloginfo('charset'));
        $text = str_replace("\r\n", "\n", $text);
        $text = preg_replace('~</p>\s*<p[^>]*>~i', "\n", $text);
        $text = preg_replace('~<br\s*/?>~i', "\n", $text);
        $text = preg_replace('~</?p[^>]*>~i', '', $text);
        $text = preg_replace('~</?div[^>]*>~i', '', $text);
        $text = preg_replace('~</?span[^>]*>~i', '', $text);
        $text = str_replace("\xC2\xA0", ' ', $text);

        return trim($text);
    }

    private function extractThemeOverridesFromShortcodeContent(?string $content): ?string
    {
        $normalized_content = $this->normalizeShortcodeContent($content);
        if ($normalized_content === '') {
            return null;
        }

        $lines = explode("\n", $normalized_content);
        $line_count = count($lines);

        for ($index = 0; $index < $line_count; $index++) {
            $line = $lines[$index];

            if (preg_match('/^themeOverrides:\s*\|\s*$/', $line) === 1) {
                $block_lines = array();
                $base_indent = null;

                for ($block_index = $index + 1; $block_index < $line_count; $block_index++) {
                    $block_line = $lines[$block_index];
                    if ($block_line === '') {
                        $block_lines[] = '';
                        continue;
                    }

                    if (preg_match('/^([ \t]+)(.*)$/', $block_line, $matches) !== 1) {
                        break;
                    }

                    $indent_length = strlen($matches[1]);
                    $base_indent = $base_indent === null
                        ? $indent_length
                        : min($base_indent, $indent_length);
                    $block_lines[] = $block_line;
                }

                if (empty($block_lines)) {
                    return null;
                }

                $dedented_lines = array_map(
                    static function (string $block_line) use ($base_indent): string {
                        if ($block_line === '' || $base_indent === null || $base_indent === 0) {
                            return $block_line;
                        }

                        return preg_replace('/^[ \t]{0,' . $base_indent . '}/', '', $block_line) ?? $block_line;
                    },
                    $block_lines
                );

                return rtrim(implode("\n", $dedented_lines));
            }

            if (preg_match('/^themeOverrides:\s*(.+)\s*$/', $line, $matches) === 1) {
                return trim($matches[1], " \t\n\r\0\x0B\"'");
            }
        }

        return null;
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
        // Composer autoloader
        if (file_exists(GATEY_PATH . 'vendor/autoload.php')) {
            require_once GATEY_PATH . 'vendor/autoload.php';
        }

        // Logger class
        if (file_exists(GATEY_PATH . 'admin/logger.php')) {
            require_once GATEY_PATH . 'admin/logger.php';
        }

        // Cognito JWT verifier
        if (file_exists(GATEY_PATH . 'admin/cognito-token-verifier.php')) {
            require_once GATEY_PATH . 'admin/cognito-token-verifier.php';
        }

        // Hub admin classes
        if (file_exists(GATEY_PATH . 'hub-loader.php')) {
            require_once GATEY_PATH . 'hub-loader.php';
        }

        // Admin classes
        if (file_exists(GATEY_PATH . 'admin/admin.php')) {
            require_once GATEY_PATH . 'admin/admin.php';
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

add_action('init', 'SmartCloud\WPSuite\Gatey\gateyHubInit', 15);
add_action('init', 'SmartCloud\WPSuite\Gatey\gateyPluginInit', 20);
add_action('plugins_loaded', 'SmartCloud\WPSuite\Gatey\gateyLoaded', 20);
function gateyHubInit()
{
    if (class_exists('\SmartCloud\WPSuite\Hub\GateyHubLoader')) {
        $loader = loader();
        $loader->init();
    }
}
function gateyPluginInit()
{
    $instance = gatey();
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
