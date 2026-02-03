// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const elementorFrontend: any;

export const observe = () => {
  const mountAuthenticator = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-gatey-authenticator-block", el.id);
    //jQuery(el).data("rendered", "true");
  };

  const mountAccountAttribute = (el: HTMLElement) => {
    if (!el?.id || jQuery(el).data("rendered")) return;
    jQuery(document).trigger("smartcloud-gatey-account-attribute-block", el.id);
    //jQuery(el).data("rendered", "true");
  };

  jQuery(() =>
    jQuery("[smartcloud-gatey-authenticator]").each((_idx, n) =>
      mountAuthenticator(n),
    ),
  );
  jQuery(() =>
    jQuery("[smartcloud-gatey-account-attribute]").each((_idx, n) =>
      mountAccountAttribute(n),
    ),
  );
  jQuery(window).on("elementor/frontend/init", function () {
    if (elementorFrontend?.hooks) {
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/shortcode.default",
        () => {
          jQuery("[smartcloud-gatey-authenticator]").each((_idx, n) =>
            mountAuthenticator(n),
          );
          jQuery("[smartcloud-gatey-account-attribute]").each((_idx, n) =>
            mountAccountAttribute(n),
          );
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_authenticator.default",
        () => {
          jQuery("[smartcloud-gatey-authenticator]").each((_idx, n) =>
            mountAuthenticator(n),
          );
        },
      );
      elementorFrontend.hooks.addAction(
        "frontend/element_ready/gatey_account_attribute.default",
        () => {
          jQuery("[smartcloud-gatey-account-attribute]").each((_idx, n) =>
            mountAccountAttribute(n),
          );
        },
      );
    }
  });
};
