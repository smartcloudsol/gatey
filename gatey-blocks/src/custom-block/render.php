<?php
if (!defined('ABSPATH')) {
	exit; // Exit if accessed directly.
}
$wpsuite_gatey_attr = array_key_exists('component', $attributes) ? $attributes['component'] : '';
$wpsuite_gatey_attr = (strlen(trim($wpsuite_gatey_attr)) > 0 ? $wpsuite_gatey_attr . '-' : '') . (array_key_exists('part', $attributes) ? $attributes['part'] : '');
?>
<div custom-part="<?php echo esc_html($wpsuite_gatey_attr) ?>" style="display: none;">
	<?php echo esc_html($content) ?>
</div>