<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$smartcloud_gatey_hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_gatey_bid = 'gatey_account_attribute_' . $smartcloud_gatey_hash;
?>
<div gatey-form-field
	data-attribute="<?php echo esc_html(array_key_exists('attribute', $attributes) ? $attributes['attribute'] : 'transient') ?>"
	data-custom="<?php echo esc_html(array_key_exists('custom', $attributes) ? $attributes['custom'] : '') ?>"
	data-default-checked="<?php echo esc_html(array_key_exists('defaultChecked', $attributes) ? $attributes['defaultChecked'] ? 'true' : 'false' : '') ?>"
	data-default-value="<?php echo esc_html(array_key_exists('defaultValue', $attributes) ? $attributes['defaultValue'] : '') ?>"
	data-required="<?php echo esc_html(array_key_exists('required', $attributes) ? $attributes['required'] ? 'true' : 'false' : '') ?>"
	data-hidden="<?php echo esc_html(array_key_exists('hidden', $attributes) ? $attributes['hidden'] ? 'true' : 'false' : '') ?>"
	data-label="<?php echo esc_html(array_key_exists('label', $attributes) ? $attributes['label'] : '') ?>"
	data-label-hidden="<?php echo esc_html(array_key_exists('labelHidden', $attributes) ? $attributes['labelHidden'] ? 'true' : 'false' : '') ?>"
	data-placeholder="<?php echo esc_html(array_key_exists('placeholder', $attributes) ? $attributes['placeholder'] : '') ?>"
	data-autocomplete="<?php echo esc_html(array_key_exists('autocomplete', $attributes) ? $attributes['autocomplete'] : 'off') ?>"
	data-dial-code="<?php echo esc_html(array_key_exists('dialCode', $attributes) ? $attributes['dialCode'] : '') ?>"
	data-dial-code-list="<?php echo esc_html(array_key_exists('dialCodeList', $attributes) ? implode(', ', $attributes['dialCodeList']) : '') ?>"
	data-country-code-list="<?php echo esc_html(array_key_exists('countryCodeList', $attributes) ? implode(', ', $attributes['countryCodeList']) : '') ?>"
	<?php echo wp_kses_data(get_block_wrapper_attributes()) ?>> &nbsp;</div>