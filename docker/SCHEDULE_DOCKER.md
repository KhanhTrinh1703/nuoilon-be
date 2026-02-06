# Nuoilon Backend - Schedule Service Docker Setup

## Overview
This guide explains how to build and run the `nuoilon-be-schedule` service using Docker. The schedule service handles periodic tasks like fund price crawling.

## Prerequisites
- Docker installed and running
- Docker Compose (optional, for easier management)
- Database connection string (PostgreSQL via NeonDB or local)

## Quick Start

### Step 1: Create Environment File

Create a `docker/schedule.env` file with the following contents:

```env
PORT=3000
APP_MODE=schedule
NODE_ENV=production
DATABASE_URL=your-database-url
```

**Environment Variables:**
- `PORT`: Port the service runs on (default: 3000)
- `APP_MODE`: Set to `schedule` to enable schedule service mode
- `NODE_ENV`: Set to `production` for production deployments
- `DATABASE_URL`: PostgreSQL connection string (NeonDB recommended for cloud)
  - Example: `postgresql://user:password@host:port/database?sslmode=require`

### Step 2: Build Docker Image

Build the Docker image for the schedule service:

```bash
docker build -f ./docker/Dockerfile.schedule -t nuoilon-be-schedule .
```

**Build options:**
- `-f ./docker/Dockerfile.schedule`: Specifies the Dockerfile for schedule service
- `-t nuoilon-be-schedule`: Tags the image with name `nuoilon-be-schedule`

### Step 3: Run Container

Run the container with the environment file:

```bash
docker run -d \
  --name nuoilon-schedule \
  -p 3000:3000 \
  --env-file ./docker/schedule.env \
  -v logs:/app/logs \
  nuoilon-be-schedule
```

**Options breakdown:**
- `-d`: Run in detached mode (background)
- `--name nuoilon-schedule`: Container name for easy reference
- `-p 3000:3000`: Map container port 3000 to host port 3000
- `--env-file ./docker/schedule.env`: Load environment variables from file
- `-v "{path_to_your_local_machine}\logs:/app/logs"`: Mount volume for persistent logs
- `nuoilon-be-schedule`: Image name to run

## Useful Commands

### View Logs
```bash
docker logs -f nuoilon-schedule
```

### Stop Container
```bash
docker stop nuoilon-schedule
```

### Restart Container
```bash
docker restart nuoilon-schedule
```

### Remove Container
```bash
docker rm nuoilon-schedule
```

### View Running Containers
```bash
docker ps
```

## Troubleshooting

### Container Exits Immediately
Check logs for errors:
```bash
docker logs nuoilon-schedule
```

### Database Connection Failed
- Verify `DATABASE_URL` is correct and accessible from container
- Ensure firewall allows outbound connections
- For NeonDB, check SSL is enabled

### Volume/Logs Directory Issues
Ensure logs directory exists on host:
```bash
mkdir -p logs
```

## Production Considerations

- Use a dedicated database user with minimal permissions
- Store secrets in Docker secrets or environment variables management system
- Enable log rotation to prevent disk space issues
- Use health checks in Docker configuration
- Consider using Docker networks for multi-container setups
- Set resource limits (CPU, memory) for the container

## Docker Compose Alternative

For easier management, create a `docker-compose.schedule.yml`:

```yaml
version: '3.8'

services:
  nuoilon-schedule:
    build:
      context: .
      dockerfile: ./docker/Dockerfile.schedule
    container_name: nuoilon-schedule
    ports:
      - '3000:3000'
    env_file:
      - ./docker/schedule.env
    volumes:
      - logs:/app/logs
    restart: unless-stopped

volumes:
  logs:
    driver: local
```

Then run with:

```bash
docker-compose -f docker-compose.schedule.yml up -d
```
