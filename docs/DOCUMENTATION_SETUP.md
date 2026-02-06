# 📚 API Documentation Setup Guide

This guide explains how to set up and deploy the API documentation for the Nuoilon Backend project.

## ✅ What's Included

- ✨ **NestJS Swagger** integration for interactive API documentation
- 📊 **OpenAPI JSON** export for API specifications
- 🎨 **Swagger UI** for development (interactive testing)
- 📖 **Redoc** for production (beautiful static documentation)
- 🏷️ **Organized by client type**: Web, Telegram, AppScript (HMAC)
- 🚀 **GitHub Pages** deployment automation

## 🎯 Documentation Structure

```
docs/
├── index.html              # Landing page with navigation
├── complete.html           # Complete API documentation (Redoc)
├── web.html               # Web client documentation (Redoc)
├── telegram.html          # Telegram bot documentation (Redoc)
├── appscripts.html        # AppScript HMAC documentation (Redoc)
├── openapi-complete.json  # Complete OpenAPI specification
├── openapi-web.json       # Web client OpenAPI spec
├── openapi-telegram.json  # Telegram OpenAPI spec
├── openapi-appscripts.json # AppScript OpenAPI spec
├── README.md              # Documentation guide
└── .nojekyll              # GitHub Pages configuration
```

## 🔧 Local Development

### Start the development server:
```bash
npm run start:dev
```

### Access Swagger UI (Interactive):
- **Complete**: http://localhost:3000/api/docs
- **Web**: http://localhost:3000/api/docs/web
- **Telegram**: http://localhost:3000/api/docs/telegram
- **AppScript**: http://localhost:3000/api/docs/appscripts

Features:
- Interactive API testing
- Try out endpoints directly from the browser
- View request/response schemas
- Authentication testing

## 📝 Generate Documentation

### Generate OpenAPI JSON files:
```bash
npm run docs:generate
```

This command:
1. Builds the NestJS application
2. Extracts OpenAPI specifications for each client
3. Saves JSON files to the `docs/` directory

### Preview static documentation locally:
```bash
npm run docs:serve
```

Then open http://localhost:8080 in your browser.

## 🚀 GitHub Pages Deployment

### Automatic Deployment

The documentation is automatically deployed to GitHub Pages when you push to the `main` branch.

**Workflow file**: `.github/workflows/deploy-docs.yml`

### Setup GitHub Pages (One-time):

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select:
   - Source: **GitHub Actions**
4. Save the settings

### Manual Deployment

Trigger a manual deployment:

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy API Documentation to GitHub Pages**
3. Click **Run workflow**

### Access Documentation

Once deployed, your documentation will be available at:

```
https://[your-username].github.io/nuoilon-be/
```

Individual pages:
- **Landing**: https://[your-username].github.io/nuoilon-be/
- **Complete**: https://[your-username].github.io/nuoilon-be/complete.html
- **Web**: https://[your-username].github.io/nuoilon-be/web.html
- **Telegram**: https://[your-username].github.io/nuoilon-be/telegram.html
- **AppScript**: https://[your-username].github.io/nuoilon-be/appscripts.html

## 📋 Adding Documentation to Your Code

### Controllers

Add tags to organize endpoints:

```typescript
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('web')
@Controller('web')
export class WebController {}
```

### Endpoints

Document your endpoints with detailed information:

```typescript
import { Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@Post('users')
@ApiOperation({ 
  summary: 'Create a new user',
  description: 'Creates a new user account with the provided information'
})
@ApiBody({ type: CreateUserDto })
@ApiResponse({ 
  status: 201, 
  description: 'User successfully created'
})
@ApiResponse({ 
  status: 400, 
  description: 'Invalid request data'
})
async createUser(@Body() dto: CreateUserDto) {
  // Implementation
}
```

### DTOs

Add property documentation:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe'
  })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### Authentication

For endpoints requiring authentication:

**Bearer Token** (Web & Telegram):
```typescript
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Get('profile')
async getProfile() {
  // Implementation
}
```

**HMAC Signature** (AppScript):
```typescript
import { ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('HMAC-Signature')
@Post('data')
async uploadData() {
  // Implementation
}
```

## 🔐 Authentication Setup

### Web & Telegram Clients
- **Type**: Bearer Token
- **Header**: `Authorization: Bearer <token>`

### AppScript Client
- **Type**: HMAC Signature
- **Header**: `X-Signature: <hmac-signature>`
- Protected by `HmacSignatureGuard`

## 🎨 Customization

### Modify Swagger UI appearance

Edit [src/main.ts](../src/main.ts):

```typescript
SwaggerModule.setup('api/docs', app, document, {
  customSiteTitle: 'My API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  customfavIcon: '/favicon.ico',
});
```

### Modify Redoc theme

Edit HTML files in `docs/` directory to customize colors and styling.

## 📦 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start development server with Swagger UI |
| `npm run docs:generate` | Generate OpenAPI JSON files |
| `npm run docs:serve` | Serve static documentation locally |

## 🐛 Troubleshooting

### OpenAPI files not generated?
Run `npm run docs:generate` manually to regenerate.

### GitHub Pages not updating?
1. Check the **Actions** tab for workflow status
2. Ensure GitHub Pages is enabled in repository settings
3. Verify the workflow has necessary permissions

### Swagger UI not showing?
Make sure you're running in development mode (`NODE_ENV !== 'production'`).

### Missing endpoints in documentation?
Ensure your modules are properly imported in `AppModule` and controllers have proper decorators.

## 📚 Additional Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Redoc Documentation](https://redocly.com/docs/redoc/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## 🤝 Contributing

When adding new endpoints:
1. Add appropriate `@Api*` decorators
2. Document all DTOs with `@ApiProperty`
3. Add examples and descriptions
4. Run `npm run docs:generate` to update JSON files
5. Test locally with `npm run docs:serve`

---

Happy documenting! 📖✨
