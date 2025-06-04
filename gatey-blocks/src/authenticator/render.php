<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
global $post;
$bid = 'gatey-authenticator-' . wp_rand();
?>
<div gatey-authenticator id="<?php echo esc_html($bid) ?>" data-is-preview="gatey-is-preview"
	data-screen="<?php echo esc_html(array_key_exists('screen', $attributes) ? $attributes['screen'] : 'signIn') ?>"
	data-variation="<?php echo esc_html(array_key_exists('variation', $attributes) ? $attributes['variation'] : 'default') ?>"
	data-color-mode="<?php echo esc_html(array_key_exists('colorMode', $attributes) ? $attributes['colorMode'] : 'system') ?>"
	data-signing-in-message="<?php echo esc_html(array_key_exists('signingInMessage', $attributes) ? $attributes['signingInMessage'] : '') ?>"
	data-signing-out-message="<?php echo esc_html(array_key_exists('signingOutMessage', $attributes) ? $attributes['signingOutMessage'] : '') ?>"
	data-redirecting-message="<?php echo esc_html(array_key_exists('redirectingMessage', $attributes) ? $attributes['redirectingMessage'] : '') ?>">
	<div style="display: none;">
		<?php echo esc_html($content) ?>
	</div>
</div>
<?php
$inlineScript = '{' .
	'	const handler = () => {' .
	'			jQuery(document).trigger("gatey-block", "' . $bid . '");' .
	'	};' .
	'	jQuery(handler);' .
	'}';
wp_add_inline_script('gatey-authenticator-view-script', $inlineScript, 'before');
?>