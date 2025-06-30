<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$hash = substr(md5(serialize($attributes)), 0, 6);
$bid = 'gatey_account_attribute_' . $hash;
?>
<div gatey-account-attribute id="<?php echo esc_html($bid) ?>" data-is-preview="gatey-is-preview"
	data-component="<?php echo esc_html(array_key_exists('component', $attributes) ? $attributes['component'] : 'div') ?>"
	data-attribute="<?php echo esc_html(array_key_exists('attribute', $attributes) ? $attributes['attribute'] : '') ?>"
	data-custom="<?php echo esc_html(array_key_exists('custom', $attributes) ? $attributes['custom'] : '') ?>"
	data-color-mode="<?php echo esc_html(array_key_exists('colorMode', $attributes) ? $attributes['colorMode'] : 'system') ?>"
	data-language="<?php echo esc_html(array_key_exists('language', $attributes) ? $attributes['language'] : 'en') ?>"
	data-direction="<?php echo esc_html(array_key_exists('direction', $attributes) ? $attributes['direction'] : 'auto') ?>"
	<?php echo get_block_wrapper_attributes() ?>> &nbsp;</div>