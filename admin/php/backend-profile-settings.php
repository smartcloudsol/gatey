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

    /** Resolve explicit role mappings for a verified MCP principal without creating a CMS account. */
    public static function composerRoles(mixed $mapping, string $issuer, array $groups): mixed
    {
        $settings = self::settings();
        if (!$settings->integrateWpLogin) return $mapping;
        $pool = $settings->userPoolConfigurations->default->Auth->Cognito->userPoolId;
        $region = Configuration::regionFromUserPoolId($pool);
        // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Exact Cognito token issuer comparison; no asset loading, HTTP request or remote content.
        if ($region === '' || !hash_equals('https://cognito-idp.' . $region . '.amazonaws.com/' . $pool, $issuer)) return $mapping;
        $roles = array();
        foreach ($settings->mappings as $entry) {
            $entry = is_object($entry) ? get_object_vars($entry) : $entry;
            if (!is_array($entry)) continue;
            $group = $entry['cognitoGroup'] ?? null;
            $role = $entry['wordpressRole'] ?? null;
            if (is_string($group) && is_string($role) && in_array($group, $groups, true) && get_role($role) !== null) $roles[] = $role;
        }
        return array('schema_version' => 1, 'blog_id' => get_current_blog_id(), 'issuer' => $issuer, 'roles' => array_values(array_unique($roles)));
    }

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
