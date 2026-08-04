<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}
$gatey_hash = substr(md5(serialize($attributes)), 0, 6) . '_' . wp_rand();
$gatey_bid = 'smartcloud_gatey_authenticator_' . $gatey_hash;

// Encode all attributes into a single data-config attribute
$gatey_config = base64_encode(wp_json_encode($attributes));

$gatey_fallback = '';
if (isset($block) && is_object($block) && !empty($block->inner_blocks)) {
    foreach ($block->inner_blocks as $gatey_inner_block) {
        if (($gatey_inner_block->name ?? '') === 'wpsuite/react-fallback') {
            $gatey_fallback .= $gatey_inner_block->render();
        }
    }
}
?>
<div smartcloud-gatey-authenticator id="<?php echo esc_html($gatey_bid) ?>"
    data-is-preview="smartcloud-gatey-is-preview" data-config="<?php echo esc_attr($gatey_config) ?>" <?php echo wp_kses_data(get_block_wrapper_attributes()) ?>>
    <?php echo wp_kses_post($gatey_fallback) ?>
    <div class="smartcloud-gatey-authenticator__mount"></div>
    <div class="smartcloud-gatey-authenticator__config" hidden>
        <?php echo esc_html($content) ?>
    </div>
</div>
