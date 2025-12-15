<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$gatey_attr = array_key_exists('component', $attributes) ? $attributes['component'] : '';
$gatey_attr = (strlen(trim($gatey_attr)) > 0 ? $gatey_attr . '-' : '') . (array_key_exists('part', $attributes) ? $attributes['part'] : '');
?>
<div custom-part="<?php echo esc_html($gatey_attr) ?>" style="display: none;">
	<?php echo esc_html($content) ?>
</div>