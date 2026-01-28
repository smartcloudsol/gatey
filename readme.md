# Gatey Plugin Suite

Gatey is a WordPress plugin that connects Amazon Cognito to your site in minutes — providing secure login, SSO, and MFA without any PHP backend. Built for Gutenberg and Elementor with native AWS Amplify support.

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

- `gatey-core/`: Shared JavaScript modules (authentication logic, requires `wpsuite-core`)
- `gatey-main/`: Base JavaScript (Gatey.cognito namespace) and CSS features, loaded on every page
- `gatey-admin/`: Logic for the WordPress admin interface
- `gatey-blocks/`: Authenticator screens and Gutenberg blocks
- `wpsuite-admin/`: Logic for the WordPress Hub admin interface
- `dist/` folders: Contain compiled and minified frontend output
- Plugin PHP code and metadata (e.g. `composer.json`, `readme.txt`) are located in the **project root**

⚠️ **Note:**  
The `wpsuite-core/` package is not part of this repository.  
It lives in the separate [Hub for WPSuite.io](https://github.com/smartcloudsol/hub-for-wpsuiteio) repository and must be built and linked before building Gatey.

### Source of WPSuite Admin Code

The code under the `wpsuite-admin/` directory originates from the [Hub for WPSuite.io](https://github.com/smartcloudsol/hub-for-wpsuiteio) repository.  
That repository hosts the shared administrative interface used across all future WPSuite plugins, including Gatey.

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
git clone https://github.com/smartcloudsol/hub-for-wpsuiteio.git
git clone https://github.com/smartcloudsol/gatey.git
```

Your folder structure should look like:
```
/projects/
  hub-for-wpsuiteio/
    wpsuite-core/
    wpsuite-admin/
  gatey/
    gatey-core/
    gatey-main/
    gatey-admin/
    gatey-blocks/
```

### 2. Install JavaScript Dependencies
```bash
# Hub repo
cd hub-for-wpsuiteio/wpsuite-core
yarn install

cd ../wpsuite-admin
yarn install

# Gatey repo
cd ../../gatey/gatey-core
yarn install

cd ../gatey-main
yarn install

cd ../gatey-admin
yarn install

cd ../gatey-blocks
yarn install
```

### 3. Build and Link `wpsuite-core` and `gatey-core`
First, build and link `wpsuite-core` from the Hub repo:

```bash
cd ../hub-for-wpsuiteio/wpsuite-core
yarn run build
npm link
```

Then build and link `gatey-core`, which depends on `wpsuite-core`:

```bash
cd ../../gatey/gatey-core
yarn run build
npm link @smart-cloud/wpsuite-core
npm link
```

### 4. Link `gatey-core` in Other Gatey Projects
The remaining Gatey modules only need `gatey-core` (which already pulls in `wpsuite-core`):

```bash
# Inside each of gatey-main, gatey-admin, gatey-blocks
npm link @smart-cloud/gatey-core
```

### 5. Build Other Frontend Modules
```bash
cd gatey-main
yarn run build-wp dist

cd ../gatey-admin
yarn run build-wp dist

cd ../gatey-blocks
yarn run build-wp dist
```

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
- During development, rebuild JS projects after changes (`yarn run build` or watch mode if supported).
- Ensure `wpsuite-core` (Hub repo) and `gatey-core` (Gatey repo) are re-built and re-linked if modified.
- PHP changes are loaded automatically by WordPress, no recompilation needed.
- You may use tools like `wp-env` or a local WordPress install for testing.

## Packaging for Deployment

Ensure the built assets are copied into the simplified plugin layout:

- `gatey-main/dist/*` → `main/`
- `gatey-blocks/dist/*` → `blocks/`
- `gatey-admin/php/*` and `gatey-admin/dist/*` → `admin/`
- `wpsuite-admin/php/*` and `wpsuite-admin/dist/*` → `hub-for-wpsuiteio/`

Once the structure matches the layout above, create the distributable ZIP:

```bash
git archive --format zip -o gatey.zip HEAD
```

This uses rules defined in the `.gitattributes` file to include only required `dist` content and production PHP code.

## Dependencies

- **wpsuite-core** (from Hub for WPSuite.io repo; must be built locally)
- **gatey-core** (from Gatey repo; must be built locally)
- **Node.js / Yarn or NPM**: For building frontend assets
- **Composer**: For PHP dependency management
- **PHP >= 8.1**
- **WordPress**: Target environment

## License

MIT License

---

_If you encounter issues or want to contribute, feel free to open a pull request or an issue._
