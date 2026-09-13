# Gatey Plugin Suite

Gatey is a WordPress plugin that connects Amazon Cognito to your site in minutes — providing secure login, SSO, and MFA without any PHP backend. Its frontend Authenticator includes 22 built-in languages and follows the active WordPress or multilingual-provider locale. Built for Gutenberg and Elementor with native AWS Amplify support.

Gatey also uses the shared WP Suite localization catalog. Site owners can override matching strings once for Gatey, AI-Kit, and Flow, set a site-wide fallback locale, or add further locales under **SmartCloud → Global Settings → Custom Translations** without editing plugin files.

This repository contains the complete source code and frontend modules for the free version of [Gatey WordPress plugin](https://wordpress.org/plugins/gatey/). 

![Node.js](https://img.shields.io/badge/node-%3E%3D16.x-blue.svg)
![PHP](https://img.shields.io/badge/PHP-%3E%3D8.1-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Documentation

You can find the plugin’s continuously expanding, detailed documentation at: [WP Suite Docs](https://wpsuite.io/docs/)

## Machine-readable resources
* AI plugin manifest: https://wpsuite.io/.well-known/ai-plugin.json
* OpenAPI spec: https://wpsuite.io/.well-known/openapi.yaml

## Project Structure

- `core/`: Shared JavaScript modules (`@smart-cloud/gatey-core`, requires `wpsuite-core`)
- `main/`: Base JavaScript (`Gatey.cognito` namespace) and CSS features, loaded on every page; build here and copy the generated assets from `main/dist/` into the final plugin layout
- `admin/`: Logic for the WordPress admin interface; build here and copy the generated assets from `admin/dist/` and `admin/php/` into the final plugin layout
- `blocks/`: Authenticator screens and Gutenberg blocks; build here and copy the generated assets from `blocks/dist/` into the final plugin layout
- `wpsuite-main/` (in the Hub repository): Shared frontend bundle that is copied into `smartcloud-wpsuite/`; its `dist/` output provides the script loaded on every page to initialize WPSuite reCAPTCHA v3 when needed
- `dist/` folders under `main/`, `admin/`, and `blocks/`: Contain compiled and minified frontend output that should be copied into the distributable plugin layout
- Plugin PHP code and metadata (e.g. `composer.json`, `readme.txt`) are located in the **project root**

⚠️ **Note:**  
The `wpsuite-core/` package is not part of this repository.  
It lives in the separate [SmartCloud WP Suite](https://github.com/smartcloudsol/smartcloud-wpsuite) repository and must be built and linked before building Gatey.

### Source of Shared WPSuite Hub Code

The shared WordPress Hub code lives in the `wpsuite-admin/` and `wpsuite-main/` directories of the [SmartCloud WP Suite](https://github.com/smartcloudsol/smartcloud-wpsuite) repository.
That repository hosts the shared administrative interface, site-wide localization catalog, and global frontend assets used across WP Suite plugins, including Gatey, AI-Kit, and Flow.

## Installation and Build Guide

### Prerequisites
- Node.js (>= 16.x)
- Yarn or NPM
- PHP >= 8.1
- Composer
- Git

### 1. Clone the Repositories
You need both Gatey and Hub (for `wpsuite-core`). Place them side by side:

```bash
git clone https://github.com/smartcloudsol/smartcloud-wpsuite.git
git clone https://github.com/smartcloudsol/gatey.git
```

Your folder structure should look like:
```
/projects/
  smartcloud-wpsuite/
    wpsuite-core/
    wpsuite-admin/
  gatey/
    core/
    main/
    admin/
    blocks/
```

### 2. Install JavaScript Dependencies
```bash
# Hub repo
cd smartcloud-wpsuite/wpsuite-core
yarn install

cd ../wpsuite-admin
yarn install

# Gatey repo
cd ../../gatey/core
yarn install

cd ../main
yarn install

cd ../admin
yarn install

cd ../blocks
yarn install
```

### 3. Build and Link `wpsuite-core` and Gatey Core
First, build and link `wpsuite-core` from the Hub repo:

```bash
cd ../smartcloud-wpsuite/wpsuite-core
yarn run build
npm link
```

Then build and link Gatey's core package from `core/`, which depends on `wpsuite-core`:

```bash
cd ../../gatey/core
yarn run build
npm link @smart-cloud/wpsuite-core
npm link
```

### 4. Link Gatey Core in Other Gatey Projects
The remaining Gatey modules only need `@smart-cloud/gatey-core` (which already pulls in `wpsuite-core`):

```bash
# Inside each of main, admin, blocks
npm link @smart-cloud/gatey-core
```

### 5. Build Other Frontend Modules
```bash
cd main
yarn run build-wp dist

cd ../admin
yarn run build-wp dist

cd ../blocks
yarn run build-wp dist
```

After building `main/`, `admin/`, and `blocks/`, copy the generated assets from each module's `dist/` directory into the matching plugin directory. For `admin/`, copy the PHP files from `admin/php/` as well.

### 6. Install PHP Dependencies
From the **root directory** of Gatey:

```bash
composer install --no-dev --no-scripts --optimize-autoloader --classmap-authoritative
```

### 7. Clear PHP Dependencies
From the **root directory**:

```bash
./clean.sh
```

### 8. Development Workflow
- During development, rebuild `core/` after shared logic changes (`yarn run build`) and rebuild `main/`, `admin/`, or `blocks/` with `yarn run build-wp dist` after frontend changes.
- Ensure `wpsuite-core` (Hub repo) and Gatey's core package in `core/` are re-built and re-linked if modified.
- PHP changes are loaded automatically by WordPress, no recompilation needed.
- You may use tools like `wp-env` or a local WordPress install for testing.

## Packaging for Deployment

Ensure the built assets are copied into the simplified plugin layout:

- `main/dist/*` → `main/`
- `blocks/dist/*` → `blocks/`
- `admin/php/*` and `admin/dist/*` → `admin/`

If you rebuild the shared Hub assets in the separate Hub repository, copy the following outputs into the plugin's `smartcloud-wpsuite/` directory according to that repository's instructions:

- `wpsuite-main/dist/*` → `smartcloud-wpsuite/`
- `wpsuite-admin/php/*` and `wpsuite-admin/dist/*` → `smartcloud-wpsuite/`
- `wpsuite-*-vendor/dist/*.js` → `smartcloud-wpsuite/assets/js/`
- `wpsuite-*-vendor/dist/*.css` → `smartcloud-wpsuite/assets/css/`

The `wpsuite-main/dist/` bundle provides the script that loads on every page and initializes the reCAPTCHA v3 flow used by WPSuite plugins whenever it is needed.

Once the structure matches the layout above, create the distributable ZIP:

```bash
git archive --format zip -o gatey.zip HEAD
```

This uses rules defined in the `.gitattributes` file to include only required `dist` content and production PHP code.

## Dependencies

- **wpsuite-core** (from SmartCloud WP Suite repo; must be built locally)
- **gatey-core** (built locally from the `core/` workspace)
- **Node.js / Yarn or NPM**: For building frontend assets
- **Composer**: For PHP dependency management
- **PHP >= 8.1**
- **WordPress**: Target environment

## License

MIT License

---

_If you encounter issues or want to contribute, feel free to open a pull request or an issue._
