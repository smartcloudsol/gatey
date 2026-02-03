<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$smartcloud_gatey_attr = array_key_exists('component', $attributes) ? $attributes['component'] : '';
$smartcloud_gatey_attr = (strlen(trim($smartcloud_gatey_attr)) > 0 ? $smartcloud_gatey_attr . '-' : '') . (array_key_exists('part', $attributes) ? $attributes['part'] : '');
?>
<div custom-part="<?php echo esc_html($smartcloud_gatey_attr) ?>" style="display: none;">
	<?php echo esc_html($content) ?>
</div>