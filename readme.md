# Gatey Plugin Suite

This repository contains the complete source code and frontend modules for the free version of [Gatey WordPress plugin](https://wordpress.org/plugins/gatey/). The plugin provides a modular authentication and administration interface for WordPress-based systems.

![Node.js](https://img.shields.io/badge/node-%3E%3D16.x-blue.svg)
![PHP](https://img.shields.io/badge/PHP-%3E%3D8.1-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Documentation

You can find the plugin’s continuously expanding, detailed documentation at: [WP Suite – Gatey Docs](https://wpsuite.io/gatey/docs/)

## Machine-readable resources
* AI plugin manifest: https://wpsuite.io/.well-known/ai-plugin.json
* OpenAPI spec: https://wpsuite.io/.well-known/openapi.yaml

## Project Structure

- `gatey-core/`: Shared JavaScript modules (e.g. authentication logic)
- `gatey-main/`: Base JavaScript (Gatey.cognito namespace) and CSS features, loaded on every page
- `gatey-admin/`: Logic for the WordPress admin interface
- `gatey-blocks/`: Authenticator screens and Gutenberg blocks
- `dist/` folders: Contain compiled and minified frontend output
- Plugin PHP code and metadata (e.g. `composer.json`, `readme.txt`) are located in the **project root**

## Installation and Build Guide

### Prerequisites
- Node.js (>= 16.x)
- Yarn or NPM
- PHP >= 8.1
- Composer
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/smartcloudsol/gatey.git
cd gatey
```

### 2. Install JavaScript Dependencies
Each frontend project (`gatey-core`, `gatey-main`, `gatey-admin`, `gatey-blocks`) requires its own dependency installation:

```bash
cd gatey-core
yarn install

cd ../gatey-main
yarn install

cd ../gatey-admin
yarn install

cd ../gatey-blocks
yarn install
```
(Use `npm install` instead of `yarn` if you prefer NPM.)

### 3. Build `gatey-core`
Start by building the core module:

```bash
cd gatey-core
yarn run build
```

#### Optional: Link `gatey-core`
To ensure the other modules can import shared logic from `gatey-core`, link it locally:

```bash
# Inside gatey-core
npm link

# Inside each of gatey-main, gatey-admin, gatey-blocks
npm link @smart-cloud/gatey-core
```

### 4. Build Other Frontend Modules
You can now build the remaining frontend projects in any order:

```bash
cd gatey-main
yarn run build-wp dist

cd ../gatey-admin
yarn run build-wp dist

cd ../gatey-blocks
yarn run build-wp dist
```

### 5. Install PHP Dependencies
From the **root directory**, run:

```bash
composer install --no-dev --no-scripts --optimize-autoloader --classmap-authoritative
```

### 5. Clear PHP Dependencies
From the **root directory**, run:

```bash
./clean.sh
```

### 7. Development Workflow
- During development, rebuild JS projects after changes (`yarn run build` or watch mode if supported).
- Ensure `gatey-core` is re-built and re-linked if modified.
- PHP changes are loaded automatically by WordPress, no recompilation needed.
- You may use tools like `wp-env` or a local WordPress install for testing.

## Packaging for Deployment

Once all components have been successfully built, archive the project into a deployable WordPress plugin ZIP:

```bash
git archive --format zip -o gatey.zip HEAD
```

This uses rules defined in the `.gitattributes` file to include only required `dist` content and production PHP code.

## Dependencies

- **Node.js / Yarn or NPM**: For building frontend assets
- **Composer**: For PHP dependency management
- **PHP >= 8.1**
- **WordPress**: Target environment

## License

MIT License

---

_If you encounter issues or want to contribute, feel free to open a pull request or an issue._
