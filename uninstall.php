<?php
/**
 * Gatey uninstall cleanup.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

function gatey_uninstall_site(): void
{
    global $wpdb;

    delete_option('gatey');

    $value_pattern = $wpdb->esc_like('_transient_gatey_cognito_jwks_') . '%';
    $timeout_pattern = $wpdb->esc_like('_transient_timeout_gatey_cognito_jwks_') . '%';
    $transient_options = $wpdb->get_col( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Uninstall must enumerate plugin-owned dynamic transient rows.
        $wpdb->prepare(
            "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            $value_pattern,
            $timeout_pattern
        )
    );
    foreach ($transient_options as $option) {
        delete_option((string) $option);
    }
}

if (is_multisite()) {
    foreach (get_sites(array('fields' => 'ids', 'number' => 0)) as $gatey_site_id) {
        switch_to_blog((int) $gatey_site_id);
        gatey_uninstall_site();
        restore_current_blog();
    }
} else {
    gatey_uninstall_site();
}
