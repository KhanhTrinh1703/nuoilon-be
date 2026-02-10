# Docker Setup

## Local Development (Docker Compose)

### Prerequisites
- Docker Desktop (or Docker Engine) installed
- Docker Compose v2 available

### Environment Setup
1. Ensure a `.env` file exists at the repository root.
2. Use local database variables (do not set `DATABASE_URL` for local dev):

```
NODE_ENV=development
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=nuoilon
ACTIVE_SECRET=local-dev-secret
APP_MODE=web
```

### Start Services
```
docker-compose up -d
```

### View Logs
```
docker-compose logs -f app
```

### Run Migrations
```
docker-compose exec app npm run migration:run
```

### Access the API
- API base: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs (development only)

### Stop Services
```
docker-compose down
```

### Remove Volumes (Clean Reset)
```
docker-compose down -v
```

### Rebuild Containers (after dependency changes)
```
docker-compose up -d --build
```

### Development Workflow Notes
- Hot reload is enabled via `npm run start:dev`.
- Edit files in `src/` and changes will recompile automatically.
- The `node_modules` volume prevents host dependencies from overwriting container builds.

## Production Deployment (Standalone Container)

### Build Image
```
docker build -t nuoilon-be:latest .
```

### Run Container (external database)
```
docker run -d \
  --name nuoilon-be \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e ACTIVE_SECRET=your-production-secret \
  -e APP_MODE=web \
  nuoilon-be:latest
```

### View Logs
```
docker logs -f nuoilon-be
```

### Run Migrations
```
docker exec nuoilon-be npm run migration:run
```

### Stop and Remove
```
docker stop nuoilon-be
```

```
docker rm nuoilon-be
```

## Troubleshooting
- **Chromium fails to launch**: Ensure the container has at least 512MB RAM and no seccomp restrictions.
- **Database connection errors**: Verify `DATABASE_URL` or `DB_*` variables and confirm the DB is reachable.
- **Port conflicts**: Change the `3000:3000` mapping or stop the conflicting service.
- **Volume permission issues**: Run `docker-compose down -v`, then re-run `docker-compose up -d`.
- **Playwright install slow**: The first build downloads Chromium. Subsequent builds are cached.