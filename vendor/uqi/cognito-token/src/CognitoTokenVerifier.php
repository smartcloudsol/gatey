<?php

namespace UQI\Cognito\Tokens;

use Exception;
use UQI\Cognito\Tokens\Exception\CognitoTokenException;
use UQI\Cognito\Tokens\CacheInterface;
use UQI\Cognito\Tokens\NoCache;
use Jose\Component\Core\AlgorithmManager;
use Jose\Component\Signature\Algorithm\RS256;
use Jose\Component\Signature\JWSVerifier;
use Jose\Component\Signature\Serializer\CompactSerializer;
use Jose\Component\Core\JWK;

class CognitoTokenVerifier
{
    protected string $region;
    protected string $userPoolId;
    protected string $clientId;
    protected string $issuer;
    protected array $jwks;
    protected JWSVerifier $jwsVerifier;
    protected CompactSerializer $serializer;
    protected string $cacheKey;  // Cache key for storing JWKS
    protected CacheInterface $cache;

    /**
     * Constructor.
     *
     * @param string $region     AWS region (e.g., "us-east-1").
     * @param string $userPoolId Cognito User Pool ID (e.g., "us-east-1_aQRUYfYJQ").
     * @param string $clientId   Cognito Client ID.
     * @param CacheInterface|null $cacheDriver (optional) Default is Laravel Cache, can be set for other systems.
     *
     * @throws CognitoTokenException if JWKS fetching or decoding fails.
     */
    public function __construct(string $region, string $userPoolId, string $clientId, CacheInterface $cacheDriver = null)
    {
        $this->region = $region;
        $this->userPoolId = $userPoolId;
        $this->clientId = $clientId;
        $this->cacheKey = "cognito_jwks_{$userPoolId}";  // Unique cache key for each user pool
        $this->issuer = "https://cognito-idp.{$region}.amazonaws.com/{$userPoolId}";

        // Use provided cache driver or default to NoCache
        $this->cache = $cacheDriver ?: new NoCache(); // Default to NoCache if not provided

        // Fetch JWKS either from cache or remote source
        $this->jwks = $this->fetchJwks();

        $algorithmManager = new AlgorithmManager([new RS256()]);
        $this->jwsVerifier = new JWSVerifier($algorithmManager);
        $this->serializer = new CompactSerializer();
    }

    /**
     * Fetch the JWKS (JSON Web Key Set) from Cognito.
     *
     * Uses WordPress HTTP API (wp_remote_get) for maximum compatibility
     * with hosting environments where allow_url_fopen is disabled.
     *
     * @return array JWKS data containing the 'keys' array.
     *
     * @throws CognitoTokenException If the JWKS cannot be fetched or is invalid.
     */
    protected function fetchJwks(): array
    {
        // Try to fetch from cache first (if cache driver is available)
        if ($this->cache) {
            $cachedJwks = $this->cache->get($this->cacheKey);
            if ($cachedJwks !== null) {  // Explicit null check (some cache libs return false on miss)
                return $cachedJwks;
            }
        }

        // Build the JWKS endpoint URL
        $jwksUrl = rtrim($this->issuer, '/') . '/.well-known/jwks.json';

        // Perform the HTTP request using WordPress core HTTP API
        $response = wp_remote_get($jwksUrl, [
            'timeout'    => 15,          // Reasonable timeout for external service
            'sslverify'  => true,        // Always verify SSL in production
            'user-agent' => 'Gatey/' . GATEY_VERSION . ' (WordPress JWKS Fetcher)', // Optional but helpful for debugging
        ]);

        if (is_wp_error($response)) {
            throw new CognitoTokenException(
                sprintf('Could not fetch JWKS from %s: %s', $jwksUrl, $response->get_error_message()),
                CognitoTokenException::JWKS_FETCH_FAILED
            );
        }

        $httpCode = wp_remote_retrieve_response_code($response);
        if ($httpCode !== 200) {
            throw new CognitoTokenException(
                sprintf('Failed to fetch JWKS from %s (HTTP %d)', $jwksUrl, $httpCode),
                CognitoTokenException::JWKS_FETCH_FAILED
            );
        }

        $rawJwks = wp_remote_retrieve_body($response);
        if (empty($rawJwks)) {
            throw new CognitoTokenException(
                "Empty response when fetching JWKS from {$jwksUrl}",
                CognitoTokenException::JWKS_FETCH_FAILED
            );
        }

        $decoded = json_decode($rawJwks, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new CognitoTokenException(
                'Invalid JSON in JWKS response: ' . json_last_error_msg(),
                CognitoTokenException::JWKS_INVALID_FORMAT
            );
        }

        if (!isset($decoded['keys']) || !is_array($decoded['keys'])) {
            throw new CognitoTokenException(
                "Invalid JWKS format - 'keys' array not found.",
                CognitoTokenException::JWKS_INVALID_FORMAT
            );
        }

        // Cache the result (only if cache is available)
        if ($this->cache) {
            $this->cache->put($this->cacheKey, $decoded, 3600); // 1 hour in seconds
        }

        return $decoded;
    }


    /**
     * Gets the current UTC timestamp.
     *
     * This method creates a new DateTime object representing the current time in UTC
     * and returns its timestamp (the number of seconds since the Unix epoch).
     *
     * @return int The current UTC timestamp.
     */
    protected function getTimeStamp()
    {
        // Create a new DateTime object with the current time, and set the timezone to UTC
        $currentUtcTime = new \DateTime("now", new \DateTimeZone("UTC"));

        // Get the timestamp (number of seconds since Unix epoch) for the current UTC time
        $currentTimestamp = $currentUtcTime->getTimestamp();

        // Return the current UTC timestamp
        return $currentTimestamp;
    }

    /**
     * Verifies the token's signature and basic claims.
     *
     * @param string $jwt The JWT string.
     * @return array Decoded token payload.
     * @return array|false Decoded token payload or false on failure.
     * @throws CognitoTokenException if verification fails.
     */
    public function verifyToken(string $jwt)
    {
        try {
            // Attempt to unserialize and verify the token
            $jws = $this->serializer->unserialize($jwt);
            $header = $jws->getSignature(0)->getProtectedHeader();
            $kid = $header['kid'] ?? null;

            if (!$kid) {
                throw new CognitoTokenException("No 'kid' found in JWT header.", CognitoTokenException::NO_KID_IN_TOKEN);
            }

            $jwkData = $this->findKeyByKid($kid);
            if (!$jwkData) {
                throw new CognitoTokenException("No matching JWK found for kid: $kid", CognitoTokenException::NO_JWK_FOR_KID);
            }
            $jwk = new JWK($jwkData);

            $isValid = $this->jwsVerifier->verifyWithKey($jws, $jwk, 0);
            if (!$isValid) {
                throw new CognitoTokenException("JWT signature verification failed.", CognitoTokenException::SIGNATURE_VERIFICATION_FAILED);
            }

            $payload = json_decode($jws->getPayload(), true);
            if (!$payload) {
                throw new CognitoTokenException("Failed to decode JWT payload.", CognitoTokenException::TOKEN_PAYLOAD_DECODING_FAILED);
            }

            // Verify issuer.
            if (!isset($payload['iss']) || $payload['iss'] !== $this->issuer) {
                throw new CognitoTokenException("Invalid issuer in token.", CognitoTokenException::INVALID_ISSUER);
            }

            $currentTimestamp = $this->getTimeStamp();

            // Verify token expiration.
            if (isset($payload['exp']) && $currentTimestamp > $payload['exp']) {
                throw new CognitoTokenException("Token is expired.", CognitoTokenException::TOKEN_EXPIRED);
            }

            return $payload; // Return the payload if everything is valid
        } catch (Exception $e) {
            if ($e instanceof CognitoTokenException) {
                throw $e;
            } else {
                throw new CognitoTokenException("Invalid token.", CognitoTokenException::INVALID_TOKEN);
            }
        }
    }

    /**
     * Optionally log errors for debugging or monitoring purposes.
     *
     * @param string $message The error message.
     * @param int $code The error code.
     */
    protected function logError(string $message, int $code): void
    {
        // Log error to file or monitoring system
        error_log("Error: $message, Code: $code");
    }

    /**
     * Verifies a Cognito ID token.
     *
     * @param string $jwt The ID token.
     * @return array Decoded token payload.
     * @throws CognitoTokenException if any validation fails.
     */
    public function verifyIdToken(string $jwt): array
    {
        $payload = $this->verifyToken($jwt);

        if (!isset($payload['aud']) || $payload['aud'] !== $this->clientId) {
            throw new CognitoTokenException("Invalid audience in id_token.", CognitoTokenException::INVALID_AUDIENCE);
        }
        if (!isset($payload['sub'])) {
            throw new CognitoTokenException("Invalid id_token: Missing subject (sub) claim.", CognitoTokenException::MISSING_SUBJECT);
        }

        return $payload;
    }

    /**
     * Verifies a Cognito access token.
     *
     * @param string $jwt The access token.
     * @return array Decoded token payload.
     * @throws CognitoTokenException if any validation fails.
     */
    public function verifyAccessToken(string $jwt): array
    {
        $payload = $this->verifyToken($jwt);

        if (isset($payload['client_id']) && $payload['client_id'] !== $this->clientId) {
            throw new CognitoTokenException("Invalid access token: client_id mismatch.", CognitoTokenException::INVALID_CLIENT_ID_ACCESS);
        }

        return $payload;
    }

    /**
     * Finds a key in the JWKS array by 'kid'.
     *
     * @param string $kid
     * @return array|null
     */
    protected function findKeyByKid(string $kid): ?array
    {
        foreach ($this->jwks['keys'] as $key) {
            if (isset($key['kid']) && $key['kid'] === $kid) {
                return $key;
            }
        }
        return null;
    }
}
