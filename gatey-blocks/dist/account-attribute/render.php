<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$bid = 'gatey_account_attribute_' . $hash;
?>
<div gatey-account-attribute id="<?php echo esc_html($bid) ?>" data-is-preview="gatey-is-preview"
	data-component="<?php echo esc_html(array_key_exists('component', $attributes) ? $attributes['component'] : 'div') ?>"
	data-attribute="<?php echo esc_html(array_key_exists('attribute', $attributes) ? $attributes['attribute'] : '') ?>"
	data-custom="<?php echo esc_html(array_key_exists('custom', $attributes) ? $attributes['custom'] : '') ?>"
	data-color-mode="<?php echo esc_html(array_key_exists('colorMode', $attributes) ? $attributes['colorMode'] : 'system') ?>"
	data-language="<?php echo esc_html(array_key_exists('language', $attributes) ? $attributes['language'] : 'en') ?>"
	data-direction="<?php echo esc_html(array_key_exists('direction', $attributes) ? $attributes['direction'] : 'auto') ?>"
	data-link="<?php echo esc_html(array_key_exists('link', $attributes) ? json_encode($attributes['link']) : '') ?>"
	data-prefix="<?php echo esc_html(array_key_exists('prefix', $attributes) ? $attributes['prefix'] : '') ?>"
	data-postfix="<?php echo esc_html(array_key_exists('postfix', $attributes) ? $attributes['postfix'] : '') ?>" <?php echo esc_attr(get_block_wrapper_attributes()) ?>> &nbsp;</div>