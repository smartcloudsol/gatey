<?php
/**
 * Admin class to create settings page and  REST API endpoint to handle parameter updates coming from the settings front-end,
 * and load the settings.
 *
 */
namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}
class OAuthConfiguration
{
    public function __construct(
        public string $domain,
        public array $scopes,
    ) {
    }
}
class LoginWithOAuthConfiguration
{
    public function __construct(
        public OAuthConfiguration $oauth,
    ) {
    }
}
class Configuration
{
    public function __construct(
        public string $userPoolId,
        public string $identityPoolId,
        public string $userPoolClientId,
        public LoginWithOAuthConfiguration $loginWith,
    ) {
    }
}
class RestConfiguration
{
    public function __construct(
        public string $region,
    ) {
    }
}
class AuthConfiguration
{
    public function __construct(
        public Configuration $Cognito,
    ) {
    }
}
class ApiConfiguration
{
    public function __construct(
        public RestConfiguration $GraphQL,
    ) {
    }
}
class ResourceConfiguration
{
    public function __construct(
        public AuthConfiguration $Auth,
        public ApiConfiguration $API,
    ) {
    }
}
class UserPoolConfigurations
{
    public function __construct(
        public ResourceConfiguration $default,
        public ResourceConfiguration $secondary,
    ) {
    }
}
class RoleMapping
{
    public function __construct(
        public string $cognitoGroup,
        public string $wordpressRole,
    ) {
    }
}
class Settings
{
    public function __construct(
        public UserPoolConfigurations $userPoolConfigurations,
        public string $secondaryUserPoolDomains,
        public array $mappings,
        public array $loginMechanisms = [],
        public bool $integrateWpLogin = false,
        public int $cookieExpiration = 0,
        public string $signInPage = "",
        public string $redirectSignIn = "",
        public string $redirectSignOut = "",
        public string $customTranslationsUrl = "",
        public array $signUpAttributes = [],
        public array $socialProviders = [],
        public bool $enablePoweredBy = false,
        public bool $debugLoggingEnabled = false,
    ) {
    }

    /**
     * Normalizes WP option payloads (array/object/Settings) to a typed instance.
     */
    public static function fromMixed(mixed $raw): self
    {
        if ($raw instanceof self) {
            return $raw;
        }

        // WP may return associative array, stdClass, or anything else.
        $arr = [];
        if (is_array($raw)) {
            $arr = $raw;
        } elseif (is_object($raw)) {
            $arr = get_object_vars($raw);
        }

        // Handle userPoolConfigurations - could be object or array
        $defaultUserPoolConfig = new UserPoolConfigurations(
            default: new ResourceConfiguration(
                Auth: new AuthConfiguration(
                    Cognito: new Configuration(
                        userPoolId: "",
                        identityPoolId: "",
                        userPoolClientId: "",
                        loginWith: new LoginWithOAuthConfiguration(
                            oauth: new OAuthConfiguration(
                                domain: "",
                                scopes: []
                            )
                        )
                    )
                ),
                API: new ApiConfiguration(
                    GraphQL: new RestConfiguration(region: "")
                )
            ),
            secondary: new ResourceConfiguration(
                Auth: new AuthConfiguration(
                    Cognito: new Configuration(
                        userPoolId: "",
                        identityPoolId: "",
                        userPoolClientId: "",
                        loginWith: new LoginWithOAuthConfiguration(
                            oauth: new OAuthConfiguration(
                                domain: "",
                                scopes: []
                            )
                        )
                    )
                ),
                API: new ApiConfiguration(
                    GraphQL: new RestConfiguration(region: "")
                )
            )
        );

        $userPoolConfigurations = $defaultUserPoolConfig;
        if (isset($arr['userPoolConfigurations'])) {
            if ($arr['userPoolConfigurations'] instanceof UserPoolConfigurations) {
                $userPoolConfigurations = $arr['userPoolConfigurations'];
            }
        }

        return new self(
            userPoolConfigurations: $userPoolConfigurations,
            secondaryUserPoolDomains: (string) ($arr['secondaryUserPoolDomains'] ?? ''),
            mappings: (array) ($arr['mappings'] ?? []),
            loginMechanisms: (array) ($arr['loginMechanisms'] ?? []),
            integrateWpLogin: (bool) ($arr['integrateWpLogin'] ?? false),
            cookieExpiration: (int) ($arr['cookieExpiration'] ?? 43200),
            signInPage: (string) ($arr['signInPage'] ?? ''),
            redirectSignIn: (string) ($arr['redirectSignIn'] ?? ''),
            redirectSignOut: (string) ($arr['redirectSignOut'] ?? ''),
            customTranslationsUrl: (string) ($arr['customTranslationsUrl'] ?? ''),
            signUpAttributes: (array) ($arr['signUpAttributes'] ?? []),
            socialProviders: (array) ($arr['socialProviders'] ?? []),
            enablePoweredBy: (bool) ($arr['enablePoweredBy'] ?? false),
            debugLoggingEnabled: (bool) ($arr['debugLoggingEnabled'] ?? false),
        );
    }
}
