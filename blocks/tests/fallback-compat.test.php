<?php

declare(strict_types=1);

define('ABSPATH', __DIR__ . '/');

function wp_rand(): int
{
    return 1234;
}

function wp_json_encode($value): string
{
    return (string) json_encode($value);
}

function esc_html($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function esc_attr($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function get_block_wrapper_attributes(): string
{
    return 'class="wp-block-test"';
}

function wp_kses_data($value): string
{
    return (string) $value;
}

function wp_kses_post($value): string
{
    return (string) $value;
}

final class TestInnerBlock
{
    public function __construct(public string $name, private string $html)
    {
    }

    public function render(): string
    {
        return $this->html;
    }
}

function renderAuthenticator(array $innerBlocks): string
{
    $attributes = ['authMode' => 'signIn'];
    $content = '<!-- wp:gatey/custom-block --><p>configuration child</p><!-- /wp:gatey/custom-block -->';
    $block = (object) ['inner_blocks' => $innerBlocks];

    ob_start();
    include dirname(__DIR__) . '/src/authenticator/render.php';
    return (string) ob_get_clean();
}

function expect(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, $message . PHP_EOL);
        exit(1);
    }
}

$fallback = new TestInnerBlock('wpsuite/react-fallback', '<div data-wpsuite-react-fallback>Loading account</div>');
$config = new TestInnerBlock('gatey/custom-block', '<p>configuration child</p>');
$withFallback = renderAuthenticator([$fallback, $config]);
$withoutFallback = renderAuthenticator([$config]);

expect(str_contains($withFallback, 'data-wpsuite-react-fallback'), 'Authenticator must render its authored fallback.');
expect(str_contains($withFallback, 'smartcloud-gatey-authenticator__mount'), 'Authenticator must expose a dedicated React mount.');
expect(str_contains($withFallback, 'smartcloud-gatey-authenticator__config'), 'Authenticator must preserve its hidden configuration.');
expect(str_contains($withoutFallback, 'smartcloud-gatey-authenticator__mount'), 'Authenticator must remain mountable without a fallback.');

$pluginSource = (string) file_get_contents(dirname(__DIR__, 2) . '/gatey.php');
$widgetSource = (string) file_get_contents(dirname(__DIR__, 2) . '/gatey-elementor-widgets.php');

expect(str_contains($pluginSource, '$id = $a[\'id\'];'), 'Gatey shortcode must continue to read its pattern ID.');
expect(str_contains($pluginSource, "'innerBlocks' => \$block['innerBlocks']"), 'Gatey shortcode must retain the selected pattern inner blocks.');
expect(str_contains($widgetSource, "\$atts['id'] = \$all['pattern'];"), 'Gatey Elementor widget must pass its pattern as shortcode ID.');
expect(str_contains($widgetSource, "smartcloud_gatey_do_shortcode('gatey'"), 'Gatey Elementor widget must retain its shortcode adapter.');

fwrite(STDOUT, "Gatey fallback, shortcode and Elementor compatibility checks passed.\n");
