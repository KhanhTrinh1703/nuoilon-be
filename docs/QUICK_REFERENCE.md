# API Documentation Quick Reference

## 🔗 Local URLs (Development)

| Client | Swagger UI URL |
|--------|----------------|
| Complete | http://localhost:3000/api/docs |
| Web | http://localhost:3000/api/docs/web |
| Telegram | http://localhost:3000/api/docs/telegram |
| AppScript | http://localhost:3000/api/docs/appscripts |

## 📦 NPM Scripts

```bash
# Start development server with Swagger UI
npm run start:dev

# Generate OpenAPI JSON files
npm run docs:generate

# Preview static documentation locally
npm run docs:serve
```

## 🏷️ Common Decorators

### Controller Level
```typescript
import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';

@ApiTags('tag-name')        // Group endpoints by tag
@ApiBearerAuth()             // Require Bearer token
@ApiSecurity('HMAC-Signature') // Require HMAC signature
@Controller('path')
export class MyController {}
```

### Endpoint Level
```typescript
import { Post, Get, Patch, Delete } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

@Post()
@ApiOperation({ summary: 'Short description', description: 'Long description' })
@ApiBody({ type: MyDto })
@ApiResponse({ status: 201, description: 'Created' })
@ApiResponse({ status: 400, description: 'Bad Request' })
async create() {}
```

### DTO Properties
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MyDto {
  @ApiProperty({ 
    description: 'Description',
    example: 'example-value'
  })
  requiredField: string;

  @ApiPropertyOptional({ 
    description: 'Optional field',
    example: 123
  })
  optionalField?: number;
}
```

## 🔐 Authentication

### Bearer Token (Web & Telegram)
```typescript
@ApiBearerAuth()
```
**Header**: `Authorization: Bearer <token>`

### HMAC Signature (AppScript)
```typescript
@ApiSecurity('HMAC-Signature')
```
**Header**: `X-Signature: <hmac-signature>`

## 📁 File Locations

```
src/main.ts                    # Swagger setup
scripts/generate-docs.ts       # OpenAPI generator
docs/                          # Static documentation
.github/workflows/deploy-docs.yml # CI/CD workflow
```

## 🌐 GitHub Pages URLs (After Deployment)

Replace `[username]` with your GitHub username:

- https://[username].github.io/nuoilon-be/
- https://[username].github.io/nuoilon-be/complete.html
- https://[username].github.io/nuoilon-be/web.html
- https://[username].github.io/nuoilon-be/telegram.html
- https://[username].github.io/nuoilon-be/appscripts.html

## 🎯 Client Tags

| Client | Tag | Authentication |
|--------|-----|----------------|
| Web | `@ApiTags('web')` | Bearer Token |
| Telegram | `@ApiTags('telegram')` | Bearer Token |
| AppScript | `@ApiTags('appscripts')` | HMAC Signature |

## 📊 Response Status Codes

```typescript
@ApiResponse({ status: 200, description: 'OK' })
@ApiResponse({ status: 201, description: 'Created' })
@ApiResponse({ status: 400, description: 'Bad Request' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden' })
@ApiResponse({ status: 404, description: 'Not Found' })
@ApiResponse({ status: 500, description: 'Internal Server Error' })
```

## 🔄 Workflow

1. Add `@Api*` decorators to controllers/DTOs
2. Test locally: `npm run start:dev`
3. Generate JSON: `npm run docs:generate`
4. Preview: `npm run docs:serve`
5. Push to GitHub (auto-deploys to Pages)

---

📚 For detailed documentation, see: [DOCUMENTATION_SETUP.md](./DOCUMENTATION_SETUP.md)
