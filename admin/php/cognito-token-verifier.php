<?php
/**
 * Minimal Cognito JWT verifier for Gatey.
 *
 * Uses WordPress HTTP API for JWKS retrieval and WordPress transients for caching,
 * while delegating cryptographic JWT verification to firebase/php-jwt.
 *
 * @package gatey
 */

namespace SmartCloud\WPSuite\Gatey;

use Exception;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use RuntimeException;
use Throwable;
use UnexpectedValueException;

if (!defined('ABSPATH')) {
    exit;
}

final class CognitoTokenVerifier
{
    private const JWKS_CACHE_TTL = 12 * HOUR_IN_SECONDS;
    private const HTTP_TIMEOUT_SECONDS = 10;

    public function __construct(
        private readonly string $region,
        private readonly string $userPoolId,
        private readonly string $clientId
    ) {
        $this->assertConfigured();
    }

    /**
     * Verify a Cognito ID token and return its claims as an associative array.
     *
     * @throws Exception when the token cannot be verified or claims do not match.
     */
    public function verifyIdToken(string $jwt): array
    {
        return $this->verifyToken($jwt, 'id');
    }

    /**
     * Optional helper if Gatey later needs access-token verification server-side.
     *
     * Cognito access tokens do not use aud for the app client; they use client_id.
     *
     * @throws Exception when the token cannot be verified or claims do not match.
     */
    public function verifyAccessToken(string $jwt): array
    {
        return $this->verifyToken($jwt, 'access');
    }

    /**
     * @throws Exception
     */
    private function verifyToken(string $jwt, string $expectedTokenUse): array
    {
        $jwt = trim($jwt);
        if ($jwt === '') {
            throw new RuntimeException('Empty JWT.');
        }

        try {
            $claims = $this->decode($jwt, false);
        } catch (UnexpectedValueException $firstError) {
            // Cognito may rotate signing keys. Refresh JWKS once before failing.
            try {
                $claims = $this->decode($jwt, true);
            } catch (Throwable $secondError) {
                Logger::debug('Cognito token verification failed after JWKS refresh.', array(
                    'firstError' => sanitize_text_field($firstError->getMessage()),
                    'secondError' => sanitize_text_field($secondError->getMessage()),
                ));

                throw new RuntimeException(esc_html__('Invalid Cognito token.', 'gatey'));
            }
        } catch (Throwable $error) {
            Logger::debug('Cognito token verification failed.', array(
                'error' => sanitize_text_field($error->getMessage()),
            ));

            throw new RuntimeException(esc_html__('Invalid Cognito token.', 'gatey'));
        }

        $this->assertClaims($claims, $expectedTokenUse);

        return $claims;
    }

    /**
     * @return array<string,mixed>
     */
    private function decode(string $jwt, bool $forceRefreshJwks): array
    {
        $jwks = $this->getJwks($forceRefreshJwks);
        $keys = JWK::parseKeySet($jwks, 'RS256');
        $decoded = JWT::decode($jwt, $keys);

        return json_decode(wp_json_encode($decoded), true) ?: array();
    }

    /**
     * @param array<string,mixed> $claims
     * @throws Exception
     */
    private function assertClaims(array $claims, string $expectedTokenUse): void
    {
        $issuer = $this->issuer();

        if (($claims['iss'] ?? null) !== $issuer) {
            throw new RuntimeException('Invalid Cognito token issuer.');
        }

        if (($claims['token_use'] ?? null) !== $expectedTokenUse) {
            throw new RuntimeException('Invalid Cognito token_use claim.');
        }

        if ($expectedTokenUse === 'id') {
            $audience = $claims['aud'] ?? null;
            if (is_array($audience)) {
                if (!in_array($this->clientId, $audience, true)) {
                    throw new RuntimeException('Invalid Cognito token audience.');
                }
            } elseif ($audience !== $this->clientId) {
                throw new RuntimeException('Invalid Cognito token audience.');
            }
            return;
        }

        if (($claims['client_id'] ?? null) !== $this->clientId) {
            throw new RuntimeException('Invalid Cognito token client_id claim.');
        }
    }

    /**
     * @return array{keys: array<int,array<string,mixed>>}
     */
    private function getJwks(bool $forceRefresh): array
    {
        $cacheKey = $this->cacheKey();

        if (!$forceRefresh) {
            $cached = get_transient($cacheKey);
            if (is_array($cached) && !empty($cached['keys']) && is_array($cached['keys'])) {
                return $cached;
            }
        }

        $jwks = $this->fetchJwks();
        set_transient($cacheKey, $jwks, self::JWKS_CACHE_TTL);

        return $jwks;
    }

    /**
     * @return array{keys: array<int,array<string,mixed>>}
     */
    private function fetchJwks(): array
    {
        $response = wp_remote_get($this->jwksUrl(), array(
            'timeout' => self::HTTP_TIMEOUT_SECONDS,
            'redirection' => 3,
            'user-agent' => 'Gatey/' . (defined('GATEY_VERSION') ? GATEY_VERSION : 'unknown') . '; ' . home_url('/'),
        ));

        if (is_wp_error($response)) {
            throw new RuntimeException(
                esc_html__(
                    'Unable to fetch Cognito JWKS.',
                    'gatey'
                ) . ' ' . esc_html(sanitize_text_field($response->get_error_message()))
            );
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException(
                esc_html__(
                    'Unable to fetch Cognito JWKS. HTTP status:',
                    'gatey'
                ) . ' ' . esc_html((string) $status)
            );
        }

        $body = wp_remote_retrieve_body($response);
        $jwks = json_decode($body, true);

        if (!is_array($jwks) || empty($jwks['keys']) || !is_array($jwks['keys'])) {
            throw new RuntimeException('Invalid Cognito JWKS response.');
        }

        return $jwks;
    }

    private function jwksUrl(): string
    {
        return $this->issuer() . '/.well-known/jwks.json';
    }

    private function issuer(): string
    {
        return sprintf(
            // Public Cognito issuer for JWT claim validation and JSON signing-key retrieval, never executable assets.
            // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Cognito authentication API URL, not offloaded plugin content.
            'https://cognito-idp.%s.amazonaws.com/%s',
            rawurlencode($this->region),
            rawurlencode($this->userPoolId)
        );
    }

    private function cacheKey(): string
    {
        return 'gatey_cognito_jwks_' . md5($this->region . ':' . $this->userPoolId);
    }

    private function assertConfigured(): void
    {
        if ($this->region === '' || $this->userPoolId === '' || $this->clientId === '') {
            throw new RuntimeException('Cognito verifier is not configured.');
        }
    }
}
