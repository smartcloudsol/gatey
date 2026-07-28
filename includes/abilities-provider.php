<?php
/**
 * Gatey native WordPress Abilities API provider.
 *
 * @package gatey
 */

namespace SmartCloud\WPSuite\Gatey\Abilities;

use SmartCloud\WPSuite\Hub\Abilities\Product_Provider_Base;
use WP_Error;

if (!defined('ABSPATH')) {
    exit;
}

final class Provider extends Product_Provider_Base
{
    /** @var string[] */
    private array $components = array(
        'authenticator',
        'authenticator-custom-area',
        'form-fields',
        'account-attribute',
    );

    /** @var string[] */
    private array $blocks = array(
        'gatey/authenticator',
        'gatey/account-attribute',
        'gatey/custom-block',
        'gatey/form-field',
    );

    private string $plugin_path;

    public function __construct()
    {
        $this->plugin_path = defined('GATEY_PATH') ? GATEY_PATH : dirname(__DIR__) . '/';

        parent::__construct(
            'gatey',
            'Gatey',
            'gatey',
            'gatey',
            '1.0.0',
            defined('GATEY_VERSION') ? GATEY_VERSION : '',
            'gatey',
            array('gatey/')
        );
    }

    protected function extra_abilities(): array
    {
        return array(
            array(
                'suffix' => 'get-site-settings',
                'description' => 'Return explicitly allowlisted non-secret Gatey settings.',
                'method' => 'get_site_settings',
                'input_schema' => $this->empty_input_schema(),
            ),
        );
    }

    public function get_runtime_capabilities(array $input = array()): array
    {
        $settings = $this->safe_settings();
        $block_status = $this->block_registration_status($this->blocks);
        $missing = $settings['missing_requirements'];

        foreach ($block_status as $block_name => $registered) {
            if (!$registered) {
                $missing[] = 'block-not-registered:' . $block_name;
            }
        }

        return array(
            'provider' => $this->provider_id,
            'provider_version' => $this->plugin_version,
            'contract_version' => $this->contract_version,
            'components' => $this->components,
            'block_registration' => $block_status,
            'materialization_supported' => true,
            'runtime_ready' => empty($missing),
            'missing_requirements' => array_values(array_unique($missing)),
            'warnings' => array(),
        );
    }

    public function list_components(array $input = array()): array
    {
        $items = array();
        foreach ($this->components as $component) {
            $contract = $this->component_contract($component);
            $items[] = array(
                'id' => $component,
                'label' => $contract['label'],
                'block_names' => $contract['block_names'],
                'required_registered_block_types' => $contract['block_names'],
                'materializable' => true,
            );
        }

        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'components' => $items,
        );
    }

    public function get_component_schema(array $input): array|WP_Error
    {
        $component = sanitize_key((string) ($input['component'] ?? ''));
        if (!in_array($component, $this->components, true)) {
            return new WP_Error('gatey_component_not_available', __('Unknown Gatey component.', 'gatey'));
        }

        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'component' => $component,
            'semantic_schema' => array(
                'type' => 'object',
                'description' => 'Gatey semantic attributes. Fixed block attributes are derived from the current Gatey block.json files.',
                'additionalProperties' => true,
            ),
            'block_contract' => $this->component_contract($component),
        );
    }

    public function materialize_component(array $input): array|WP_Error
    {
        $component = sanitize_key((string) ($input['component'] ?? ''));
        if (!in_array($component, $this->components, true)) {
            return new WP_Error('gatey_component_not_available', __('Unknown Gatey component.', 'gatey'));
        }

        $spec = is_array($input['spec'] ?? null) ? $input['spec'] : array();
        $blocks = $this->materialize_blocks($component, $spec);
        if (is_wp_error($blocks)) {
            return $blocks;
        }

        $runtime = $this->get_runtime_capabilities();

        return $this->materialization_result(
            $component,
            $blocks,
            (bool) $runtime['runtime_ready'],
            $runtime['missing_requirements'],
            $runtime['warnings']
        );
    }

    public function validate_block_tree(array $input): array
    {
        $blocks = is_array($input['blocks'] ?? null) ? $input['blocks'] : array();
        $errors = array();
        $this->validate_nodes($blocks, '', null, array(), $errors);

        return $this->validation_result($blocks, $errors);
    }

    public function get_site_settings(array $input = array()): array
    {
        return array(
            'provider' => $this->provider_id,
            'contract_version' => $this->contract_version,
            'settings' => $this->safe_settings(),
        );
    }

    private function materialize_blocks(string $component, array $spec): array|WP_Error
    {
        if ($component === 'account-attribute') {
            return array($this->block('gatey/account-attribute', $this->filter_attrs($this->plugin_path, 'gatey/account-attribute', $spec)));
        }

        if ($component === 'form-fields') {
            $fields = $this->resolve_fields($spec);
            if (is_wp_error($fields)) {
                return $fields;
            }
            return array_map(fn(array $field): array => $this->block('gatey/form-field', $this->filter_attrs($this->plugin_path, 'gatey/form-field', $field)), $fields);
        }

        if ($component === 'authenticator-custom-area') {
            return array($this->custom_area_block($spec));
        }

        $attrs = $this->filter_attrs($this->plugin_path, 'gatey/authenticator', $spec);
        $attrs['screen'] = (string) ($attrs['screen'] ?? 'signIn');
        $inner_blocks = array();

        foreach (($spec['custom_areas'] ?? array()) as $area) {
            if (is_array($area)) {
                $inner_blocks[] = $this->custom_area_block($area);
            }
        }

        return array($this->block('gatey/authenticator', $attrs, $inner_blocks));
    }

    private function custom_area_block(array $spec): array
    {
        $attrs = $this->filter_attrs($this->plugin_path, 'gatey/custom-block', $spec);
        $attrs['component'] = (string) ($attrs['component'] ?? 'Global');
        $attrs['part'] = (string) ($attrs['part'] ?? 'Header');
        $attrs['anchor'] = ($attrs['component'] !== 'Global' ? $attrs['component'] . '-' : '') . $attrs['part'];

        $inner_blocks = array();
        if ($attrs['part'] === 'FormFields' && in_array($attrs['component'], array('SignUp', 'EditAccount'), true)) {
            $fields = $this->resolve_fields(array_merge($spec, array('component' => $attrs['component'])));
            if (is_array($fields)) {
                foreach ($fields as $field) {
                    $inner_blocks[] = $this->block('gatey/form-field', $this->filter_attrs($this->plugin_path, 'gatey/form-field', $field));
                }
            }
        }

        return $this->block('gatey/custom-block', $attrs, $inner_blocks);
    }

    private function resolve_fields(array $spec): array|WP_Error
    {
        $fields = $spec['fields'] ?? $this->default_fields_for_component((string) ($spec['component'] ?? 'SignUp'));
        if (!is_array($fields)) {
            return new WP_Error('gatey_invalid_component_spec', __('Gatey fields must be an array.', 'gatey'));
        }

        $resolved = array();
        $seen = array();
        foreach ($fields as $field) {
            if (!is_array($field)) {
                return new WP_Error('gatey_invalid_component_spec', __('Each Gatey field must be an object.', 'gatey'));
            }
            if (($field['attribute'] ?? '') === 'custom' && trim((string) ($field['custom'] ?? '')) === '') {
                return new WP_Error('gatey_invalid_component_spec', __('Custom Gatey fields require a custom attribute name.', 'gatey'));
            }
            $key = (string) ($field['attribute'] ?? '');
            if ($key === 'custom') {
                $key .= ':' . trim((string) ($field['custom'] ?? ''));
            }
            if ($key !== '' && isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $resolved[] = $field;
        }

        return $resolved;
    }

    private function default_fields_for_component(string $component): array
    {
        $settings = $this->settings_object();
        $login = is_object($settings) && isset($settings->loginMechanisms) ? (array) $settings->loginMechanisms : array();
        $signup = is_object($settings) && isset($settings->signUpAttributes) ? (array) $settings->signUpAttributes : array();

        $attributes = $component === 'EditAccount'
            ? $signup
            : array_merge($login, array('password', 'confirm_password'), $signup);

        $fields = array();
        foreach (array_unique(array_filter(array_map('strval', $attributes))) as $attribute) {
            $fields[] = array(
                'attribute' => $attribute,
                'required' => $component !== 'EditAccount',
                'autocomplete' => $this->autocomplete_for($attribute),
            );
        }

        return $fields;
    }

    private function autocomplete_for(string $attribute): string
    {
        return match ($attribute) {
            'email' => 'email',
            'phone_number' => 'tel',
            'username' => 'username',
            'password', 'confirm_password' => 'new-password',
            default => 'off',
        };
    }

    private function validate_nodes(array $blocks, string $path, ?string $parent, array $ancestors, array &$errors): void
    {
        if ($this->count_blocks($blocks) > 500) {
            $errors[] = $this->validation_issue('gatey_block_tree_too_large', 'The Gatey block tree exceeds the provider block limit.', $path);
            return;
        }

        foreach ($blocks as $index => $block) {
            $current_path = $path . '/' . $index;
            if (!is_array($block)) {
                $errors[] = $this->validation_issue('gatey_invalid_block', 'Block node must be an object.', $current_path);
                continue;
            }

            $name = (string) ($block['blockName'] ?? '');
            if (!in_array($name, $this->blocks, true)) {
                $errors[] = $this->validation_issue('gatey_unknown_block', 'Only current Gatey blocks are accepted.', $current_path);
                continue;
            }

            if ($parent === 'gatey/authenticator' && $name !== 'gatey/custom-block') {
                $errors[] = $this->validation_issue('gatey_authenticator_child_invalid', 'gatey/authenticator may contain only gatey/custom-block children.', $current_path);
            }

            if ($name === 'gatey/custom-block') {
                $component = (string) ($block['attrs']['component'] ?? 'Global');
                $part = (string) ($block['attrs']['part'] ?? '');
                $allowed_parts = in_array($component, array('SignUp', 'EditAccount'), true) ? array('Header', 'FormFields', 'Footer') : array('Header', 'Footer');
                if (!in_array($part, $allowed_parts, true)) {
                    $errors[] = $this->validation_issue('gatey_invalid_part', 'The Gatey custom part is not valid for the selected component.', $current_path . '/attrs/part');
                }
            }

            if ($name === 'gatey/form-field') {
                $custom_parent = $this->nearest_ancestor($ancestors, 'gatey/custom-block');
                if (
                    $custom_parent === null
                    || !in_array((string) ($custom_parent['attrs']['component'] ?? ''), array('SignUp', 'EditAccount'), true)
                    || (string) ($custom_parent['attrs']['part'] ?? '') !== 'FormFields'
                ) {
                    $errors[] = $this->validation_issue('gatey_form_field_context_invalid', 'gatey/form-field is valid only inside a SignUp or EditAccount FormFields override.', $current_path);
                }
                if (($block['attrs']['attribute'] ?? '') === 'custom' && trim((string) ($block['attrs']['custom'] ?? '')) === '') {
                    $errors[] = $this->validation_issue('gatey_custom_field_name_missing', 'A Gatey custom form field requires the custom attribute name.', $current_path . '/attrs/custom');
                }
            }

            $this->validate_unknown_attrs($name, is_array($block['attrs'] ?? null) ? $block['attrs'] : array(), $current_path, $errors);
            $next_ancestors = array_merge($ancestors, array($block));
            $this->validate_nodes(is_array($block['innerBlocks'] ?? null) ? $block['innerBlocks'] : array(), $current_path . '/innerBlocks', $name, $next_ancestors, $errors);
        }
    }

    private function validate_unknown_attrs(string $block_name, array $attrs, string $path, array &$errors): void
    {
        $allowed = array_keys($this->block_attributes($this->plugin_path, $block_name));
        foreach (array_keys($attrs) as $attr) {
            if (!in_array($attr, $allowed, true) && !in_array($attr, array('anchor', 'className', 'style', 'lock'), true)) {
                $errors[] = $this->validation_issue('gatey_unknown_attribute', 'Unknown Gatey block attribute.', $path . '/attrs/' . $attr);
            }
        }
    }

    private function nearest_ancestor(array $ancestors, string $name): ?array
    {
        foreach (array_reverse($ancestors) as $ancestor) {
            if (($ancestor['blockName'] ?? '') === $name) {
                return $ancestor;
            }
        }

        return null;
    }

    private function component_contract(string $component): array
    {
        $map = array(
            'authenticator' => array('label' => 'Authenticator', 'block_names' => array('gatey/authenticator', 'gatey/custom-block', 'gatey/form-field')),
            'authenticator-custom-area' => array('label' => 'Authenticator custom area', 'block_names' => array('gatey/custom-block', 'gatey/form-field')),
            'form-fields' => array('label' => 'Authenticator form fields', 'block_names' => array('gatey/form-field')),
            'account-attribute' => array('label' => 'Account attribute', 'block_names' => array('gatey/account-attribute')),
        );

        $contract = $map[$component];
        $contract['attributes'] = array();
        foreach ($contract['block_names'] as $block_name) {
            $contract['attributes'][$block_name] = $this->block_attributes($this->plugin_path, $block_name);
        }

        return $contract;
    }

    private function safe_settings(): array
    {
        $settings = $this->settings_object();
        $configuration = array(
            'login_mechanisms' => is_object($settings) && isset($settings->loginMechanisms) ? array_values(array_map('strval', (array) $settings->loginMechanisms)) : array(),
            'sign_up_attributes' => is_object($settings) && isset($settings->signUpAttributes) ? array_values(array_map('strval', (array) $settings->signUpAttributes)) : array(),
            'hide_sign_up' => is_object($settings) && !empty($settings->hideSignUp),
            'enabled_social_provider_names' => is_object($settings) && isset($settings->socialProviders) ? array_values(array_map('strval', (array) $settings->socialProviders)) : array(),
            'passwordless_modes' => is_object($settings) && isset($settings->passwordlessSettings) ? array_values(array_map('strval', (array) $settings->passwordlessSettings)) : array(),
            'supported_authenticator_screens' => array('signIn', 'signUp', 'forgotPassword', 'setupTotp', 'editAccount', 'changePassword'),
            'supported_custom_components' => array('Global', 'ChangePassword', 'ConfirmSignIn', 'ConfirmSignUp', 'ConfirmResetPassword', 'ConfirmVerifyUser', 'EditAccount', 'ForceNewPassword', 'ForgotPassword', 'SetupTotp', 'SignIn', 'SignUp', 'VerifyUser'),
            'supported_custom_parts' => array('Header', 'Footer', 'FormFields'),
            'client_only_configuration_unavailable_to_php' => true,
        );

        return array(
            'configuration' => $configuration,
            'block_registration' => $this->block_registration_status($this->blocks),
            'missing_requirements' => array(),
        );
    }

    private function settings_object(): mixed
    {
        if (!function_exists('\SmartCloud\WPSuite\Gatey\gatey')) {
            return null;
        }

        $plugin = \SmartCloud\WPSuite\Gatey\gatey();
        if (!is_object($plugin)) {
            return null;
        }

        $ref = new \ReflectionObject($plugin);
        if (!$ref->hasProperty('admin')) {
            return null;
        }

        $prop = $ref->getProperty('admin');
        $prop->setAccessible(true);
        $admin = $prop->getValue($plugin);

        return is_object($admin) && method_exists($admin, 'getSettings') ? $admin->getSettings() : null;
    }
}

(new Provider())->bootstrap();
