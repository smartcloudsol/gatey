<?php
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('OBJECT', 'OBJECT');
define('GATEY_SLUG', 'gatey');
define('GATEY_PATH', __DIR__ . '/');
$allowed = true; $checks = 0; $queries = 0; $pages = []; $routes = [];
function add_action(string $hook, callable $callback, int $priority = 10, int $arguments = 1): void {}
function __(string $text, string $domain = ''): string { return $text; }
function current_user_can(string $cap): bool { return $cap === 'manage_options' && $GLOBALS['allowed']; }
function sanitize_text_field(string $text): string { return trim(strip_tags($text)); }
function wp_strip_all_tags(string $text): string { return strip_tags($text); }
function wp_html_excerpt(string $text, int $length, string $more): string { return implode('', array_slice(preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY), 0, $length)); }
function get_post(int $id): ?object { return $GLOBALS['pages'][$id] ?? null; }
function get_the_title(object $post): string { return $post->post_title; }
function get_page_uri(object $post): string { return $post->uri; }
function get_page_by_path(string $path, string $output, string $type): ?object {
    foreach ($GLOBALS['pages'] as $post) { if ($post->post_type === $type && $post->uri === $path) { return $post; } }
    return null;
}
function register_rest_route(string $namespace, string $route, array $args): void { $GLOBALS['routes'][$namespace . $route] = $args; }
class WP_Error { public function __construct(public string $code, public string $message, public array $data) {} }
class WP_REST_Request { public function __construct(private mixed $query = '') {} public function get_param(string $name): mixed { return $name === 'q' ? $this->query : null; } }
function check(bool $condition, string $message): void { $GLOBALS['checks']++; if (!$condition) { throw new RuntimeException($message); } }
final class FakeDatabase {
    public string $posts = 'wp_posts';
    public function esc_like(string $text): string { return addcslashes($text, '_%\\'); }
    public function prepare(string $sql, string ...$args): array { return array($sql, $args); }
    private function like(string $value, string $pattern): bool {
        $regex = ''; $escaped = false;
        foreach (str_split($pattern) as $char) {
            if ($escaped) { $regex .= preg_quote($char, '~'); $escaped = false; }
            elseif ($char === '\\') { $escaped = true; }
            else { $regex .= match($char) { '%' => '.*', '_' => '.', default => preg_quote($char, '~') }; }
        }
        return (bool) preg_match('~^' . $regex . '$~iu', $value);
    }
    public function get_col(array $prepared): array {
        $GLOBALS['queries']++;
        [$sql, $args] = $prepared;
        check(str_contains($sql, "post_type = 'page' AND post_status = 'publish'"), 'Database query restricts published pages.');
        check(str_contains($sql, 'LIMIT 100'), 'Candidate query has a fixed scan bound.');
        $posts = array_filter($GLOBALS['pages'], fn($post) => $post->post_type === 'page' && $post->post_status === 'publish'
            && ($this->like($post->post_title, $args[0]) || $this->like($post->post_name, $args[1]) || $this->like($post->post_name, $args[2])));
        usort($posts, fn($a, $b) => strcmp($a->post_title, $b->post_title) ?: ($a->ID <=> $b->ID));
        return array_map(fn($post) => $post->ID, array_slice($posts, 0, 100));
    }
}
$wpdb = new FakeDatabase();
function page(int $id, string $title, string $slug, string $uri = '', string $status = 'publish', string $type = 'page'): void {
    $GLOBALS['pages'][$id] = (object) array('ID' => $id, 'post_title' => $title, 'post_name' => $slug, 'uri' => $uri ?: $slug, 'post_status' => $status, 'post_type' => $type);
}
require __DIR__ . '/../admin/php/page-suggestions.php';
require __DIR__ . '/../admin/php/admin.php';
use SmartCloud\WPSuite\Gatey\PageSuggestions;
function search(mixed $query): array|WP_Error { return PageSuggestions::read(new WP_REST_Request($query)); }
function ids(array $suggestions): array { return array_map(fn($suggestion) => (int) substr($suggestion['label'], strrpos($suggestion['label'], '#') + 1), $suggestions); }

page(11, 'Member access', 'sign-in');
page(12, 'Nested sign-in', 'login', 'members/login');
page(13, 'Other login', 'login', 'staff/login');
page(14, 'Draft secret', 'draft', '', 'draft');
page(15, 'Private secret', 'private', '', 'private');
page(16, 'Trash secret', 'trash', '', 'trash');
page(17, 'Post excluded', 'post', '', 'publish', 'post');
page(18, '<b>Safe &amp; clear</b>', 'safe');
page(19, "Literal %_ quote'", 'literal');
page(20, str_repeat('😀', 600), 'long-title');
page(21, 'Oversized URI', 'long-uri', str_repeat('a', 513));
page(22, 'Invalid URI', 'invalid-uri', 'unsafe?query');
check(ids(search('Member access')) === [11], 'Search matches a page title.');
check(ids(search('sign-in')) === [11, 12], 'Search matches both page slugs and titles.');
check(ids(search('11')) === [11], 'Numeric ID search finds an exact published page.');
check(search('12')[0]['value'] === 'members/login', 'Stored suggestion value is the hierarchical relative path.');
check(ids(search('/members/login/')) === [12], 'Exact slash-wrapped hierarchical path finds the correct page.');
check(ids(search('members/log')) === [12], 'Partial hierarchical path excludes other parents.');
check(ids(search('login')) === [12, 13], 'Leaf slug search includes both published hierarchies.');
foreach (['14', '15', '16', '17', 'secret', 'excluded'] as $query) {
    check(search($query) === [], 'Draft, private, trashed pages and posts are never suggested.');
}
check(search('safe')[0]['label'] === 'Safe & clear · safe · #18', 'Suggestion labels are plain decoded text without markup.');
check(ids(search("%_ quote'")) === [19], 'LIKE wildcards and quotes remain literal query characters.');
$longLabel = search('20')[0]['label'];
check(strlen($longLabel) <= 1024 && preg_match('//u', $longLabel) === 1, 'Oversized Unicode label is bounded without splitting UTF-8.');
check(search('21') === [], 'A path exceeding the persisted field bound is omitted.');
check(search('22') === [], 'Unsafe path characters cannot be suggested.');
check(search('unmatched') === [], 'No-match search returns an empty array.');
check(search(str_repeat('x', 201)) instanceof WP_Error, 'Oversized query is rejected.');
check(search(['bad']) instanceof WP_Error, 'Non-string query is rejected.');
$before = $queries; $allowed = false;
check(search('sign-in') instanceof WP_Error, 'Callback independently rejects unauthorized users.');
check($queries === $before, 'Unauthorized search never queries the database.');
$allowed = true;
for ($id = 30; $id < 60; $id++) { page($id, 'Bounded ' . $id, 'bounded-' . $id); }
check(count(search('bounded')) === 20, 'Result count cannot exceed twenty.');
check(count(search('')) === 20, 'Empty search is bounded too.');

$admin = (new ReflectionClass(SmartCloud\WPSuite\Gatey\Admin::class))->newInstanceWithoutConstructor();
$admin->initRestApi();
$route = $routes['gatey/v1/admin/page-suggestions'];
check($route['methods'] === 'GET', 'Suggestions route is read-only.');
check($route['callback'] === [PageSuggestions::class, 'read'], 'Route delegates to the tested provider.');
$allowed = false;
check($route['permission_callback']() instanceof WP_Error, 'REST route requires manage_options.');
$allowed = true;
check($route['permission_callback']() === true, 'Administrator can search.');
check(!$route['args']['q']['validate_callback'](['bad']), 'REST validation rejects arrays.');
check(!$route['args']['q']['validate_callback'](str_repeat('x', 201)), 'REST validation bounds query size.');
echo "Gatey page suggestions: {$checks} checks passed.\n";
