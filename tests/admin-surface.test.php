<?php
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('GATEY_SLUG', 'gatey');
$options = []; $writes = []; $allowed = true; $checks = 0; $permissions = []; $pages = []; $pageLookups = []; $siteBase = 'https://example.test';
$transients = []; $postsChanged = 'initial'; $postQueries = []; $parsedBlocks = [];
$registeredHooks = [];
function add_action(string $hook, callable $callback, int $priority, int $arguments): void { $GLOBALS['registeredHooks'][] = [$hook, $callback, $arguments]; }
define('OBJECT', 'OBJECT');
function __(string $text, string $domain = ''): string { return $text; }
function current_user_can(string $cap, mixed ...$args): bool { return $GLOBALS['allowed'] && ($GLOBALS['permissions'][$cap . ':' . ($args[0] ?? '')] ?? $GLOBALS['permissions'][$cap] ?? true); }
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['options'][$key] ?? $default; }
function update_option(string $key, mixed $value): bool { $GLOBALS['options'][$key] = $value; $GLOBALS['writes'][] = $key; return true; }
function admin_url(string $path): string { return 'https://example.test/wp-admin/' . $path; }
function site_url(string $path): string { return $GLOBALS['siteBase'] . '/' . ltrim($path, '/'); }
function get_page_by_path(string $path, string $output, string $postType): ?object { $GLOBALS['pageLookups'][] = $path; return $GLOBALS['pages'][$path] ?? null; }
function get_post(int $id): ?object { foreach ($GLOBALS['pages'] as $page) { if ($page->ID === $id) return $page; } return null; }
function get_edit_post_link(int $id, string $context): string { return admin_url('post.php?post=' . $id . '&action=edit'); }
function get_page_uri(int $id): string { foreach ($GLOBALS['pages'] as $path => $page) { if ($page->ID === $id) return $path; } return ''; }
function wp_cache_get_last_changed(string $group): string { return $GLOBALS['postsChanged']; }
function get_transient(string $key): mixed { return $GLOBALS['transients'][$key] ?? false; }
function set_transient(string $key, mixed $value, int $expiry): bool { check($expiry === 300, 'Inspection caches expire after five minutes.'); $GLOBALS['transients'][$key] = $value; return true; }
function delete_transient(string $key): bool { unset($GLOBALS['transients'][$key]); return true; }
function get_posts(array $args): array { $GLOBALS['postQueries'][] = $args; return array_slice(array_values(array_map(static fn(object $page): int => $page->ID, array_filter($GLOBALS['pages'], static fn(object $page): bool => in_array($page->post_type, $args['post_type'], true) && $page->post_status === $args['post_status']))), 0, $args['posts_per_page']); }
function parse_blocks(string $content): array {
    if (isset($GLOBALS['parsedBlocks'][$content])) return $GLOBALS['parsedBlocks'][$content];
    preg_match_all('/<!-- wp:([^ ]+) (\{.*?\}) \/-->/', $content, $matches, PREG_SET_ORDER);
    return array_map(static fn(array $match): array => ['blockName' => str_contains($match[1], '/') ? $match[1] : 'core/' . $match[1], 'attrs' => json_decode($match[2], true), 'innerBlocks' => []], $matches);
}
function has_block(string $name, object $post): bool { return str_contains($post->post_content, '<!-- wp:' . $name . ' '); }
function rest_url(string $path): string { return 'https://example.test/wp-json/' . $path; }
class WP_Error { public function __construct(public string $code, public string $message, public array $data) {} }
function check(bool $condition, string $message): void { $GLOBALS['checks']++; if (!$condition) { throw new RuntimeException($message); } }
require __DIR__ . '/../admin/php/model.php';
require __DIR__ . '/../admin/php/surface.php';
use SmartCloud\WPSuite\Gatey\AdminSurface;
use SmartCloud\WPSuite\Gatey\Settings;
use SmartCloud\WPSuite\Gatey\PlacementInspection;
foreach (['eu-west-1_Pool' => 'eu-west-1', 'us-gov-west-1_Pool' => 'us-gov-west-1', 'cn-north-1_Pool' => 'cn-north-1', '' => '', '../eu-west-1_Pool' => '', 'eu-west-1_' => '', "eu-west-1_Pool\n" => ''] as $poolId => $region) {
    check(SmartCloud\WPSuite\Gatey\Configuration::regionFromUserPoolId($poolId) === $region, 'Region derivation accepts pool IDs and fails closed for malformed IDs.');
}
check(SmartCloud\WPSuite\Gatey\Configuration::regionFromUserPoolId('eu-west-1_' . str_repeat('a', 128)) === '', 'Oversized pool identifiers cannot supply a verification region.');
define('HOUR_IN_SECONDS', 3600);
require __DIR__ . '/../admin/php/cognito-token-verifier.php';
foreach (['', '../eu-west-1_Pool'] as $invalidPool) {
    $refused = false;
    try {
        new SmartCloud\WPSuite\Gatey\CognitoTokenVerifier(SmartCloud\WPSuite\Gatey\Configuration::regionFromUserPoolId($invalidPool), $invalidPool, 'fixtureclient123');
    } catch (RuntimeException $error) {
        $refused = $error->getMessage() === 'Cognito verifier is not configured.';
    }
    check($refused, 'An empty or malformed pool cannot initialize a verifier with an inferred region.');
}

PlacementInspection::registerHooks(); PlacementInspection::registerHooks();
check(array_column($registeredHooks, 0) === ['save_post', 'deleted_post'] && array_column($registeredHooks, 2) === [2, 2], 'Relevant content invalidation hooks register exactly once outside REST dispatch.');

$empty = AdminSurface::read();
check(!$empty['configured'], 'Fresh installation needs setup without a site connection.');
check($empty['steps'][1]['fields'][0]['options'][0]['label'] === 'Username (default)', 'An empty identifier list explains the actual default.');
foreach ([['email', 'username'], ['username', 'email'], ['future']] as $methods) {
    $options['gatey'] = ['loginMechanisms' => $methods];
    $view = AdminSurface::read();
    $expectedLabel = $methods === ['future'] ? 'Keep existing advanced configuration' : 'Keep current: ' . implode(', ', array_map('ucfirst', $methods));
    check($view['values']['loginMechanism'] === 'existing' && $view['steps'][1]['fields'][0]['options'][0]['label'] === $expectedLabel, 'Existing identifiers are described in their original order without guessing unknown methods.');
    check($options['gatey']['loginMechanisms'] === $methods, 'Describing methods does not mutate stored configuration.');
}
unset($options['gatey']);
$pathField = $empty['steps'][1]['fields'][1];
check($pathField['type'] === 'text' && $pathField['suggestions_url'] === rest_url('gatey/v1/admin/page-suggestions'), 'Page suggestions extend the existing free-text field contract.');
$result = AdminSurface::save(['userPoolId' => 'eu-west-1_abc', 'userPoolClientId' => 'abc123', 'hideSignUp' => true], $empty['revision']);
check(is_array($result) && $result['configured'], 'Local identifiers complete local setup.');
check(!array_key_exists('region', $result['values']) && $options['gatey']->userPoolConfigurations->default->API->GraphQL->region === 'eu-west-1', 'Setup derives and persists the user pool region used by WordPress login verification.');
$connectionFields = array_column($result['steps'][0]['fields'], null, 'id');
check(!isset($connectionFields['region']) && isset($connectionFields['identityPoolId']) && empty($connectionFields['identityPoolId']['required']), 'Onboarding omits automatic region and offers optional Identity Pool.');
check(str_contains($result['notice'], 'Cognito session for protected backend APIs'), 'Disabled integration status points administrators to separate Cognito sign-in.');
$identity = 'us-east-1:01234567-89ab-cdef-0123-456789abcdef';
$result = AdminSurface::save(['identityPoolId' => $identity], $result['revision']);
check(is_array($result) && $result['values']['identityPoolId'] === $identity && $options['gatey']->userPoolConfigurations->default->API->GraphQL->region === 'eu-west-1', 'Identity Pool may use a different region; user pool region is derived automatically.');
$result = AdminSurface::save(['userPoolId' => 'ap-southeast-2_other'], $result['revision']);
check(is_array($result) && $options['gatey']->userPoolConfigurations->default->API->GraphQL->region === 'ap-southeast-2' && $result['values']['identityPoolId'] === $identity, 'Changing pool ID refreshes verification region and preserves omitted Identity Pool.');
foreach ([['region' => 'eu-west-1'], ['identityPoolId' => 'bad'], ['identityPoolId' => null], ['userPoolId' => '../invalid', 'region' => 'us-east-1']] as $invalid) {
    $beforeOptions = serialize($options); $beforeWrites = count($writes);
    check(AdminSurface::save($invalid, $result['revision']) instanceof WP_Error, 'Invalid or mismatched connection settings fail.');
    check(serialize($options) === $beforeOptions && count($writes) === $beforeWrites, 'Connection validation is atomic.');
}
// Stale wizard bundles may still submit this former editable field.
foreach (['us-east-1', '../region', true, null] as $staleRegion) {
    $beforeOptions = serialize($options); $beforeWrites = count($writes);
    $error = AdminSurface::save(['userPoolId' => 'eu-west-1_changed', 'region' => $staleRegion], $result['revision']);
    check($error instanceof WP_Error && $error->data['status'] === 400, 'Cached wizard clients must reload the field contract before saving.');
    check(serialize($options) === $beforeOptions && count($writes) === $beforeWrites, 'Unsupported former region field rejects the whole patch without writes.');
}
$result = AdminSurface::save(['identityPoolId' => ''], $result['revision']);
check(is_array($result) && $result['values']['identityPoolId'] === '', 'Optional Identity Pool can be cleared explicitly.');

check($result['status']['label'] === 'Login configured', 'Status describes saved login configuration without claiming verified service availability.');
$topics = array_column($result['help'], null, 'id');
check(count($topics) === count($result['help']) && count($topics) <= 32, 'Contextual help topics have unique bounded identifiers.');
foreach (array_merge($result['metrics'], $result['use_on_site']['items'], $result['steps'], ...array_column($result['steps'], 'fields')) as $item) check(isset($topics[$item['help_id']]), 'Every contextual help reference resolves.');
check(str_contains(implode(' ', $topics['sign-in-pool']['paragraphs']), 'must not have a client secret'), 'Pool help explains the public browser client requirement.');
check(str_contains(implode(' ', $topics['account-attribute-placement']['paragraphs']), 'does not edit the account'), 'Account Attribute help describes display-only behavior.');
$result = AdminSurface::save(['signInPage' => '/handwritten-path/'], $result['revision']);
check(is_array($result) && $result['values']['signInPage'] === '/handwritten-path/', 'Manual page paths remain accepted without matching an existing page.');
$options['gatey']->userPoolConfigurations->secondary->Auth->Cognito->userPoolId = 'us-east-1_keep';
$options['gatey']->secondaryUserPoolDomains = '^members\\.example\\.test$';
$options['gatey']->userPoolConfigurations->default->Auth->Cognito->identityPoolId = 'retain-identity-pool';
$options['gatey']->userPoolConfigurations->default->Auth->Cognito->loginWith->oauth->scopes = ['openid', 'profile'];
$options['gatey']->mappings = [['cognitoGroup' => 'editors', 'wordpressRole' => 'editor']];
$options['gatey']->passwordlessSettings = ['preferredAuthMethod' => 'WEB_AUTHN'];
$options['gatey']->debugLoggingEnabled = true;
$options['gatey']->integrateWpLogin = true;
$options['gatey']->loginMechanisms = ['email', 'username'];
$options['gatey-pro'] = ['sentinel' => 'untouched'];
$before = serialize($options['gatey']);
$snapshot = AdminSurface::read();
$result = AdminSurface::save(['hideSignUp' => false, 'loginMechanism' => 'existing'], $snapshot['revision']);
check(is_array($result), 'Existing values save.');
$expected = unserialize($before); $expected->hideSignUp = false;
check(serialize($expected) === serialize($options['gatey']), 'Only explicitly changed fields are updated; every nested advanced field survives.');
$beforePoolUpdate = serialize($options['gatey']);
$result = AdminSurface::save(['userPoolId' => 'eu-west-1_abc', 'identityPoolId' => $identity], $result['revision']);
$expectedPoolUpdate = unserialize($beforePoolUpdate);
$expectedPoolUpdate->userPoolConfigurations->default->Auth->Cognito->userPoolId = 'eu-west-1_abc';
$expectedPoolUpdate->userPoolConfigurations->default->Auth->Cognito->identityPoolId = $identity;
$expectedPoolUpdate->userPoolConfigurations->default->API->GraphQL->region = 'eu-west-1';
check(is_array($result) && serialize($expectedPoolUpdate) === serialize($options['gatey']), 'Pool edits preserve secondary pool, OAuth, role mappings, integration and unknown settings.');
check(str_contains($result['notice'], 'integration is enabled'), 'Enabled integration is described without claiming a verified Cognito session.');

check($options['gatey'] instanceof Settings, 'Typed settings remain typed.');
$revision = $result['revision'];
$options['gatey']->cookieExpiration = 999;
$error = AdminSurface::save(['hideSignUp' => true], $revision);
check($error instanceof WP_Error && $error->data['status'] === 409, 'Stale browser cannot overwrite concurrent Advanced save.');
$revision = AdminSurface::read()['revision'];
foreach ([['debugLoggingEnabled' => false], ['hideSignUp' => 'false'], ['userPoolId' => '<script>'], ['userPoolClientId' => 'secret:bad'], ['signInPage' => '//evil.test'], ['signInPage' => '/\\evil.test'], ['loginMechanism' => 'admin']] as $invalid) {
    $before = serialize($options); $count = count($writes);
    check(AdminSurface::save($invalid, $revision) instanceof WP_Error, 'Invalid/unknown field rejected.');
    check(serialize($options) === $before && count($writes) === $count, 'Rejected values never write.');
}
check(array_unique($writes) === ['gatey'], 'No Pro or hub option is written.');
$options['gatey'] = ['userPoolConfigurations' => ['secondary' => ['keep' => 'legacy-pool']], 'debugLoggingEnabled' => true];
$revision = AdminSurface::read()['revision']; $before = serialize($options); $count = count($writes);
check(AdminSurface::save(['userPoolId' => 'eu-west-1_abc'], $revision) instanceof WP_Error, 'Unsupported legacy nested representation fails safely.');
check(serialize($options) === $before && count($writes) === $count, 'Legacy pool data is never discarded by normalization.');
foreach ([['region' => 'eu-west-1'], ['identityPoolId' => $identity]] as $legacyChange) {
    check(AdminSurface::save($legacyChange, $revision) instanceof WP_Error && serialize($options) === $before && count($writes) === $count, 'New connection fields also preserve unsupported legacy pool data by refusing unsafe hydration.');
}

$result = AdminSurface::save(['hideSignUp' => true], $revision);
check(is_array($result) && $options['gatey']['userPoolConfigurations'] === ['secondary' => ['keep' => 'legacy-pool']], 'Unrelated preference edits preserve legacy pool representation.');
// Placement inspection is scoped to one selected page, permission-aware and read-only.
$options['gatey'] = Settings::fromMixed(['signInPage' => 'account/sign-in']);
$pages['account/sign-in'] = (object) ['ID' => 17, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/authenticator {} /-->'];
$transients = []; $postsChanged = 'direct-page';
$before = serialize($options); $count = count($writes); $lookupCount = count($pageLookups);
$placement = AdminSurface::read()['use_on_site'];
check(array_column($placement['items'], 'id') === ['authenticator', 'account-attribute'], 'Primary and secondary placement surfaces use the existing Gatey blocks.');
check(str_contains($placement['items'][0]['description'], 'Authenticator block') && str_contains($placement['items'][1]['description'], 'Account Attribute block'), 'Instructions name the exact inserter blocks.');
check(str_contains($placement['items'][0]['status'], 'Authenticator block detected on the configured WordPress page') && str_contains($placement['items'][0]['status'], 'account/sign-in'), 'A direct block is detected at the configured sign-in location.');
$labels = array_column($placement['items'][0]['links'], 'label');
check($labels[0] === 'Edit sign-in page' && !in_array('Create sign-in page', $labels, true) && !in_array('Browse pages', $labels, true) && in_array('Manage login patterns', $labels, true), 'The configured page has one contextual edit action, without redundant creation.');
check(in_array(admin_url('post.php?post=17&action=edit'), array_column($placement['items'][0]['links'], 'url'), true), 'An editable published page receives its native edit URL.');
check(count($pageLookups) === $lookupCount + 1 && end($pageLookups) === 'account/sign-in', 'Nested path inspection resolves only the configured page, never scans the site.');
check(serialize($options) === $before && count($writes) === $count, 'Placement discovery does not mutate local, Pro or hub settings.');
check(AdminSurface::read()['links'] === [['label' => 'Advanced login settings', 'url' => admin_url('admin.php?page=gatey&section=wordpress-login')]], 'Placement links no longer duplicate the technical footer.');
$pages['account/sign-in']->post_content = '<!-- wp:block {"ref":42} /-->';
$pages['synced-login'] = (object) ['ID' => 42, 'post_type' => 'wp_block', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/authenticator {} /-->'];
$transients = []; $postsChanged = 'synced-login';
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][0]['status'], 'Authenticator block detected'), 'Published synced patterns are expanded at the configured page.');
check(str_contains(implode(' ', $topics['authenticator-placement']['paragraphs']), 'Site templates and other placement methods are not inspected'), 'Detection limitations move into contextual help.');
$pages['synced-login']->post_content = '<!-- wp:block {"ref":42} /-->';
$transients = []; $postsChanged = 'cyclic-login';
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][0]['status'], 'inspection incomplete'), 'Cyclic patterns cannot produce a false absence or an infinite traversal.');
check($placement['items'][0]['links'][0]['label'] === 'Add Authenticator to sign-in page', 'A missing block leads to the existing editor with a contextual next-step label.');
$permissions = ['edit_pages' => false, 'edit_posts' => false, 'edit_post' => false];
$placement = AdminSurface::read()['use_on_site'];
check(array_column($placement['items'][0]['links'], 'label') === ['Preview sign-in'], 'Users without editor permissions retain preview but receive no create, list, pattern or edit destinations.');
$permissions = [];
$pages['account/sign-in']->post_status = 'draft';
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][0]['status'], 'does not resolve to a published WordPress page'), 'Draft content is not presented as active published sign-in content.');
check(!in_array('Edit sign-in page', array_column($placement['items'][0]['links'], 'label'), true), 'Unpublished candidates receive no selected-page edit destination.');
check(!in_array('Preview sign-in', array_column($placement['items'][0]['links'], 'label'), true) && $placement['items'][0]['links'][0]['label'] === 'Create sign-in page', 'Unresolved paths offer creation instead of a potentially broken preview.');
$options['gatey']->signInPage = '/manual-path/';
$placement = AdminSurface::read()['use_on_site'];
check($options['gatey']->signInPage === '/manual-path/' && str_contains($placement['items'][0]['status'], '/manual-path/'), 'Unresolved manual paths remain intact.');
$siteBase = 'https://example.test/subsite';
$placement = AdminSurface::read()['use_on_site'];
check(!in_array(site_url('/manual-path/'), array_column($placement['items'][0]['links'], 'url'), true), 'Manual unresolved paths remain saved but are not offered as working previews.');
$options['gatey']->signInPage = '/'; $options['show_on_front'] = 'page'; $options['page_on_front'] = 30;
$pages['front'] = (object) ['ID' => 30, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/authenticator {} /-->'];
$lookupCount = count($pageLookups);
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][0]['status'], 'Authenticator block detected') && count($pageLookups) === $lookupCount, 'Root path checks the configured static front page without querying an empty path.');
check(in_array(site_url('/'), array_column($placement['items'][0]['links'], 'url'), true), 'Published page preview uses authoritative site_url, including a multisite subdirectory.');
$options['show_on_front'] = 'posts';
check(str_contains(AdminSurface::read()['use_on_site']['items'][0]['status'], 'does not resolve to a published WordPress page'), 'Posts-index roots are not misreported as a static sign-in page.');
$options['gatey']->signInPage = '//other.test/login';
$placement = AdminSurface::read()['use_on_site'];
check(!in_array('Preview sign-in', array_column($placement['items'][0]['links'], 'label'), true), 'Invalid legacy paths cannot create unsafe preview links.');
check(count($writes) === $count, 'All placement checks remain read-only.');
// Account usage is bounded, cached by content generation, and filtered for each viewer.
$pages = [
    'profile' => (object) ['ID' => 60, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/account-attribute {} /-->'],
    'profile-post' => (object) ['ID' => 61, 'post_type' => 'post', 'post_status' => 'publish', 'post_content' => '<!-- wp:block {"ref":62} /-->'],
    'profile-pattern' => (object) ['ID' => 62, 'post_type' => 'wp_block', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/account-attribute {} /-->'],
    'draft-profile' => (object) ['ID' => 63, 'post_type' => 'page', 'post_status' => 'draft', 'post_content' => '<!-- wp:gatey/account-attribute {} /-->'],
];
$transients = []; $postsChanged = 'profile-generation'; $queryCount = count($postQueries);
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][1]['status'], '2 inspected published pages or posts'), 'Account usage includes published page/post direct and synced blocks, excluding drafts and standalone pattern definitions.');
check(count($postQueries) === $queryCount + 1 && end($postQueries)['posts_per_page'] === 201 && end($postQueries)['fields'] === 'ids' && end($postQueries)['no_found_rows'] === true, 'Native candidate query has an explicit bound and avoids unbounded row counts.');
check($placement['items'][1]['links'][0]['url'] === admin_url('post.php?post=60&action=edit'), 'Real usage leads to a native edit destination.');
$permissions = ['edit_post:60' => false];
$restrictedPlacement = AdminSurface::read()['use_on_site'];
check(count($postQueries) === $queryCount + 1, 'Unchanged content reuses the cached inspection.');
check(!in_array(admin_url('post.php?post=60&action=edit'), array_column($restrictedPlacement['items'][1]['links'], 'url'), true) && in_array(admin_url('post.php?post=61&action=edit'), array_column($restrictedPlacement['items'][1]['links'], 'url'), true), 'Cached IDs receive fresh per-post edit permissions for each viewer.');
$permissions = ['edit_post' => false, 'edit_pages' => false, 'edit_posts' => false];
check(AdminSurface::read()['use_on_site']['items'][1]['links'] === [], 'Usage guidance exposes no unauthorized edit or creation actions.');
$permissions = []; $pages['profile-pattern']->post_content = '';
PlacementInspection::invalidate(62, $pages['profile-pattern']);
check(str_contains(AdminSurface::read()['use_on_site']['items'][1]['status'], '1 inspected published pages or posts') && count($postQueries) === $queryCount + 2, 'A synced pattern content generation invalidates the cached inspection.');
$pages = [];
for ($id = 100; $id < 301; $id++) $pages['page-' . $id] = (object) ['ID' => $id, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => '<!-- wp:gatey/account-attribute {} /-->'];
$transients = []; $postsChanged = 'many-pages';
$placement = AdminSurface::read()['use_on_site'];
check(str_contains($placement['items'][1]['status'], '200 inspected') && str_contains($placement['items'][1]['status'], 'Partial inspection'), 'A capped site reports partial scoped findings, never a complete site-wide count.');
check(count($placement['items'][1]['links']) === 5, 'Usage provides at most five contextual native edit destinations without generic placement duplication.');
$pages = ['oversized' => (object) ['ID' => 1, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => str_repeat('x', 2097153)]];
$transients = []; $postsChanged = 'oversized-page';
check(str_contains(AdminSurface::read()['use_on_site']['items'][1]['status'], 'Partial inspection'), 'Oversized content produces partial inspection instead of unbounded parsing or a global absence.');
$deep = ['blockName' => 'gatey/account-attribute', 'attrs' => [], 'innerBlocks' => []];
for ($depth = 0; $depth < 10; $depth++) $deep = ['blockName' => 'core/group', 'attrs' => [], 'innerBlocks' => [$deep]];
$parsedBlocks['deep-layout'] = [$deep];
$pages = ['deep-page' => (object) ['ID' => 1, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => 'deep-layout']];
$transients = []; $postsChanged = 'deep-page';
check(str_contains(AdminSurface::read()['use_on_site']['items'][1]['status'], 'Partial inspection'), 'Deep block nesting respects traversal limits and avoids false complete absence.');
$parsedBlocks['many-blocks'] = array_fill(0, 4001, ['blockName' => 'core/paragraph', 'attrs' => [], 'innerBlocks' => []]);
$pages = ['many-block-page' => (object) ['ID' => 1, 'post_type' => 'page', 'post_status' => 'publish', 'post_content' => 'many-blocks']];
$transients = []; $postsChanged = 'many-block-page';
check(str_contains(AdminSurface::read()['use_on_site']['items'][1]['status'], 'Partial inspection'), 'Node budget bounds broad trees independently of depth and byte limits.');
check(count($writes) === $count, 'Usage caching never changes Gatey, Pro or shared settings.');
$allowed = false;
check(AdminSurface::read() instanceof WP_Error, 'Read requires manage_options.');
check(AdminSurface::save(['hideSignUp' => true], $revision) instanceof WP_Error, 'Write independently requires manage_options.');
echo "Gatey admin surface: {$checks} checks passed.\n";
