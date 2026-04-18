// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

const AUTHENTICATOR_SELECTOR = "[smartcloud-gatey-authenticator]";
const ACCOUNT_ATTRIBUTE_SELECTOR = "[smartcloud-gatey-account-attribute]";

function getScopeRoot(scope?: unknown): ParentNode {
  const jqueryScope = scope as { 0?: unknown; length?: number } | undefined;
  if (jqueryScope?.length && jqueryScope[0] instanceof HTMLElement) {
    return jqueryScope[0];
  }

  if (scope instanceof HTMLElement || scope instanceof Document) {
    return scope;
  }

  return document;
}

function getMountTargets(scope: ParentNode, selector: string): HTMLElement[] {
  const targets: HTMLElement[] = [];

  if (scope instanceof HTMLElement && scope.matches(selector)) {
    targets.push(scope);
  }

  if ("querySelectorAll" in scope) {
    targets.push(...Array.from(scope.querySelectorAll<HTMLElement>(selector)));
  }

  return targets;
}

export const observe = () => {
  const mountAuthenticator = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-gatey-authenticator-block", el.id);
  };

  const mountAccountAttribute = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-gatey-account-attribute-block", el.id);
  };

  const scanAuthenticator = (scope?: unknown) => {
    const root = getScopeRoot(scope);
    getMountTargets(root, AUTHENTICATOR_SELECTOR).forEach((element) => {
      mountAuthenticator(element);
    });
  };

  const scanAccountAttribute = (scope?: unknown) => {
    const root = getScopeRoot(scope);
    getMountTargets(root, ACCOUNT_ATTRIBUTE_SELECTOR).forEach((element) => {
      mountAccountAttribute(element);
    });
  };

  jQuery(() => {
    scanAuthenticator();
    scanAccountAttribute();
  });

  jQuery(window).on("elementor/frontend/init", function () {
    if (elementorFrontend?.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/shortcode.default",
        ($scope: unknown) => {
          scanAuthenticator($scope);
          scanAccountAttribute($scope);
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_authenticator.default",
        ($scope: unknown) => {
          scanAuthenticator($scope);
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_account_attribute.default",
        ($scope: unknown) => {
          scanAccountAttribute($scope);
        },
      );
    }
  });
};
