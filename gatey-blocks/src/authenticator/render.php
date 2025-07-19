<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$bid = 'gatey_authenticator_' . $hash;
$uid = isset($attributes['uid']) ? sanitize_key($attributes['uid']) : '';
$raw = isset($attributes['customCSS']) ? $attributes['customCSS'] : '';
if (!current_user_can('unfiltered_html')) {
	$raw = wp_kses($raw, []);
}
if ($uid) {
	$scope = ".wp-block-css-box-$uid";
	$css = str_replace('selector', $scope, $raw);
	$style = "<style id='css-box-$uid'>$css</style>";
} else {
	$style = '';
}
?>
<div gatey-authenticator id="<?php echo esc_html($bid) ?>" data-is-preview="gatey-is-preview"
	data-class="wp-block-css-box-<?php echo esc_attr($uid) ?>"
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
	<?php echo get_block_wrapper_attributes() ?>>
	<div style="display: none;">
		<?php echo esc_html($content) ?>
	</div>
</div>
<?php echo $style; ?>