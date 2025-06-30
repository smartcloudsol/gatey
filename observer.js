(function () {
    const mountAuthenticator = (_idx, el) => {
        if (jQuery(el).data("rendered")) return;
        jQuery(document).trigger("gatey-authenticator-block", el.id);
        jQuery(el).data("rendered", 'true');
    };

    const mountAccountAttribute = (_idx, el) => {
        if (jQuery(el).data("rendered")) return;
        jQuery(document).trigger("gatey-account-attribute-block", el.id);
        jQuery(el).data("rendered", 'true');
    };

    // Initial pass
    jQuery(() => jQuery('[gatey-authenticator]').each(mountAuthenticator));
    jQuery(() => jQuery('[gatey-account-attribute]').each(mountAccountAttribute));
    jQuery(window).on("elementor/frontend/init", function () {
        elementorFrontend?.hooks && elementorFrontend.hooks.addAction("frontend/element_ready/shortcode.default", () => { jQuery('[gatey-authenticator]').each(mountAuthenticator); jQuery('[gatey-account-attribute]').each(mountAccountAttribute); });
    });

    // Observe future mutations (Elementor swap, Ajax, etc.)
    new MutationObserver((mutList) => {
        mutList.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.matches('[gatey-authenticator]')) mountAuthenticator(node);
                    if (node.matches('[gatey-account-attribute]')) mountAccountAttribute(node);
                    node.querySelectorAll?.('[gatey-authenticator]').forEach(mountAuthenticator);
                    node.querySelectorAll?.('[gatey-account-attribute]').forEach(mountAccountAttribute);
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
})();