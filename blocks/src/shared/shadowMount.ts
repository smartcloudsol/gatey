type GateyRuntimeConstants = {
  authenticatorViewCssHref?: string | null;
  wpsuiteThemeCssHref?: string | null;
};

type ShadowMountOptions = {
  rootClassName: string;
  stylesheets?: Array<string | null | undefined>;
  minHeight?: string;
};

function getGateyRuntimeConstants(): GateyRuntimeConstants {
  return (
    (
      globalThis as typeof globalThis & {
        WpSuite?: {
          constants?: {
            gatey?: GateyRuntimeConstants;
          };
        };
      }
    ).WpSuite?.constants?.gatey ?? {}
  );
}

function ensureStylesheets(
  shadowRoot: ShadowRoot,
  ownerDocument: Document,
  stylesheets: string[],
): Promise<void[]> {
  return Promise.all(
    stylesheets.map((href) => {
      const id = `gatey-style-${btoa(href).replace(/=+$/g, "")}`;
      if (shadowRoot.getElementById(id)) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        const link = ownerDocument.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        shadowRoot.appendChild(link);
      });
    }),
  );
}

export function getAuthenticatorShadowStylesheets(): string[] {
  const { authenticatorViewCssHref, wpsuiteThemeCssHref } =
    getGateyRuntimeConstants();

  return [authenticatorViewCssHref, wpsuiteThemeCssHref].filter(
    (href): href is string => typeof href === "string" && href.length > 0,
  );
}

export function getGateySharedShadowStylesheets(): string[] {
  const href = getGateyRuntimeConstants().wpsuiteThemeCssHref;

  return typeof href === "string" && href.length > 0 ? [href] : [];
}

export async function ensureShadowMount(
  target: HTMLElement,
  options: ShadowMountOptions,
): Promise<HTMLDivElement> {
  const { rootClassName, stylesheets = [], minHeight } = options;

  target.style.outline = "none";
  target.style.boxShadow = "none";
  target.style.backgroundColor = "transparent";
  target.style.display = "block";
  target.style.position = "relative";

  const ownerDocument = target.ownerDocument;
  const shadowRoot = target.shadowRoot ?? target.attachShadow({ mode: "open" });
  const hrefs = stylesheets.filter(
    (href): href is string => typeof href === "string" && href.length > 0,
  );

  let rootElement = shadowRoot.querySelector<HTMLDivElement>(
    `.${rootClassName}`,
  );
  if (!rootElement) {
    shadowRoot.innerHTML = "";
    await ensureStylesheets(shadowRoot, ownerDocument, hrefs);

    rootElement = ownerDocument.createElement("div");
    rootElement.className = rootClassName;
    shadowRoot.appendChild(rootElement);
  } else if (hrefs.length > 0) {
    await ensureStylesheets(shadowRoot, ownerDocument, hrefs);
  }

  rootElement.className = rootClassName;
  rootElement.style.position = "relative";
  rootElement.style.margin = "0";
  rootElement.style.overflow = "visible";
  if (minHeight) {
    rootElement.style.minHeight = minHeight;
  }

  return rootElement;
}

export function clearShadowMount(target: Element): void {
  if (target instanceof HTMLElement && target.shadowRoot) {
    target.shadowRoot.innerHTML = "";
  }
}
