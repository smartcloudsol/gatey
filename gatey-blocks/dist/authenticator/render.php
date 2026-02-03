<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$smartcloud_gatey_hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_gatey_bid = 'smartcloud_gatey_authenticator_' . $smartcloud_gatey_hash;
$smartcloud_gatey_uid = isset($attributes['uid']) ? sanitize_key($attributes['uid']) : '';
?>
<div smartcloud-gatey-authenticator id="<?php echo esc_html($smartcloud_gatey_bid) ?>"
	data-is-preview="smartcloud-gatey-is-preview"
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