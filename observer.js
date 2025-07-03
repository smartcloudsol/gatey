(function () {
    const mountAuthenticator = (el) => {
        if (!el?.id || jQuery(el).data("rendered")) return;
        jQuery(document).trigger("gatey-authenticator-block", el.id);
        jQuery(el).data("rendered", "true");
    };

    const mountAccountAttribute = (el) => {
        if (!el?.id || jQuery(el).data("rendered")) return;
        jQuery(document).trigger("gatey-account-attribute-block", el.id);
        jQuery(el).data("rendered", "true");
    };

    // Initial pass
    jQuery(() => jQuery('[gatey-authenticator]').each(mountAuthenticator));
    jQuery(() => jQuery('[gatey-account-attribute]').each(mountAccountAttribute));
    jQuery(window).on("elementor/frontend/init", function () {
        elementorFrontend?.hooks && elementorFrontend.hooks.addAction("frontend/element_ready/shortcode.default", () => { jQuery('[gatey-authenticator]').each((_idx, n) => mountAuthenticator(n)); jQuery('[gatey-account-attribute]').each((_idx, n) => mountAccountAttribute(n)); });
    });

    if (document.body) {
        try {
            new MutationObserver((mutList) => {
                mutList.forEach((m) => {
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            try {
                                if (node.matches('[gatey-authenticator]')) mountAuthenticator(node);
                                if (node.matches('[gatey-account-attribute]')) mountAccountAttribute(node);
                                node.querySelectorAll?.('[gatey-authenticator]').forEach((_idx, n) => mountAuthenticator(n));
                                node.querySelectorAll?.('[gatey-account-attribute]').forEach((_idx, n) => mountAccountAttribute(n));
                            } catch (e) {
                                console.warn("Gatey observer failed to process node:", e, node);
                            }
                        }
                    });
                });
            }).observe(document.body, { childList: true, subtree: true });
        } catch (e) {
            console.warn("Gatey observer failed to initialize:", e);
        }
    }
})();