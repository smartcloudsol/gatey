<?php
namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) { exit; }

/** Read-only page lookup for the local sign-in path. Never changes page content. */
final class PageSuggestions
{
    public static function read(\WP_REST_Request $request): array|\WP_Error
    {
        if (!current_user_can('manage_options')) {
            return new \WP_Error('rest_forbidden', __('Forbidden', 'gatey'), array('status' => 403));
        }
        $query = $request->get_param('q') ?? '';
        if (!is_string($query) || strlen($query) > 200) {
            return new \WP_Error('gatey_page_search', __('Invalid page search.', 'gatey'), array('status' => 400));
        }
        $query = trim(sanitize_text_field($query));
        $path = trim($query, '/');
        global $wpdb;
        $ids = array();
        // An exact hierarchical path should not disappear behind a bounded broad search.
        if ($path !== '') {
            $exact = get_page_by_path($path, OBJECT, 'page');
            if ($exact && $exact->post_status === 'publish') { $ids[] = (int) $exact->ID; }
        }
        if ($query !== '' && ctype_digit($query)) { $ids[] = (int) $query; }
        $like = '%' . $wpdb->esc_like($query) . '%';
        $leaf = '%' . $wpdb->esc_like(basename($path)) . '%';
        $candidateIds = $wpdb->get_col($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'page' AND post_status = 'publish'
             AND (post_title LIKE %s OR post_name LIKE %s OR post_name LIKE %s)
             ORDER BY post_title ASC, ID ASC LIMIT 100",
            $like, $like, str_contains($path, '/') ? $leaf : $like
        ));
        $matches = array();
        foreach (array_unique(array_merge($ids, array_map('intval', $candidateIds))) as $id) {
            $page = get_post($id);
            if (!$page || $page->post_type !== 'page' || $page->post_status !== 'publish') { continue; }
            $uri = get_page_uri($page);
            if (!is_string($uri) || $uri === '' || strlen($uri) > 512
                || str_starts_with($uri, '//') || preg_match('/[\\\\\x00-\x20?#:]/', $uri)) { continue; }
            // Keep literal punctuation aligned with the SQL search; display filters
            // such as wptexturize can otherwise change an apostrophe after matching.
            $title = wp_strip_all_tags(html_entity_decode((string) $page->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            $haystacks = array($title, $page->post_name, rawurldecode($uri));
            $needle = str_contains($path, '/') ? $path : $query;
            $textMatch = $needle === '';
            foreach ($haystacks as $haystack) {
                if (stripos($haystack, $needle) !== false) { $textMatch = true; break; }
            }
            if (!$textMatch && !(ctype_digit($query) && (int) $query === $id)) { continue; }
            /* translators: 1: Page title, 2: Page path, 3: WordPress page ID. */
            $label = sprintf(__('%1$s · %2$s · #%3$d', 'gatey'), $title, $uri, $id);
            if (strlen($label) > 1024) {
                $label = (function_exists('mb_strcut') ? mb_strcut($label, 0, 1021, 'UTF-8') : wp_html_excerpt($label, 255, '')) . '…';
            }
            $matches[] = array('value' => $uri, 'label' => $label);
            if (count($matches) === 20) { break; }
        }
        return $matches;
    }
}
