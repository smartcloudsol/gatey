<?php

declare(strict_types=1);

namespace SmartCloud\WPSuite\Hub\Abilities {
    abstract class Product_Provider_Base
    {
        public function __construct(...$args)
        {
        }

        public function bootstrap(): void
        {
        }

        protected function count_blocks(array $blocks): int
        {
            $count = 0;
            foreach ($blocks as $block) {
                ++$count;
                $count += $this->count_blocks(is_array($block['innerBlocks'] ?? null) ? $block['innerBlocks'] : array());
            }
            return $count;
        }

        protected function validation_issue(string $code, string $message, string $path): array
        {
            return compact('code', 'message', 'path');
        }
    }
}

namespace SmartCloud\WPSuite\Gatey\Abilities {
    define('ABSPATH', __DIR__ . '/');

    require_once dirname(__DIR__) . '/includes/abilities-provider.php';

    function expect(bool $condition, string $message): void
    {
        if (!$condition) {
            fwrite(STDERR, $message . PHP_EOL);
            exit(1);
        }
    }

    set_error_handler(static function (int $severity, string $message, string $file, int $line): never {
        throw new \ErrorException($message, 0, $severity, $file, $line);
    });

    $reflection = new \ReflectionClass(Provider::class);
    $provider = $reflection->newInstanceWithoutConstructor();
    $method = $reflection->getMethod('safe_passwordless_settings');
    $normalized = $method->invoke($provider, (object) array(
        'hiddenAuthMethods' => array('EMAIL_OTP', array('invalid nested value'), 42, 'EMAIL_OTP'),
        'preferredAuthMethod' => 'WEB_AUTHN',
        'passkeyRegistrationPrompts' => (object) array(
            'afterSignin' => 'ALWAYS',
            'afterSignup' => array('invalid nested value'),
        ),
        'ignored' => array('secret' => 'value'),
    ));

    restore_error_handler();

    expect(
        $normalized === array(
            'hiddenAuthMethods' => array('EMAIL_OTP'),
            'preferredAuthMethod' => 'WEB_AUTHN',
            'passkeyRegistrationPrompts' => array('afterSignin' => 'ALWAYS'),
        ),
        'Passwordless settings must retain only allowlisted scalar values.'
    );

    $validateNodes = $reflection->getMethod('validate_nodes');
    $fallback = array(
        'blockName' => 'wpsuite/react-fallback',
        'attrs' => array(),
        'innerBlocks' => array(array('blockName' => 'core/paragraph', 'attrs' => array())),
    );
    $allowedErrors = array();
    $allowedArgs = array(array($fallback), '', 'gatey/authenticator', array(), &$allowedErrors);
    $validateNodes->invokeArgs($provider, $allowedArgs);
    expect($allowedErrors === array(), 'Authenticator must accept a direct React fallback and its native Gutenberg children.');

    $invalidErrors = array();
    $invalidArgs = array(array($fallback), '', null, array(), &$invalidErrors);
    $validateNodes->invokeArgs($provider, $invalidArgs);
    expect(($invalidErrors[0]['code'] ?? '') === 'gatey_fallback_parent_invalid', 'React fallback must remain restricted to Authenticator.');

    $pluginSource = file_get_contents(dirname(__DIR__) . '/gatey.php');
    $loaderSource = file_get_contents(dirname(__DIR__) . '/hub-loader.php');
    expect(is_string($pluginSource) && is_string($loaderSource), 'Gatey runtime contract sources must be readable.');
    expect(str_contains($pluginSource, "smartcloud-wpsuite/abilities.php"), 'Gatey must load Abilities from the renamed runtime directory.');
    expect(str_contains($loaderSource, "SMARTCLOUD_WPSUITE_RUNTIME_DIRECTORY"), 'Gatey Hub loader must separate the runtime directory from stable identifiers.');
    expect(str_contains($loaderSource, "'smartcloud-wpsuite'"), 'Gatey Hub loader must target the renamed runtime directory.');
    expect(str_contains($loaderSource, "'hub-for-wpsuiteio'"), 'Gatey must retain the legacy WP Suite slug alias during migration.');
    foreach (array('SMARTCLOUD_WPSUITE_VERSION', 'SMARTCLOUD_WPSUITE_PATH', 'SMARTCLOUD_WPSUITE_URL', 'SMARTCLOUD_WPSUITE_READY_HOOK') as $sharedConstant) {
        expect(str_contains($loaderSource, "if (!defined('{$sharedConstant}'))"), "Gatey must guard the shared {$sharedConstant} declaration when another Hub owner already loaded it.");
    }
    $uninstallSource = file_get_contents(dirname(__DIR__) . '/uninstall.php');
    expect(is_string($uninstallSource), 'Gatey uninstall cleanup must be packaged.');
    expect(str_contains($uninstallSource, '_transient_gatey_cognito_jwks_'), 'Gatey uninstall must remove its Cognito JWKS transients.');
    expect(!str_contains($uninstallSource, 'smartcloud-wpsuiteio/license-jws'), 'Gatey uninstall must not remove shared WP Suite licences.');

    fwrite(STDOUT, "Gatey abilities, fallback, and runtime compatibility checks passed.\n");
}
