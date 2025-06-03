<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
global $post;
$bid = 'gatey-authenticator-' . wp_rand();
?>
<div id="<?php echo esc_html($bid) ?>">
	<div style="display: none;">
		<?php echo esc_html($content) ?>
	</div>
</div>
<?php
$data = array(
	'id' => $bid,
	'is_preview' => 'gatey-is-preview',
	'screen' => array_key_exists('screen', $attributes) ? esc_html($attributes['screen']) : 'signIn',
	'variation' => array_key_exists('variation', $attributes) ? esc_html($attributes['variation']) : 'default',
	'color_mode' => array_key_exists('colorMode', $attributes) ? esc_html($attributes['colorMode']) : 'default',
	'signing_in_message' => array_key_exists('signingInMessage', $attributes) ? esc_html($attributes['signingInMessage']) : '',
	'signing_out_message' => array_key_exists('signingOutMessage', $attributes) ? esc_html($attributes['signingOutMessage']) : '',
	'redirecting_message' => array_key_exists('redirectingMessage', $attributes) ? esc_html($attributes['redirectingMessage']) : '',
);
$inlineScript = '{' .
	'	const gateyAuthenticatorEvent = ' . wp_json_encode($data) . ';' .
	'	const handler = () => {' .
	'		jQuery(document).trigger("gatey-block", gateyAuthenticatorEvent);' .
	'	};' .
	'	jQuery(handler);' .
	'}';
wp_add_inline_script('gatey-authenticator-view-script', $inlineScript, 'before');
?>