<?php
namespace SmartCloud\WPSuite\Gatey;
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/surface.php';

final class DeploymentCandidate
{
    public static function register(array $adapters): array
    {
        $adapters['gatey'] = array('sections' => array(self::class, 'sections'), 'apply' => array(self::class, 'apply'));
        return $adapters;
    }
    private static function validList(mixed $value, array $allowed, bool $allowEmpty): bool
    {
        if (!is_array($value) || (!$allowEmpty && !$value) || count($value) > count($allowed)) { return false; }
        foreach ($value as $item) { if (!is_string($item) || !in_array($item, $allowed, true)) { return false; } }
        return count(array_unique($value)) === count($value);
    }
    private static function unavailableFactors(mixed $capabilities): array
    {
        if (!is_array($capabilities)) { return array(); }
        $unavailable = array();
        if (($capabilities['emailOtpSignIn'] ?? null) === false) { $unavailable[] = 'EMAIL_OTP'; }
        if (($capabilities['passkeySignIn'] ?? null) === false) { $unavailable[] = 'WEB_AUTHN'; }
        return $unavailable;
    }
    public static function sections(array $fields): array
    {
        if (!current_user_can('manage_options')) { return array(); }
        $candidate = $fields['gatey'] ?? $fields;
        if (!is_array($candidate)) { return array(); }
        $settings = BackendProfileSettings::settings();
        $pool = $settings->userPoolConfigurations->default->Auth->Cognito;
        $rows = array();
        foreach (array('userPoolId' => __('User pool ID', 'gatey'), 'userPoolClientId' => __('App client ID', 'gatey'), 'identityPoolId' => __('Identity pool ID', 'gatey')) as $key => $label) {
            if (array_key_exists($key, $candidate) && $candidate[$key] !== $pool->{$key}) {
                $rows[] = array('key' => $key, 'label' => $label, 'current' => $pool->{$key}, 'proposed' => $candidate[$key]);
            }
        }
        $sections = $rows ? array('identity' => array('title' => __('Gatey identity', 'gatey'), 'rows' => $rows)) : array();
        $secondary = $settings->userPoolConfigurations->secondary->Auth->Cognito;
        $loginRows = array();
        $supported = true;
        if (array_key_exists('loginMechanisms', $candidate)) {
            $value = $candidate['loginMechanisms'];
            $supported = self::validList($value, array('email', 'phone_number', 'username'), false);
            if ($value !== $settings->loginMechanisms) { $loginRows[] = array('key' => 'loginMechanisms', 'label' => __('Sign-in identifiers', 'gatey'), 'current' => $settings->loginMechanisms, 'proposed' => $value); }
        }
        if (array_key_exists('signUpAttributes', $candidate)) {
            $required = $candidate['signUpAttributes'];
            $allowed = array('name', 'family_name', 'given_name', 'middle_name', 'nickname', 'preferred_username', 'birthdate', 'email', 'phone_number', 'profile', 'website');
            $valid = self::validList($required, $allowed, true);
            $supported = $supported && $valid;
            $proposed = $valid ? array_values(array_unique(array_merge($settings->signUpAttributes, $required))) : $required;
            if ($proposed !== $settings->signUpAttributes) { $loginRows[] = array('key' => 'signUpAttributes', 'label' => __('Sign-up attributes (add required attributes)', 'gatey'), 'current' => $settings->signUpAttributes, 'proposed' => $proposed); }
        }
        if ($loginRows) {
            $section = array('title' => __('Gatey sign-in and registration', 'gatey'), 'rows' => $loginRows);
            if (!$supported || $secondary->userPoolId !== '' || $secondary->userPoolClientId !== '') { $section['blocked'] = __('Review shared sign-in and registration settings in Gatey Advanced, including any secondary pool.', 'gatey'); }
            $sections['login'] = $section;
        }
        $capabilities = $candidate['capabilities'] ?? array();
        $unavailable = self::unavailableFactors($capabilities);
        if ($unavailable) {
            $current = $settings->passwordlessSettings;
            $hidden = $current['hiddenAuthMethods'] ?? array();
            $validHidden = self::validList($hidden, array('PASSWORD', 'EMAIL_OTP', 'SMS_OTP', 'WEB_AUTHN'), true);
            $proposed = $current;
            if ($validHidden) {
                $proposed['hiddenAuthMethods'] = array_values(array_unique(array_merge($hidden, $unavailable)));
                if (in_array($proposed['preferredAuthMethod'] ?? null, $unavailable, true)) { unset($proposed['preferredAuthMethod']); }
            }
            if (!$validHidden || $proposed !== $current) {
                $section = array('title' => __('Gatey passwordless presentation', 'gatey'), 'rows' => array(array('key' => 'passwordlessSettings', 'label' => __('Hide unavailable sign-in methods', 'gatey'), 'current' => $current, 'proposed' => $proposed)), 'defaultSelected' => false);
                if (($capabilities['firstFactorsSource'] ?? null) !== 'deployment-policy') { $section['blocked'] = __('The completed deployment has not confirmed its first-factor policy. Review Gatey Advanced settings.', 'gatey'); }
                elseif (!$validHidden || $secondary->userPoolId !== '' || $secondary->userPoolClientId !== '') { $section['blocked'] = __('Review passwordless presentation in Gatey Advanced, including any secondary pool.', 'gatey'); }
                $sections['passwordless'] = $section;
            }
        }
        $capabilityRows = self::capabilityRows($capabilities);
        if ($capabilityRows) {
            $sections['experience'] = array('title' => __('Cognito capability information', 'gatey'), 'rows' => $capabilityRows, 'blocked' => __('These values describe the cloud deployment. Review presentation choices in Gatey Advanced settings.', 'gatey'));
        }
        return $sections;
    }

    private static function capabilityRows(mixed $capabilities): array
    {
        if (!is_array($capabilities)) { return array(); }
        $labels = array(
            'emailOtpSignIn' => __('Email one-time code sign-in', 'gatey'),
            'passkeySignIn' => __('Passkey sign-in', 'gatey'),
            'softwareTokenMfa' => __('Authenticator app MFA', 'gatey'),
            'passkeyMfa' => __('Passkey MFA', 'gatey'),
            'emailOtpMfa' => __('Email one-time code MFA', 'gatey'),
            'smsMfa' => __('SMS MFA', 'gatey'),
        );
        $rows = array();
        foreach ($labels as $key => $label) {
            if (is_bool($capabilities[$key] ?? null)) {
                $rows[] = array('key' => $key, 'label' => $label, 'proposed' => $capabilities[$key]);
            }
        }
        $modes = array('no' => __('Off', 'gatey'), 'optional' => __('Optional', 'gatey'), 'required' => __('Required', 'gatey'));
        $mode = $capabilities['mfaMode'] ?? null;
        if (is_string($mode) && isset($modes[$mode])) {
            $rows[] = array('key' => 'mfaMode', 'label' => __('MFA mode', 'gatey'), 'proposed' => $modes[$mode]);
        }
        $rp = $capabilities['passkeyRelyingPartyId'] ?? null;
        if (is_string($rp) && $rp !== '') {
            $rows[] = array('key' => 'passkeyRelyingPartyId', 'label' => __('Passkey domain (RP ID)', 'gatey'), 'proposed' => $rp);
        }
        return $rows;
    }

    public static function apply(string $section, array $fields): bool|\WP_Error
    {
        if ($section === 'passwordless') {
            $sections = self::sections($fields);
            if (empty($sections['passwordless']) || isset($sections['passwordless']['blocked'])) { return new \WP_Error('gatey_candidate_blocked', __('Review passwordless presentation in Gatey Advanced settings.', 'gatey')); }
            $pool = BackendProfileSettings::settings()->userPoolConfigurations->default->Auth->Cognito;
            if (($fields['userPoolId'] ?? null) !== $pool->userPoolId || ($fields['userPoolClientId'] ?? null) !== $pool->userPoolClientId) { return new \WP_Error('gatey_candidate_identity', __('Apply the matching identity before passwordless settings.', 'gatey')); }
            $surface = AdminSurface::read();
            if (is_wp_error($surface)) { return $surface; }
            return AdminSurface::hideUnavailableFirstFactors(self::unavailableFactors($fields['capabilities'] ?? null), $surface['revision']);
        }
        if ($section === 'login') {
            $sections = self::sections($fields);
            if (empty($sections['login']) || isset($sections['login']['blocked'])) { return new \WP_Error('gatey_candidate_blocked', __('Review sign-in identifiers in Gatey Advanced settings.', 'gatey')); }
            $settings = BackendProfileSettings::settings();
            $pool = $settings->userPoolConfigurations->default->Auth->Cognito;
            if (($fields['userPoolId'] ?? null) !== $pool->userPoolId || ($fields['userPoolClientId'] ?? null) !== $pool->userPoolClientId) { return new \WP_Error('gatey_candidate_identity', __('Apply the matching identity before sign-in settings.', 'gatey')); }
            $values = array();
            if (isset($fields['loginMechanisms'])) { $values['loginMechanisms'] = $fields['loginMechanisms']; }
            if (isset($fields['signUpAttributes'])) { $values['signUpAttributes'] = array_values(array_unique(array_merge($settings->signUpAttributes, $fields['signUpAttributes']))); }
            $surface = AdminSurface::read();
            if (is_wp_error($surface)) { return $surface; }
            $result = AdminSurface::save($values, $surface['revision']);
            return is_wp_error($result) ? $result : true;
        }
        if ($section !== 'identity') { return new \WP_Error('gatey_candidate_blocked', __('Review this section in Gatey Advanced settings.', 'gatey')); }
        $candidate = $fields['gatey'] ?? $fields;
        if (!is_array($candidate)) { return new \WP_Error('gatey_candidate_invalid', __('Invalid candidate.', 'gatey')); }
        $values = array_intersect_key($candidate, array_flip(array('userPoolId', 'userPoolClientId', 'identityPoolId')));
        $surface = AdminSurface::read();
        if (is_wp_error($surface)) { return $surface; }
        $result = AdminSurface::save($values, $surface['revision']);
        return is_wp_error($result) ? $result : true;
    }
}
