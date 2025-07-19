<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$bid = 'gatey_account_attribute_' . $hash;
?>
<div gatey-form-field
	data-attribute="<?php echo esc_html(array_key_exists('attribute', $attributes) ? $attributes['attribute'] : 'transient') ?>"
	data-custom="<?php echo esc_html(array_key_exists('custom', $attributes) ? $attributes['custom'] : '') ?>"
	data-default-checked="<?php echo esc_html(array_key_exists('defaultChecked', $attributes) ? $attributes['defaultChecked'] : '0') ?>"
	data-default-value="<?php echo esc_html(array_key_exists('defaultValue', $attributes) ? $attributes['defaultValue'] : '') ?>"
	data-required="<?php echo esc_html(array_key_exists('required', $attributes) ? $attributes['required'] : '0') ?>"
	data-hidden="<?php echo esc_html(array_key_exists('hidden', $attributes) ? $attributes['hidden'] : '0') ?>"
	data-label="<?php echo esc_html(array_key_exists('label', $attributes) ? $attributes['label'] : '') ?>"
	data-label-hidden="<?php echo esc_html(array_key_exists('labelHidden', $attributes) ? $attributes['labelHidden'] : '0') ?>"
	data-placeholder="<?php echo esc_html(array_key_exists('placeholder', $attributes) ? $attributes['placeholder'] : '') ?>"
	data-autocomplete="<?php echo esc_html(array_key_exists('autocomplete', $attributes) ? $attributes['autocomplete'] : 'off') ?>"
	data-dial-code="<?php echo esc_html(array_key_exists('dialCode', $attributes) ? $attributes['dialCode'] : '') ?>"
	data-dial-code-list="<?php echo esc_html(array_key_exists('dialCodeList', $attributes) ? implode(', ', $attributes['dialCodeList']) : '') ?>"
	data-country-code-list="<?php echo esc_html(array_key_exists('countryCodeList', $attributes) ? implode(', ', $attributes['countryCodeList']) : '') ?>"
	<?php echo get_block_wrapper_attributes() ?>> &nbsp;</div>