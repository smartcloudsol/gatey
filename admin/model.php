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
        public array $mappings,
        public array $loginMechanisms = [],
        public bool $integrateWpLogin = false,
        public int $cookieExpiration = 0,
        public string $signInPage = "",
        public string $redirectSignIn = "",
        public string $redirectSignOut = "",
        public string $reCaptchaPublicKey = "",
        public string $customTranslationsUrl = "",
    ) {
    }
}
class SiteSettings
{
    public function __construct(
        public string $accountId = "",
        public string $siteId = "",
        public int $lastUpdate = 0,
        public bool $subscriber = false,
        public string $siteKey = "",
    ) {
    }
}
