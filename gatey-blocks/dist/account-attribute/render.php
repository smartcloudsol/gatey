<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$attr = array_key_exists('attribute', $attributes) && strcmp($attributes['attribute'], 'custom') != 0 ?
	$attributes['attribute']
	:
	(array_key_exists('custom', $attributes) ?
		'custom-' . $attributes['custom']
		:
		''
	);
$tag = array_key_exists('component', $attributes) ? $attributes['component'] : 'div';

echo sprintf('<%1$s gatey-account-attribute-%2$s %3$s></%1$s>', esc_html($tag), esc_html($attr), get_block_wrapper_attributes());
?>