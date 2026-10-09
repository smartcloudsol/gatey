import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// The shared browser-test dependency is already installed in the Flow workspace.
const require = createRequire(new URL('../../../flow/admin/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wpCssPath = process.env.WPSUITE_WORDPRESS_CSS;
assert.ok(wpCssPath, 'Set WPSUITE_WORDPRESS_CSS to the real WordPress admin stylesheet.');
const wordpressCss = await readFile(wpCssPath, 'utf8');
// Render the real General checkbox fieldsets so a missing layout wrapper regresses here.
const mainSource = await readFile(resolve(root, 'src/main.tsx'), 'utf8');
const checkboxFieldsets = ['Login Mechanisms', 'Social Providers'].map(label => {
  const labelIndex = mainSource.indexOf(`text="${label}"`);
  assert.ok(labelIndex > 0);
  const start = mainSource.lastIndexOf('<Fieldset', labelIndex);
  const end = mainSource.indexOf('</Fieldset>', labelIndex) + '</Fieldset>'.length;
  return mainSource.slice(start, end);
}).join('\n');
const bundled = await build({
  absWorkingDir: root, bundle: true, write: false, outfile: '/tmp/gatey-checkbox-fixture.js',
  format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  stdin: { resolveDir: root, loader: 'tsx', contents: `
    import React from 'react'; import { createRoot } from 'react-dom/client';
    import { MantineProvider, Checkbox, Fieldset, Stack } from '@mantine/core';
    import '@mantine/core/styles.css'; import './src/main.module.css';
    function GeneralGroups() {
      const [settingsFormData, setSettingsFormData] = React.useState({loginMechanisms:['email'],socialProviders:[]});
      const savingSettings = false; const openInfo = () => {};
      const InfoLabel = ({text}) => <span>{text}</span>;
      return <div id="general-groups">${checkboxFieldsets}</div>;
    }
    createRoot(document.getElementById('smartcloud-gatey-admin')).render(<MantineProvider><div id="isolation-checks">
      <Checkbox label="Email" defaultChecked />
      <Checkbox label="Username" />
      <Checkbox label="Disabled" disabled defaultChecked />
      <Checkbox label="Mixed" indeterminate />
    </div><GeneralGroups /></MantineProvider>);
  ` },
});
const js = bundled.outputFiles.find(file => file.path.endsWith('.js')).text;
const css = bundled.outputFiles.find(file => file.path.endsWith('.css')).text;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const integrated of [false, true]) {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      try {
        await page.setContent(`<body class="wp-admin wp-core-ui">${integrated ? '<section id="wpsuite-product-details">' : ''}<div id="smartcloud-gatey-admin"></div>${integrated ? '</section>' : ''}<label>Native WordPress<input id="native" type="checkbox" checked></label></body>`);
        // Deliberately load WP last: the isolated override must survive either enqueue order.
        await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: wordpressCss });
        await page.addScriptTag({ content: js });
        const email = page.locator('#isolation-checks').getByRole('checkbox', { name: 'Email', exact: true });
        await email.waitFor();
        const measurements = await page.locator('#isolation-checks .mantine-Checkbox-input').evaluateAll(inputs => inputs.map(input => {
          const style = getComputedStyle(input);
          const inputBox = input.getBoundingClientRect();
          const iconBox = input.nextElementSibling.getBoundingClientRect();
          return {
            before: getComputedStyle(input, '::before').content,
            after: getComputedStyle(input, '::after').content,
            margin: style.margin, visibleIcon: input.checked || input.indeterminate,
            offsetX: Math.abs(inputBox.x + inputBox.width / 2 - iconBox.x - iconBox.width / 2),
            offsetY: Math.abs(inputBox.y + inputBox.height / 2 - iconBox.y - iconBox.height / 2),
          };
        }));
        assert.equal(measurements.length, 4);
        for (const item of measurements) {
          assert.equal(item.before, 'none', 'No WordPress checkmark over the Mantine icon.');
          assert.equal(item.after, 'none');
          assert.equal(item.margin, '0px');
          if (item.visibleIcon) assert.ok(item.offsetX < 1 && item.offsetY < 1, `The input and icon stay aligned at every viewport: ${JSON.stringify(item)}`);
        }
        for (const label of ['Login Mechanisms', 'Social Providers']) {
          const group = page.getByRole('group', {name: label});
          const boxes = await group.locator('.mantine-Checkbox-root').evaluateAll(rows => rows.map(row => {
            const rect = row.getBoundingClientRect(); return {top:rect.top,bottom:rect.bottom};
          }));
          assert.ok(boxes.length >= 3);
          for(let i=1; i<boxes.length; i++) {
            assert.ok(boxes[i].top - boxes[i-1].bottom >= 9, `${label} rows need a visible gap at ${width}px`);
          }
          const checkbox = group.getByRole('checkbox').first();
          const before = await checkbox.isChecked();
          await checkbox.focus(); await page.keyboard.press('Space');
          assert.equal(await checkbox.isChecked(), !before, `${label} keeps keyboard interaction`);
        }
        assert.notEqual(await page.locator('#native').evaluate(input => getComputedStyle(input, '::before').content), 'none', 'Ordinary WordPress controls retain their checkmark.');
        await email.uncheck();
        assert.equal(await email.isChecked(), false);
        await email.focus();
        await page.keyboard.press('Space');
        assert.equal(await email.isChecked(), true, 'Keyboard checkbox interaction remains intact.');
        assert.equal(await page.getByRole('checkbox', { name: 'Disabled', exact: true }).isDisabled(), true);
      } finally { await page.close(); }
    }
  }
  console.log('Passed Gatey checkbox isolation, alignment and keyboard checks in standalone/integrated admin, desktop/mobile.');
} finally { await browser.close(); }
