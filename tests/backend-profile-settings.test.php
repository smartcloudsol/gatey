<?php
declare(strict_types=1);
define('ABSPATH', __DIR__ . '/');
define('GATEY_SLUG', 'gatey');
define('HOUR_IN_SECONDS', 3600);
define('GATEY_PATH', dirname(__DIR__) . '/');
$options = []; $context = null; $identity = null; $checks = 0;
function apply_filters(string $name, mixed $value): mixed {
    if ($name === 'smartcloud_wpsuite_backend_profile_context') return $GLOBALS['context'];
    if ($name === 'smartcloud_wpsuite_backend_profile_identity_config') return $GLOBALS['identity'];
    if ($name === 'smartcloud_wpsuite_backend_profile_option_name' && ($GLOBALS['context']['namespace'] ?? '') !== '') return 'wpsuite-profile/' . $GLOBALS['context']['id'] . '/' . $value;
    return $value;
}
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['options'][$key] ?? $default; }
function update_option(string $key, mixed $value): bool { $GLOBALS['options'][$key] = $value; return true; }
function add_action(mixed ...$args): void {}
function admin_url(string $path): string { return 'https://dev.wpsuite.io/wp-admin/' . $path; }
function __(string $text, string $domain = ''): string { return $text; }
function get_user_by(mixed ...$args): never { throw new RuntimeException('Development identity reached shared CMS user lookup'); }
class WP_REST_Request {}
class WP_REST_Response { public function __construct(public array $data, public int $status) {} }
function check(bool $ok, string $message): void { ++$GLOBALS['checks']; if (!$ok) throw new RuntimeException($message); }
require dirname(__DIR__) . '/admin/php/model.php';
require dirname(__DIR__) . '/admin/php/backend-profile-settings.php';
require dirname(__DIR__) . '/admin/php/admin.php';
require dirname(__DIR__) . '/admin/php/cognito-token-verifier.php';
use SmartCloud\WPSuite\Gatey\BackendProfileSettings;
use SmartCloud\WPSuite\Gatey\Settings;
use SmartCloud\WPSuite\Gatey\Admin;
$options['gatey'] = Settings::fromMixed(['integrateWpLogin' => true, 'signInPage' => '/sign-in']);
$options['gatey']->userPoolConfigurations->default->Auth->Cognito->userPoolId = 'eu-central-1_Dev';
$options['gatey']->userPoolConfigurations->default->Auth->Cognito->userPoolClientId = 'devclient';
$original = serialize($options);
check(BackendProfileSettings::optionName() === 'gatey' && BackendProfileSettings::settings()->integrateWpLogin, 'Unprofiled legacy configuration remains unchanged.');
$context = ['enabled' => true, 'id' => 'development', 'namespace' => ''];
check(BackendProfileSettings::settings()->userPoolConfigurations->default->Auth->Cognito->userPoolId === 'eu-central-1_Dev', 'Original owner retains saved backend settings.');
check(BackendProfileSettings::settings()->integrateWpLogin === false && serialize($options) === $original, 'Development bridge is disabled at runtime without changing saved settings.');
$admin = (new ReflectionClass(Admin::class))->newInstanceWithoutConstructor();
check($admin->login(new WP_REST_Request())->status === 403, 'Development login fails before request inspection, shared-user lookup or role changes.');
check($admin->logout(new WP_REST_Request())->status === 403, 'Development bridge cannot end the shared WordPress session.');
$context = ['enabled' => true, 'id' => 'production', 'namespace' => 'production'];
check(BackendProfileSettings::optionName() === 'wpsuite-profile/production/gatey', 'Other profile has a separate settings option.');
check(BackendProfileSettings::settings()->userPoolConfigurations->default->Auth->Cognito->userPoolId === '', 'Absent production settings never inherit the DEV pool.');
$identity = ['awsRegion' => 'us-east-1', 'userPoolId' => 'us-east-1_Prod', 'identityPoolId' => 'us-east-1:fixture', 'appClientPlugin' => 'prodclient'];
check($admin->getSettings()->userPoolConfigurations->default->Auth->Cognito->userPoolId === 'us-east-1_Prod', 'Existing Admin instance resolves the selected profile trusted bootstrap.');
check($admin->getSettings()->userPoolConfigurations->default->Auth->Cognito->userPoolClientId === 'prodclient' && !$admin->getSettings()->integrateWpLogin, 'Bootstrap fallback has selected client and safe WP integration default.');
$verifier = new SmartCloud\WPSuite\Gatey\CognitoTokenVerifier('us-east-1', $admin->getSettings()->userPoolConfigurations->default->Auth->Cognito->userPoolId, 'prodclient');
$claimsCheck = new ReflectionMethod($verifier, 'assertClaims');
$wrongIssuer = false;
try { $claimsCheck->invoke($verifier, ['iss' => 'https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_Dev', 'token_use' => 'id', 'aud' => 'prodclient'], 'id'); }
catch (RuntimeException $error) { $wrongIssuer = $error->getMessage() === 'Invalid Cognito token issuer.'; }
check($wrongIssuer, 'Production verifier selected from fallback rejects the DEV issuer.');
$production = BackendProfileSettings::settings(); $production->signInPage = '/production-login'; $production->integrateWpLogin = true;
update_option(BackendProfileSettings::optionName(), $production);
$identity = null;
check($admin->getSettings()->integrateWpLogin && $admin->getSettings()->signInPage === '/production-login', 'Explicit production local settings resolve without relying on cached DEV settings.');
$context = ['enabled' => true, 'id' => 'development', 'namespace' => ''];
check($admin->getSettings()->signInPage === '/sign-in', 'Switching back restores original local preferences.');
check(serialize($options['gatey']) === serialize(unserialize($original)['gatey']), 'Production settings and DEV runtime restrictions leave original owner storage exact.');
$descriptor = $admin->registerHubCapabilities([])[0]['configuration_reset'];
check($descriptor['options'] === ['gatey'], 'Original owner reset remains original option.');
$context = ['enabled' => true, 'id' => 'production', 'namespace' => 'production'];
check($admin->registerHubCapabilities([])[0]['configuration_reset']['options'] === ['wpsuite-profile/production/gatey'], 'Other profile reset clears only its Gatey option.');
echo "Gatey backend profile settings: {$checks} checks PASS.\n";
