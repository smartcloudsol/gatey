(function () {
    const mount = (_idx, el) => {
        if (jQuery(el).data("rendered")) return;
        jQuery(document).trigger("gatey-block", el.id);
        jQuery(el).data("rendered", 'true');
    };

    // Initial pass
    jQuery(() => jQuery('[gatey-authenticator]').each(mount));
    jQuery(window).on("elementor/frontend/init", function () {
        elementorFrontend?.hooks && elementorFrontend.hooks.addAction("frontend/element_ready/shortcode.default", () => jQuery('[gatey-authenticator]').each(mount));
    });

    // Observe future mutations (Elementor swap, Ajax, etc.)
    new MutationObserver((mutList) => {
        mutList.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.matches('[gatey-authenticator]')) mount(node);
                    node.querySelectorAll?.('[gatey-authenticator]').forEach(mount);
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
})();