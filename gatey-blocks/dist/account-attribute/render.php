<?php
if (!defined('ABSPATH')) {
exit; // Exit if accessed directly.
}
$smartcloud_gatey_hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$smartcloud_gatey_bid = 'smartcloud_gatey_account_attribute_' . $smartcloud_gatey_hash;

// Encode all attributes into a single data-config attribute
$smartcloud_gatey_config = base64_encode(wp_json_encode($attributes));
?>
<div smartcloud-gatey-account-attribute id="<?php echo esc_html($smartcloud_gatey_bid) ?>"
data-is-preview="smartcloud-gatey-is-preview"
data-config="<?php echo esc_attr($smartcloud_gatey_config) ?>"
<?php echo wp_kses_data(get_block_wrapper_attributes()) ?>> &nbsp;</div>
