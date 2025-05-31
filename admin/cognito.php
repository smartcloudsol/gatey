<?php
/**
 * Gatey – Cognito JWT validator (web-token/jwt-framework ^4.0)
 *
 * This class set validates AWS Cognito ID & access tokens with:
 *  • signature (RS256)
 *  • issuer match
 *  • audience ‑or‑ client_id match
 *  • token_use match ("id" | "access")
 *  • iat, nbf, exp with 5‑minute leeway (AWS recommendation)
 *
 * PHP ≥ 8.2 required – update your runtime & composer.
 */

declare(strict_types=1);

namespace SmartCloud\WPSuite\Gatey;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly (WP‑context).
}

use DateTimeImmutable;
use GuzzleHttp\ClientInterface;
use Jose\Component\Checker\AlgorithmChecker;
use Jose\Component\Checker\AudienceChecker;
use Jose\Component\Checker\ClaimChecker;
use Jose\Component\Checker\ClaimCheckerManager;
use Jose\Component\Checker\ExpirationTimeChecker;
use Jose\Component\Checker\HeaderCheckerManager;
use Jose\Component\Checker\IssuedAtChecker;
use Jose\Component\Checker\IssuerChecker;
use Jose\Component\Checker\NotBeforeChecker;
use Jose\Component\Checker\InvalidClaimException;
use Jose\Component\Core\AlgorithmManager;
use Jose\Component\Core\JWKSet;
use Jose\Component\Signature\Algorithm\RS256;
use Jose\Component\Signature\JWS;
use Jose\Component\Signature\JWSLoader;
use Jose\Component\Signature\JWSTokenSupport;
use Jose\Component\Signature\JWSVerifier;
use Jose\Component\Signature\Serializer\CompactSerializer;
use Jose\Component\Signature\Serializer\JWSSerializerManager;
use Psr\Clock\ClockInterface;

/**
 * Lightweight PSR‑20 clock that simply returns the current system time.
 * Avoids pulling extra packages such as symfony/clock just for this purpose.
 */
final class SystemClock implements ClockInterface
{
    public function now(): DateTimeImmutable
    {
        return new DateTimeImmutable();
    }
}
/**
 * Config DTO – passed to the decoder.
 */
class CognitoConfiguration
{
    public function __construct(
        public string $region,
        public string $poolId,
        public string $clientId,
    ) {
    }

    public function getIssuer(): string
    {
        return sprintf('https://cognito-idp.%s.amazonaws.com/%s', $this->region, $this->poolId);
    }

    public function getPublicKeysUrl(): string
    {
        return sprintf('%s/.well-known/jwks.json', $this->getIssuer());
    }
}

/**
 * Downloads & returns the JWK set for the user‑pool.
 */
class CognitoKeyManager
{
    public function __construct(
        private ClientInterface $client,
        private CognitoConfiguration $configuration,
    ) {
    }

    public function getKeySet(): JWKSet
    {
        /** @noinspection PhpUnhandledExceptionInspection */
        return JWKSet::createFromJson($this->retrieveKeys());
    }

    private function retrieveKeys(): string
    {
        // @todo: cache this for ~1 h to save latency.
        return (string) $this->client
            ->request('GET', $this->configuration->getPublicKeysUrl())
            ->getBody();
    }
}

// -------------------- custom claim checkers -------------------- //

/**
 * Ensures `client_id` claim equals the configured WP client‑ID.
 */
final class ClientIdChecker implements ClaimChecker
{
    public function __construct(private readonly string $expectedClientId)
    {
    }

    public function checkClaim(mixed $value): void
    {
        if (!is_string($value) || $value !== $this->expectedClientId) {
            throw new InvalidClaimException(
                sprintf('The claim "client_id" must equal "%s".', \esc_html($this->expectedClientId)),
                \esc_html($this->supportedClaim()),
                \esc_html($value),
            );
        }
    }

    public function supportedClaim(): string
    {
        return 'client_id';
    }
}

/**
 * Enforces the `token_use` claim ("id" | "access").
 */
final class TokenUseChecker implements ClaimChecker
{
    public function __construct(private readonly string $expectedUse)
    {
    }

    public function checkClaim(mixed $value): void
    {
        if (!is_string($value) || $value !== $this->expectedUse) {
            throw new InvalidClaimException(
                sprintf('The claim "token_use" must equal "%s".', \esc_html($this->expectedUse)),
                \esc_html($this->supportedClaim()),
                \esc_html($value),
            );
        }
    }

    public function supportedClaim(): string
    {
        return 'token_use';
    }
}

// -------------------- main decoder -------------------- //

class CognitoJwtDecoder
{
    /**
     * Five‑minute clock skew tolerated (in seconds).
     */
    private readonly ClockInterface $clock;
    private const LEEWAY = 300;
    public function __construct(
        private CognitoKeyManager $keyManager,
        private CognitoConfiguration $configuration,
    ) {
        $this->clock = new SystemClock(); // Use a simple system clock.
    }

    /**
     * @throws InvalidClaimException
     */
    public function decodeIdToken(string $token): JWS
    {
        return $this->decodeAndValidate(
            $token,
            [
                new AudienceChecker($this->configuration->clientId),
                new TokenUseChecker('id'),
            ],
            ['iss', 'aud', 'token_use'],
        );
    }

    /**
     * @throws InvalidClaimException
     */
    public function decodeAccessToken(string $token): JWS
    {
        return $this->decodeAndValidate(
            $token,
            [
                new ClientIdChecker($this->configuration->clientId),
                new TokenUseChecker('access'),
            ],
            ['iss', 'client_id', 'token_use'],
        );
    }

    /**
     * Central verification routine used by both token types.
     *
     * @param ClaimChecker[] $claimChecks  Extra claim‑specific checkers.
     * @param string[]       $mandatoryClaims Mandatory claims list.
     *
     * @throws InvalidClaimException
     * @throws \Jose\Component\Checker\MissingMandatoryClaimException
     */
    private function decodeAndValidate(string $token, array $claimChecks, array $mandatoryClaims): JWS
    {
        // 1) Header checks – algorithm must be RS256.
        $headerChecker = new HeaderCheckerManager(
            [new AlgorithmChecker(['RS256'])],
            [new JWSTokenSupport()],
        );

        // 2) Claim checks – merge built‑ins with custom rules.
        $claimChecker = new ClaimCheckerManager(
            array_merge(
                [
                    new IssuedAtChecker($this->clock, self::LEEWAY),
                    new NotBeforeChecker($this->clock, self::LEEWAY),
                    new ExpirationTimeChecker($this->clock, self::LEEWAY),
                    new IssuerChecker([$this->configuration->getIssuer()]),
                ],
                $claimChecks,
            ),
        );

        // 3) Signature validation.
        $algorithmManager = new AlgorithmManager([new RS256()]);
        $jwsVerifier = new JWSVerifier($algorithmManager);
        $serializerMgr = new JWSSerializerManager([new CompactSerializer()]);
        $loader = new JWSLoader($serializerMgr, $jwsVerifier, $headerChecker);

        $signature = 0; // index of the signature to check.
        $jws = $loader->loadAndVerifyWithKeySet($token, $this->keyManager->getKeySet(), $signature);

        // 4) Claim validation.
        /** @noinspection PhpUnhandledExceptionInspection */
        $claims = json_decode($jws->getPayload(), true, 512, JSON_THROW_ON_ERROR);
        $claimChecker->check($claims, $mandatoryClaims);

        return $jws;
    }
}
