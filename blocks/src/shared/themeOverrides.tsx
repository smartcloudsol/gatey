type ThemeOverridesStyleProps = {
  themeOverrides?: string;
  isPreview: boolean;
  previewRootClassName: string;
  previewUsesShadowRoot?: boolean;
};

const sanitizeThemeOverrides = (input: string): string =>
  input
    .replace(/<\/?(?:style|script)\b[^>]*>/gi, "")
    .replace(/@import\s+['"]?javascript:[^;]+;?/gi, "")
    .replace(/url\(\s*(['"]?)javascript:[^)]+\)/gi, "")
    .replace(/\bexpression\s*\([^)]*\)/gi, "");

const normalizePreviewThemeOverrides = (
  input: string,
  previewRootClassName: string,
): string =>
  input
    .replace(/:host\(([^)]+)\)/g, `.${previewRootClassName}$1`)
    .replace(/:host\b/g, `.${previewRootClassName}`);

export function ThemeOverridesStyle({
  themeOverrides,
  isPreview,
  previewRootClassName,
  previewUsesShadowRoot = false,
}: ThemeOverridesStyleProps) {
  const trimmed = themeOverrides?.trim() ?? "";
  if (trimmed === "") {
    return null;
  }

  const sanitized = sanitizeThemeOverrides(trimmed);
  if (sanitized.trim() === "") {
    return null;
  }

  const css =
    isPreview && !previewUsesShadowRoot
      ? normalizePreviewThemeOverrides(sanitized, previewRootClassName)
      : sanitized;

  return <style>{css}</style>;
}
