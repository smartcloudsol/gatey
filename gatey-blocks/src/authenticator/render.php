<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$gatey_hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$gatey_bid = 'gatey_authenticator_' . $gatey_hash;
$gatey_uid = isset($attributes['uid']) ? sanitize_key($attributes['uid']) : '';
?>
<div gatey-authenticator id="<?php echo esc_html($gatey_bid) ?>" data-is-preview="gatey-is-preview"
	data-class="wp-block-css-box-<?php echo esc_attr($gatey_uid) ?>"
	data-screen="<?php echo esc_html(array_key_exists('screen', $attributes) ? $attributes['screen'] : 'signIn') ?>"
	data-variation="<?php echo esc_html(array_key_exists('variation', $attributes) ? $attributes['variation'] : 'default') ?>"
	data-color-mode="<?php echo esc_html(array_key_exists('colorMode', $attributes) ? $attributes['colorMode'] : 'system') ?>"
	data-language="<?php echo esc_html(array_key_exists('language', $attributes) ? $attributes['language'] : 'system') ?>"
	data-direction="<?php echo esc_html(array_key_exists('direction', $attributes) ? $attributes['direction'] : 'auto') ?>"
	data-show-open-button="<?php echo esc_html(array_key_exists('showOpenButton', $attributes) ? ($attributes['showOpenButton'] ? 'true' : 'false') : '') ?>"
	data-open-button-title="<?php echo esc_html(array_key_exists('openButtonTitle', $attributes) ? $attributes['openButtonTitle'] : '') ?>"
	data-signing-in-message="<?php echo esc_html(array_key_exists('signingInMessage', $attributes) ? $attributes['signingInMessage'] : '') ?>"
	data-signing-out-message="<?php echo esc_html(array_key_exists('signingOutMessage', $attributes) ? $attributes['signingOutMessage'] : '') ?>"
	data-redirecting-message="<?php echo esc_html(array_key_exists('redirectingMessage', $attributes) ? $attributes['redirectingMessage'] : '') ?>"
	data-totp-issuer="<?php echo esc_html(array_key_exists('totpIssuer', $attributes) ? $attributes['totpIssuer'] : '') ?>"
	<?php echo wp_kses_data(get_block_wrapper_attributes()) ?>>
	<div style="display: none;">
		<?php echo esc_html($content) ?>
	</div>
</div>
<?php
$gatey_raw = isset($attributes['customCSS']) ? $attributes['customCSS'] : '';
if (!current_user_can('unfiltered_html')) {
	$gatey_raw = wp_kses($gatey_raw, []);
}
if ($gatey_uid) {
	$gatey_scope = ".wp-block-css-box-$gatey_uid";
	$gatey_css = str_replace('selector', $gatey_scope, $gatey_raw);
	echo "<style id='css-box-" . esc_attr($gatey_uid) . "'>" . esc_html($gatey_css) . "</style>";
}
?>