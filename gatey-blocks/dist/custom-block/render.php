<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$attr = array_key_exists('component', $attributes) ? $attributes['component'] : '';
$attr = (strlen(trim($attr)) > 0 ? $attr . '-' : '') . (array_key_exists('part', $attributes) ? $attributes['part'] : '');
?>
<div custom-part="<?php echo esc_html($attr) ?>" style="display: none;">
	<?php echo esc_html($content) ?>
</div>