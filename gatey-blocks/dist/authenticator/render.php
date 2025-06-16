<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
global $post;
$bid = 'gatey-authenticator-' . wp_rand();
$language = array_key_exists('language', $attributes) ? $attributes['language'] : 'en';
$direction = array_key_exists('direction', $attributes) ? $attributes['direction'] : ($language === 'ar' || $language === 'he' ? 'rtl' : 'ltr');
?>
<div gatey-authenticator id="<?php echo esc_html($bid) ?>" data-is-preview="gatey-is-preview"
	data-screen="<?php echo esc_html(array_key_exists('screen', $attributes) ? $attributes['screen'] : 'signIn') ?>"
	data-variation="<?php echo esc_html(array_key_exists('variation', $attributes) ? $attributes['variation'] : 'default') ?>"
	data-color-mode="<?php echo esc_html(array_key_exists('colorMode', $attributes) ? $attributes['colorMode'] : 'system') ?>"
	data-language="<?php echo esc_html($language) ?>" data-direction="<?php echo esc_html($direction) ?>"
	data-show-open-button="<?php echo esc_html(array_key_exists('showOpenButton', $attributes) ? ($attributes['showOpenButton'] ? 'true' : 'false') : '') ?>"
	data-open-button-title="<?php echo esc_html(array_key_exists('openButtonTitle', $attributes) ? $attributes['openButtonTitle'] : '') ?>"
	data-signing-in-message="<?php echo esc_html(array_key_exists('signingInMessage', $attributes) ? $attributes['signingInMessage'] : '') ?>"
	data-signing-out-message="<?php echo esc_html(array_key_exists('signingOutMessage', $attributes) ? $attributes['signingOutMessage'] : '') ?>"
	data-redirecting-message="<?php echo esc_html(array_key_exists('redirectingMessage', $attributes) ? $attributes['redirectingMessage'] : '') ?>"
	<?php echo get_block_wrapper_attributes() ?>>
	<div style="display: none;">
		<?php echo esc_html($content) ?>
	</div>
</div>
<?php
$inlineScript = 'jQuery(() => jQuery(document).trigger("gatey-block", "' . $bid . '"));';
wp_add_inline_script('gatey-authenticator-view-script', $inlineScript, 'before');
?>