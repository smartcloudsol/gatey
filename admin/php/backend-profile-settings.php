<?php
namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) { exit; }

/** Backend-local access settings; WordPress users and content remain shared. */
final class BackendProfileSettings
{
    public static function context(): ?array
    {
        $value = function_exists('apply_filters') ? apply_filters('smartcloud_wpsuite_backend_profile_context', null) : null;
        return is_array($value) && ($value['enabled'] ?? false) === true ? $value : null;
    }

    public static function optionName(): string
    {
        return function_exists('apply_filters') ? apply_filters('smartcloud_wpsuite_backend_profile_option_name', GATEY_SLUG) : GATEY_SLUG;
    }

    public static function raw(): mixed { return get_option(self::optionName(), false); }

    public static function settings(): Settings
    {
        $raw = self::raw();
        // Normalize a fresh object: never modify the in-memory option object's original profile.
        $settings = Settings::fromMixed(is_object($raw) ? get_object_vars($raw) : $raw);
        if (self::context() !== null && !is_array($raw) && !is_object($raw)) {
            $identity = apply_filters('smartcloud_wpsuite_backend_profile_identity_config', null);
            if (is_array($identity)) {
                $pool = (string) ($identity['userPoolId'] ?? '');
                $client = (string) ($identity['appClientPlugin'] ?? '');
                $region = Configuration::regionFromUserPoolId($pool);
                if ($region !== '' && $region === ($identity['awsRegion'] ?? '') && preg_match('/^[a-z0-9]{1,128}$/D', $client)) {
                    $cognito = $settings->userPoolConfigurations->default->Auth->Cognito;
                    $cognito->userPoolId = $pool;
                    $cognito->userPoolClientId = $client;
                    $cognito->identityPoolId = (string) ($identity['identityPoolId'] ?? '');
                    $settings->userPoolConfigurations->default->API->GraphQL->region = $region;
                }
            }
        }
        // The DEV issuer must never map email/usernames/groups into the shared CMS account store.
        if ((self::context()['id'] ?? '') === 'development') $settings->integrateWpLogin = false;
        return $settings;
    }
}
