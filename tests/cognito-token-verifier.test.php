<?php
declare(strict_types=1);

// Offline contract: Cognito supplies JSON public signing keys, never plugin CSS/JS or executable PHP.
define('ABSPATH', __DIR__ . '/');
define('HOUR_IN_SECONDS', 3600);
define('GATEY_VERSION', 'fixture');
$requests = array();
$response = array('status' => 200, 'body' => '{"keys":[{"kid":"public-key","kty":"RSA"}]}');
$cache = array();
class WP_Error {
    public function __construct(private string $message) {}
    public function get_error_message(): string { return $this->message; }
}
function wp_remote_get(string $url, array $options): array|WP_Error {
    $GLOBALS['requests'][] = array($url, $options);
    return $GLOBALS['response'];
}
function wp_remote_retrieve_response_code(array $response): int { return $response['status']; }
function wp_remote_retrieve_body(array $response): string { return $response['body']; }
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }
function home_url(string $path): string { return 'https://example.test' . $path; }
function esc_html__(string $text, string $domain): string { return $text; }
function esc_html(string $text): string { return htmlspecialchars($text, ENT_QUOTES, 'UTF-8'); }
function sanitize_text_field(string $text): string { return strip_tags($text); }
function get_transient(string $key): mixed { return $GLOBALS['cache'][$key] ?? false; }
function set_transient(string $key, mixed $value, int $expiry): bool {
    check($expiry === 12 * HOUR_IN_SECONDS, 'Signing-key cache expiry remains bounded.');
    $GLOBALS['cache'][$key] = $value;
    return true;
}
function check(bool $condition, string $message): void {
    if (!$condition) { throw new RuntimeException($message); }
}
require __DIR__ . '/../admin/php/cognito-token-verifier.php';
$verifier = new SmartCloud\WPSuite\Gatey\CognitoTokenVerifier('eu-central-1', 'eu-central-1_fixture', 'public-client');
$fetch = new ReflectionMethod($verifier, 'fetchJwks');
$get = new ReflectionMethod($verifier, 'getJwks');
$keys = $get->invoke($verifier, false);
check($keys === array('keys' => array(array('kid' => 'public-key', 'kty' => 'RSA'))), 'Public JWKS JSON is returned as data.');
check($requests[0][0] === 'https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_fixture/.well-known/jwks.json', 'Only the configured Cognito signing-key endpoint is requested.');
check($requests[0][1]['timeout'] === 10 && $requests[0][1]['redirection'] === 3, 'WordPress HTTP request remains bounded.');
$get->invoke($verifier, false);
check(count($requests) === 1, 'Normal verification reuses cached public keys.');
$get->invoke($verifier, true);
check(count($requests) === 2, 'Key rotation can explicitly refresh JWKS.');
foreach (array(
    array('status' => 503, 'body' => '{"keys":[]}'),
    array('status' => 200, 'body' => '<?php throw new Exception("must never execute");'),
    array('status' => 200, 'body' => '{"keys":[]}'),
    array('status' => 200, 'body' => '{"keys":"not-an-array"}'),
    new WP_Error('<script>network error</script>'),
) as $invalid) {
    $response = $invalid;
    $refused = false;
    try { $fetch->invoke($verifier); } catch (RuntimeException $error) { $refused = true; }
    check($refused, 'HTTP failures and invalid or executable-looking responses fail closed as data.');
}
echo "Cognito public signing-key contract: PASS\n";
