<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
?>
<p gatey-account-attribute-<?php
echo array_key_exists('attribute', $attributes) && strcmp($attributes['attribute'], 'custom') != 0 ?
	esc_html($attributes['attribute'])
	:
	(array_key_exists('custom', $attributes) ?
		'custom-' . esc_html($attributes['custom'])
		:
		''
	) ?>></p>