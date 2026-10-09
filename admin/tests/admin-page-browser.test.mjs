// Reuse the legacy admin component fixture; the target is the actual Gatey Main.
process.env.WPSUITE_ROUTING_TARGET = 'gatey';
await import('../../../flow/admin/tests/admin-navigation-browser.test.mjs');
