# Free Managed Services Setup - Implementation Summary

This document summarizes the changes made to enable the Tickets application to run on free managed services (Neon Postgres + Upstash Redis) with optional features.

## Overview

The application has been enhanced to support graceful degradation when optional services (OpenSearch, S3) are not configured. This enables developers to run the application using only free-tier managed databases without needing to set up additional infrastructure.

## What Changed

### 1. Backend Service Layer

#### Features Endpoint (`/features`)
- **New endpoint**: `GET /features`
- **Response**: `{ search: boolean, attachments: boolean }`
- **Purpose**: Allows clients to check which features are available in the current environment

#### Attachments Service
- **Graceful degradation**: Returns HTTP 501 (Not Implemented) when S3 is not configured
- **No crashes**: Application starts successfully even without S3 credentials
- **Clear error messages**: Users get informative errors instead of internal server errors

#### Redis Health Check
- **Enhanced error handling**: Better retry strategy and error messages
- **TLS support**: Automatically handles `rediss://` URLs for services like Upstash
- **Non-blocking**: Redis connection failures don't crash the application

### 2. Developer Tools

#### Environment Validation Script (`check:env`)
```bash
npm run check:env
```
- Validates all required environment variables
- Shows helpful hints for missing or misconfigured values
- Detects Neon connection strings and validates SSL mode
- Indicates which features will be enabled/disabled

#### Managed Services Development Script (`dev:neon`)
```bash
npm run dev:neon
```
- Runs environment validation before starting the server
- Provides early feedback on configuration issues
- Ideal for development with external databases

### 3. Frontend UI Updates

#### Features Context Provider
- Fetches feature availability from `/features` endpoint on app load
- Provides global access to feature flags via React Context
- Graceful fallback when API is unavailable

#### Attachments Component
- Shows clear "Attachments Unavailable" banner when S3 is not configured
- Prevents upload attempts when feature is disabled
- Provides instructions on how to enable the feature

#### Search Component
- Shows informational alert when advanced search is unavailable
- Basic database search still works (case-insensitive substring matching)
- Clear messaging about feature limitations

### 4. Infrastructure

#### Docker Compose Override
- **File**: `ticketing-suite/docker-compose.override.yml`
- **Purpose**: Allows using external managed services with Docker Compose
- **Behavior**: Disables local PostgreSQL, Redis, and OpenSearch containers
- **Usage**: Automatically applied when running `docker-compose up`

### 5. Documentation

#### New README Sections
1. **Free Setup with Neon + Upstash**: Step-by-step guide for getting started with free managed services
2. **Using Neon Postgres**: Specific instructions and connection string format
3. **Feature Availability**: Explains optional features and how to enable them later
4. **Testing**: How to run tests with minimal configuration

## Environment Variables Reference

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string (use `?sslmode=require` for Neon)
- `REDIS_URL`: Redis connection string (use `rediss://` for Upstash TLS)

### Optional Variables (for enhanced features)
- `OPENSEARCH_NODE`: OpenSearch endpoint (enables advanced search)
- `OPENSEARCH_USER`: OpenSearch username
- `OPENSEARCH_PASS`: OpenSearch password
- `S3_BUCKET`: AWS S3 bucket name (enables attachments)
- `AWS_REGION`: AWS region for S3
- `AWS_ACCESS_KEY_ID`: AWS credentials (or use IAM role)
- `AWS_SECRET_ACCESS_KEY`: AWS credentials (or use IAM role)

## Feature Matrix

| Feature | Minimal Setup | Full Setup | Notes |
|---------|--------------|------------|-------|
| Core ticketing | ✅ | ✅ | Always available |
| Database operations | ✅ | ✅ | Works with Neon or local PostgreSQL |
| Caching | ✅ | ✅ | Works with Upstash or local Redis |
| Basic search | ✅ | ✅ | Database substring matching |
| Advanced search | ❌ | ✅ | Requires OpenSearch |
| Attachments | ❌ | ✅ | Requires S3 configuration |

## Getting Started Scenarios

### Scenario 1: Free Tier Only (Minimal)
**Cost**: $0/month

1. Create free Neon database
2. Create free Upstash Redis
3. Set `DATABASE_URL` and `REDIS_URL`
4. Run `npm run dev:neon`

**Available**: Core ticketing, basic search, caching  
**Not Available**: Advanced search, attachments

### Scenario 2: Add Attachments Later
**Cost**: AWS S3 pricing (very cheap for small usage)

1. Create S3 bucket
2. Add `S3_BUCKET` and `AWS_REGION` to environment
3. Restart application
4. Attachments automatically enabled

### Scenario 3: Full Production Setup
**Cost**: Varies based on usage

1. Use Neon Pro or dedicated PostgreSQL
2. Use Upstash or dedicated Redis
3. Add OpenSearch cluster
4. Add S3 configuration
5. All features enabled

## Testing

### Running Tests with Minimal Configuration

```bash
# Set only required variables
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."

# Run tests
npm run test:e2e
```

### Features Endpoint Tests

A new test suite (`test/features.e2e-spec.ts`) validates:
- Feature flags correctly reflect environment configuration
- Search flag is false when OPENSEARCH_NODE is not set
- Attachments flag is false when S3_BUCKET is not set

## Migration Path

### From Local Development to Managed Services

1. **Export your data** (if needed):
   ```bash
   pg_dump ticketing > backup.sql
   ```

2. **Create Neon database** and import:
   ```bash
   psql "postgresql://...?sslmode=require" < backup.sql
   ```

3. **Update environment**:
   ```bash
   DATABASE_URL="postgresql://...?sslmode=require"
   REDIS_URL="rediss://..."
   ```

4. **Verify configuration**:
   ```bash
   npm run check:env
   ```

5. **Test the application**:
   ```bash
   npm run dev:neon
   ```

### From Managed Services to Full Setup

Simply add the optional environment variables and restart. No code changes needed!

## Troubleshooting

### "Attachments Unavailable" banner shows but S3 is configured

**Check**:
1. Both `S3_BUCKET` and `AWS_REGION` are set
2. AWS credentials are available (environment variables or IAM role)
3. Restart the application after setting environment variables

### Health checks failing for Redis

**Check**:
1. Redis URL is correct
2. For Upstash, use `rediss://` protocol (with double 's' for TLS)
3. Network connectivity to Redis host
4. Redis instance is running

### Database connection errors with Neon

**Check**:
1. Connection string includes `?sslmode=require`
2. Database is not in sleep mode (free tier)
3. Network connectivity to Neon host
4. Credentials are correct

### Features endpoint returns all false

**Check**:
1. Environment variables are set in the correct file/location
2. Application was restarted after changing environment
3. Run `npm run check:env` to diagnose

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use connection pooling** for production databases
3. **Enable SSL/TLS** for all external connections (Neon requires it)
4. **Use IAM roles** instead of AWS keys when possible
5. **Rotate credentials** regularly
6. **Use secrets management** (AWS Secrets Manager, HashiCorp Vault) for production

## Performance Tips

### Neon Postgres
- Free tier may have compute limits
- Consider upgrading for production workloads
- Use connection pooling (PgBouncer)

### Upstash Redis
- Free tier has request limits
- Consider caching strategy to minimize requests
- Use Redis for session management and caching, not as primary data store

## Next Steps

1. **Monitor your usage** on Neon and Upstash dashboards
2. **Set up backups** for your Neon database
3. **Configure alerts** for database and Redis issues
4. **Plan for scaling** as your application grows
5. **Add OpenSearch** when you need advanced search features
6. **Add S3** when you need file attachments

## Support

- **Application Issues**: Open an issue on GitHub
- **Neon Support**: https://neon.tech/docs
- **Upstash Support**: https://docs.upstash.com/redis
- **General Questions**: See README.md

## Contributing

If you find issues with this setup or have suggestions for improvements, please:
1. Open an issue describing the problem
2. Submit a PR with proposed changes
3. Update this documentation as needed

---

Last updated: 2025-11-09
