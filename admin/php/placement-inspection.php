<?php
namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) { exit; }

/** Bounded, read-only Gutenberg inspection. Cached data never contains user permissions or URLs. */
final class PlacementInspection
{
    private const PAGE_LIMIT = 200;
    private const NODE_LIMIT = 4000;
    private const BYTE_LIMIT = 2097152;
    private const DEPTH_LIMIT = 8;
    private const CACHE_KEY = 'gatey_account_placement_v1';
    private static bool $hooksRegistered = false;

    public static function registerHooks(): void
    {
        if (self::$hooksRegistered) { return; }
        self::$hooksRegistered = true;
        add_action('save_post', array(self::class, 'invalidate'), 10, 2);
        add_action('deleted_post', array(self::class, 'invalidate'), 10, 2);
    }

    public static function invalidate(int $id, object $post): void
    {
        if (in_array($post->post_type, array('page', 'post', 'wp_block'), true)) { delete_transient(self::CACHE_KEY); }
    }

    public static function inspect(object $post, string $block): array
    {
        $budget = array('nodes' => self::NODE_LIMIT, 'bytes' => self::BYTE_LIMIT);
        $references = array();
        return self::content((string) ($post->post_content ?? ''), $block, $budget, $references, array(), 0);
    }

    private static function content(string $content, string $target, array &$budget, array &$references, array $ancestors, int $depth): array
    {
        if (strlen($content) > $budget['bytes'] || $depth > self::DEPTH_LIMIT) { return array('detected' => false, 'partial' => true); }
        $budget['bytes'] -= strlen($content);
        return self::blocks(parse_blocks($content), $target, $budget, $references, $ancestors, $depth);
    }

    private static function blocks(array $blocks, string $target, array &$budget, array &$references, array $ancestors, int $depth): array
    {
        $partial = false;
        foreach ($blocks as $block) {
            if (--$budget['nodes'] < 0 || $depth > self::DEPTH_LIMIT) { return array('detected' => false, 'partial' => true); }
            if (($block['blockName'] ?? '') === $target) { return array('detected' => true, 'partial' => $partial); }
            if (($block['blockName'] ?? '') === 'core/block') {
                $id = (int) ($block['attrs']['ref'] ?? 0);
                if ($id <= 0 || isset($ancestors[$id])) { $partial = true; continue; }
                if (!array_key_exists($id, $references)) { $references[$id] = get_post($id); }
                $reference = $references[$id];
                if (!$reference || $reference->post_type !== 'wp_block' || $reference->post_status !== 'publish') { $partial = true; continue; }
                $result = self::content((string) $reference->post_content, $target, $budget, $references, $ancestors + array($id => true), $depth + 1);
                if ($result['detected']) { return array('detected' => true, 'partial' => $partial || $result['partial']); }
                $partial = $partial || $result['partial'];
            }
            if (!empty($block['innerBlocks'])) {
                $result = self::blocks($block['innerBlocks'], $target, $budget, $references, $ancestors, $depth + 1);
                if ($result['detected']) { return array('detected' => true, 'partial' => $partial || $result['partial']); }
                $partial = $partial || $result['partial'];
            }
        }
        return array('detected' => false, 'partial' => $partial);
    }

    public static function accountUsage(): array
    {
        $key = self::CACHE_KEY;
        $cached = get_transient($key);
        if (is_array($cached) && isset($cached['matches'], $cached['partial'], $cached['inspected'])) { return $cached; }
        $ids = get_posts(array('post_type' => array('page', 'post'), 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => self::PAGE_LIMIT + 1, 'orderby' => 'ID', 'order' => 'ASC', 'no_found_rows' => true, 'suppress_filters' => true));
        $result = array('matches' => array(), 'partial' => count($ids) > self::PAGE_LIMIT, 'inspected' => 0);
        $budget = array('nodes' => self::NODE_LIMIT, 'bytes' => self::BYTE_LIMIT);
        $references = array();
        foreach (array_slice($ids, 0, self::PAGE_LIMIT) as $id) {
            if ($budget['nodes'] <= 0 || $budget['bytes'] <= 0) { $result['partial'] = true; break; }
            $post = get_post((int) $id);
            if (!$post || !in_array($post->post_type, array('page', 'post'), true) || $post->post_status !== 'publish') { $result['partial'] = true; continue; }
            $inspection = self::content((string) $post->post_content, 'gatey/account-attribute', $budget, $references, array(), 0);
            $result['inspected']++;
            if ($inspection['detected']) { $result['matches'][] = (int) $post->ID; }
            $result['partial'] = $result['partial'] || $inspection['partial'];
        }
        set_transient($key, $result, 300);
        return $result;
    }
}
