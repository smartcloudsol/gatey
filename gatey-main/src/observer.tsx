// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

export const observe = () => {
  const mountAuthenticator = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("gatey-authenticator-block", el.id);
    //jQuery(el).data("rendered", "true");
  };

  const mountAccountAttribute = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("gatey-account-attribute-block", el.id);
    //jQuery(el).data("rendered", "true");
  };

  jQuery(() =>
    jQuery("[gatey-authenticator]").each((_idx, n) => mountAuthenticator(n))
  );
  jQuery(() =>
    jQuery("[gatey-account-attribute]").each((_idx, n) =>
      mountAccountAttribute(n)
    )
  );
  jQuery(window).on("elementor/frontend/init", function () {
    if (elementorFrontend?.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/shortcode.default",
        () => {
          jQuery("[gatey-authenticator]").each((_idx, n) =>
            mountAuthenticator(n)
          );
          jQuery("[gatey-account-attribute]").each((_idx, n) =>
            mountAccountAttribute(n)
          );
        }
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_authenticator.default",
        () => {
          jQuery("[gatey-authenticator]").each((_idx, n) =>
            mountAuthenticator(n)
          );
        }
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_account_attribute.default",
        () => {
          jQuery("[gatey-account-attribute]").each((_idx, n) =>
            mountAccountAttribute(n)
          );
        }
      );
    }
  });
};
