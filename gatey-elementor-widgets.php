<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('gatey_do_shortcode')) {
    function gatey_do_shortcode(string $tag, array $atts = [], string $link = '')
    {
        if (empty($link)) {
            echo do_shortcode(sprintf(
                '[%s %s]',
                esc_attr($tag),
                implode(' ', array_map(
                    fn($k, $v) => sprintf('%s="%s"', esc_attr($k), esc_attr($v)),
                    array_keys($atts),
                    $atts
                ))
            ));
        } else {
            echo '<a' . wp_kses_post($link) . '>' . do_shortcode(sprintf(
                '[%s %s]',
                esc_attr($tag),
                implode(' ', array_map(
                    fn($k, $v) => sprintf('%s="%s"', esc_attr($k), esc_attr($v)),
                    array_keys($atts),
                    $atts
                ))
            )) . '</a>';
        }
    }
}

add_action('elementor/elements/categories_registered', static function ($manager) {
    $manager->add_category('gatey', [
        'title' => __('Gatey', 'gatey'),
        'icon' => 'fa fa-plug',
    ]);
});

abstract class Gatey_Base_Widget extends \Elementor\Widget_Base
{
    protected static array $COLOR_MODES;
    protected static array $LANGUAGES;
    protected static array $DIRECTIONS;

    public function __construct($data = [], $args = null)
    {
        parent::__construct($data, $args);

        self::$COLOR_MODES = [
            '' => '',
            'system' => __('System', 'gatey'),
            'light' => __('Light', 'gatey'),
            'dark' => __('Dark', 'gatey'),
        ];

        self::$LANGUAGES = [
            '' => '',
            'system' => __('System', 'gatey'),
            'ar' => __('Arabic', 'gatey'),
            'zh' => __('Chinese', 'gatey'),
            'nl' => __('Dutch', 'gatey'),
            'en' => __('English', 'gatey'),
            'fr' => __('French', 'gatey'),
            'de' => __('German', 'gatey'),
            'he' => __('Hebrew', 'gatey'),
            'hi' => __('Hindi', 'gatey'),
            'hu' => __('Hungarian', 'gatey'),
            'id' => __('Indonesian', 'gatey'),
            'it' => __('Italian', 'gatey'),
            'ja' => __('Japanese', 'gatey'),
            'ko' => __('Korean', 'gatey'),
            'nb' => __('Norwegian', 'gatey'),
            'pl' => __('Polish', 'gatey'),
            'pt' => __('Portuguese', 'gatey'),
            'ru' => __('Russian', 'gatey'),
            'es' => __('Spanish', 'gatey'),
            'sv' => __('Swedish', 'gatey'),
            'th' => __('Thai', 'gatey'),
            'tr' => __('Turkish', 'gatey'),
            'ua' => __('Ukrainian', 'gatey'),
        ];

        self::$DIRECTIONS = [
            '' => '',
            'auto' => __('Auto (by language)', 'gatey'),
            'ltr' => __('Left to Right', 'gatey'),
            'rtl' => __('Right to Left', 'gatey'),
        ];

    }

    public function get_categories()
    {
        return ['gatey'];
    }
}

class Gatey_Authenticator_Widget extends Gatey_Base_Widget
{

    private static array $SCREENS;
    private static array $VARIATIONS;

    public function __construct($data = [], $args = null)
    {
        parent::__construct($data, $args);
        self::$SCREENS = [
            '' => '',
            'signIn' => __('Sign In', 'gatey'),
            'signUp' => __('Sign Up', 'gatey'),
            'forgotPassword' => __('Forgot Password', 'gatey'),
            'setupTotp' => __('Setup TOTP', 'gatey'),
            'editAccount' => __('Edit Account', 'gatey'),
            'changePassword' => __('Change Password', 'gatey'),
        ];
        self::$VARIATIONS = [
            '' => '',
            'default' => __('Default', 'gatey'),
            'modal' => __('Modal', 'gatey'),
        ];
    }
    public function get_name()
    {
        return 'gatey_authenticator';
    }
    public function get_title()
    {
        return __('Gatey Authenticator', 'gatey');
    }
    public function get_icon()
    {
        return 'eicon-lock-user';
    }

    /* ---------- Controls ---------- */
    protected function register_controls()
    {

        $this->start_controls_section('pattern-block', ['label' => __('Pattern', 'gatey')]);

        $options = [];
        $patterns = get_posts([
            'post_type' => 'wp_block',
            's' => 'gatey',
            'posts_per_page' => 200,
            'orderby' => 'title',
            'order' => 'ASC',
        ]);
        foreach ($patterns as $p) {
            $options[$p->ID] = $p->post_title ?: $p->ID;
        }

        $this->add_control('pattern', [
            'label' => __('Pattern ID', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT2,
            'options' => $options,
            'label_block' => true,
            'multiple' => false,
        ]);

        $this->end_controls_section();

        $this->start_controls_section('overrides-block', ['label' => __('Overrides', 'gatey')]);

        $this->add_control('screen', [
            'label' => __('Screen', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$SCREENS,
        ]);
        $this->add_control('variation', [
            'label' => __('Variation', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$VARIATIONS,
        ]);
        $this->add_control('colormode', [
            'label' => __('Color mode', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$COLOR_MODES,
        ]);
        $this->add_control('language', [
            'label' => __('Language', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$LANGUAGES,
        ]);
        $this->add_control('direction', [
            'label' => __('Direction', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$DIRECTIONS,
        ]);
        $this->add_control('totp', ['label' => __('TOTP Issuer', 'gatey'), 'type' => \Elementor\Controls_Manager::TEXT]);

        $this->add_control('showopen', ['label' => __('Show Open Button', 'gatey'), 'type' => \Elementor\Controls_Manager::SWITCHER, 'return_value' => 'true']);
        $this->add_control('open', ['label' => __('Open Button Title', 'gatey'), 'type' => \Elementor\Controls_Manager::TEXT]);

        $this->add_control('signingin', ['label' => __('Signing‑in message', 'gatey'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('signingout', ['label' => __('Signing‑out message', 'gatey'), 'type' => \Elementor\Controls_Manager::TEXT]);
        $this->add_control('redirecting', ['label' => __('Redirecting message', 'gatey'), 'type' => \Elementor\Controls_Manager::TEXT]);

        $this->end_controls_section();
    }

    protected function render()
    {
        $all = $this->get_settings_for_display();

        $allowed = ['screen', 'variation', 'colormode', 'language', 'direction', 'totp', 'showopen', 'open', 'signingin', 'signingout', 'redirecting'];
        $atts = array_intersect_key($all, array_flip($allowed));
        $atts = array_filter($atts, fn($v) => !is_array($v) && !is_object($v) && $v != '');
        $atts['id'] = $all['pattern'];

        gatey_do_shortcode('gatey', $atts);
    }
}

class Gatey_Account_Attribute_Widget extends Gatey_Base_Widget
{

    private const TAGS = ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    public function get_name()
    {
        return 'gatey_account_attribute';
    }
    public function get_title()
    {
        return __('Gatey Account attribute', 'gatey');
    }
    public function get_icon()
    {
        return 'eicon-user-circle-o';
    }

    /* ---------- Controls ---------- */
    protected function register_controls()
    {

        $this->start_controls_section('content', ['label' => __('Content', 'gatey')]);

        $this->add_control('component', [
            'label' => __('Component', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => array_combine(self::TAGS, self::TAGS),
            'default' => 'div',
        ]);
        $this->add_control('attribute', [
            'label' => __('Attribute', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => ['sub' => __('Username', 'gatey'), 'preferred_username' => __('Preferred Username', 'gatey'), 'email' => __('Email', 'gatey'), 'phone_number' => __('Phone Number', 'gatey'), 'name' => __('Name', 'gatey'), 'given_name' => __('Given Name', 'gatey'), 'family_name' => __('Family Name', 'gatey'), 'middle_name' => __('Middle Name', 'gatey'), 'nickname' => __('Nickname', 'gatey'), 'gender' => __('Gender', 'gatey'), 'birthdate' => __('Birthdate', 'gatey'), 'address' => __('Address', 'gatey'), 'picture' => __('Picture', 'gatey'), 'website' => __('Website', 'gatey'), 'zoneinfo' => __('Zoneinfo', 'gatey'), 'locale' => __('Locale', 'gatey'), 'custom' => __('Custom', 'gatey')],
        ]);
        $this->add_control('custom', [
            'label' => __('Custom', 'gatey'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'condition' => ['attribute' => 'custom'],
        ]);
        $this->add_control('prefix', [
            'label' => __('Prefix', 'gatey'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '',
        ]);
        $this->add_control('postfix', [
            'label' => __('Postfix', 'gatey'),
            'type' => \Elementor\Controls_Manager::TEXT,
            'default' => '',
        ]);
        $this->add_control('colormode', [
            'label' => __('Color mode', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$COLOR_MODES,
        ]);
        $this->add_control('language', [
            'label' => __('Language', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$LANGUAGES,
        ]);
        $this->add_control('direction', [
            'label' => __('Direction', 'gatey'),
            'type' => \Elementor\Controls_Manager::SELECT,
            'options' => self::$DIRECTIONS,
        ]);
        $this->add_control('link', ['label' => __('Link', 'gatey'), 'type' => \Elementor\Controls_Manager::URL, 'placeholder' => 'https://', 'show_external' => true]);

        $this->end_controls_section();

        $this->start_controls_section('style', [
            'label' => __('Style', 'gatey'),
            'tab' => \Elementor\Controls_Manager::TAB_STYLE,
        ]);

        $this->start_controls_tabs('tabs_normal_hover');

        /* --- Normal tab --- */
        $this->start_controls_tab('tab_normal', ['label' => __('Normal', 'gatey')]);

        $this->add_control('color', [
            'label' => __('Text color', 'gatey'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => ['{{WRAPPER}}' => 'color: {{VALUE}};'],
        ]);
        $this->add_group_control(\Elementor\Group_Control_Typography::get_type(), [
            'name' => 'typography',
            'selector' => '{{WRAPPER}}',
        ]);
        $this->add_group_control(\Elementor\Group_Control_Text_Shadow::get_type(), [
            'name' => 'shadow',
            'selector' => '{{WRAPPER}}',
        ]);
        $this->add_group_control(\Elementor\Group_Control_Border::get_type(), [
            'name' => 'border',
            'selector' => '{{WRAPPER}}',
        ]);

        $this->end_controls_tab();

        /* --- Hover tab --- */
        $this->start_controls_tab('tab_hover', ['label' => __('Hover', 'gatey')]);

        $this->add_control('hover_color', [
            'label' => __('Text color', 'gatey'),
            'type' => \Elementor\Controls_Manager::COLOR,
            'selectors' => ['{{WRAPPER}}:hover' => 'color: {{VALUE}};'],
        ]);
        $this->add_group_control(\Elementor\Group_Control_Typography::get_type(), [
            'name' => 'hover_typography',
            'selector' => '{{WRAPPER}}:hover',
        ]);
        $this->add_group_control(\Elementor\Group_Control_Text_Shadow::get_type(), [
            'name' => 'hover_shadow',
            'selector' => '{{WRAPPER}}:hover',
        ]);
        $this->add_group_control(\Elementor\Group_Control_Border::get_type(), [
            'name' => 'hover_border',
            'selector' => '{{WRAPPER}}:hover',
        ]);

        $this->end_controls_tab();
        $this->end_controls_tabs();
        $this->end_controls_section();
    }

    /* ---------- Render ---------- */
    protected function render()
    {
        $all = $this->get_settings_for_display();

        $allowed = ['attribute', 'custom', 'prefix', 'postfix', 'component', 'colormode', 'language', 'direction'];
        $atts = array_intersect_key($all, array_flip($allowed));

        $atts = array_filter($atts, fn($v) => !is_array($v) && !is_object($v));

        if (!empty($all['link']['url'])) {
            $lnk = $all['link'];
            $link = ' href="' . esc_url($lnk['url']) . '"';
            if ($lnk['is_external']) {
                $link .= ' target="_blank"';
            }
            $rels = [];
            if ($lnk['is_external']) {
                $rels[] = 'noopener';
            }
            if ($lnk['nofollow']) {
                $rels[] = 'nofollow';
            }
            if ($lnk['custom_attributes']) {
                $cust_attrs = explode(',', $lnk['custom_attributes']);
                foreach ($cust_attrs as $pair) {
                    [$key, $value] = explode('|', $pair, 2);
                    $link .= ' ' . esc_attr($key) . '="' . esc_attr($value) . '"';
                }
            }
            if ($rels) {
                $link .= ' rel="' . esc_attr(implode(' ', $rels)) . '"';
            }
            gatey_do_shortcode('gatey-account', $atts, $link);
        } else {
            gatey_do_shortcode('gatey-account', $atts);
        }
    }
}

add_action('elementor/widgets/register', static function ($m) {
    $m->register(new \Gatey_Authenticator_Widget());
    $m->register(new \Gatey_Account_Attribute_Widget());
});
