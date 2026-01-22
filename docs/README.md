# Nuoilon API Documentation

This directory contains the API documentation for the Nuoilon Backend project.

## 📚 Available Documentation

The API documentation is organized by client type:

### 🌐 Web Client
- **Swagger UI (Dev)**: http://localhost:3000/api/docs/web
- **Redoc (Static)**: [web.html](./web.html)
- **OpenAPI JSON**: [openapi-web.json](./openapi-web.json)

### 💬 Telegram Bot
- **Swagger UI (Dev)**: http://localhost:3000/api/docs/telegram
- **Redoc (Static)**: [telegram.html](./telegram.html)
- **OpenAPI JSON**: [openapi-telegram.json](./openapi-telegram.json)

### 📊 AppScript (HMAC)
- **Swagger UI (Dev)**: http://localhost:3000/api/docs/appscripts
- **Redoc (Static)**: [appscripts.html](./appscripts.html)
- **OpenAPI JSON**: [openapi-appscripts.json](./openapi-appscripts.json)

### 📖 Complete Documentation
- **Swagger UI (Dev)**: http://localhost:3000/api/docs
- **Redoc (Static)**: [index.html](./index.html)
- **OpenAPI JSON**: [openapi-complete.json](./openapi-complete.json)

## 🚀 Usage

### Development (with Swagger UI)

1. Start the development server:
```bash
npm run start:dev
```

2. Open your browser and navigate to:
   - Complete docs: http://localhost:3000/api/docs
   - Web docs: http://localhost:3000/api/docs/web
   - Telegram docs: http://localhost:3000/api/docs/telegram
   - AppScript docs: http://localhost:3000/api/docs/appscripts

### Generate OpenAPI JSON Files

To generate/update the OpenAPI JSON files:

```bash
npm run docs:generate
```

This will create/update all JSON files in the `docs/` directory.

### View Static Documentation Locally

To view the Redoc documentation locally:

```bash
npm run docs:serve
```

Then open http://localhost:8080 in your browser.

### GitHub Pages Deployment

The documentation is automatically deployed to GitHub Pages on every push to the `main` branch.

Once deployed, you can access the documentation at:
- https://[your-username].github.io/nuoilon-be/
- https://[your-username].github.io/nuoilon-be/web.html
- https://[your-username].github.io/nuoilon-be/telegram.html
- https://[your-username].github.io/nuoilon-be/appscripts.html

## 🔐 Authentication

### Web & Telegram Clients
- Use **Bearer Token** authentication
- Add `Authorization: Bearer <token>` header to requests

### AppScript Client
- Uses **HMAC Signature** authentication
- Add `X-Signature` header with HMAC signature
- Signature is validated by `HmacSignatureGuard`

## 📝 Notes

- OpenAPI JSON files are automatically generated when running in development mode
- Static HTML files use Redoc for a clean, professional documentation interface
- The documentation is split by client type for better organization and clarity
- All endpoints are tagged appropriately for easy filtering
