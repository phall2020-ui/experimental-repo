#!/bin/bash

set -e

echo "🚀 Setting up database and seeding data..."
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    echo "📄 Loading DATABASE_URL from .env file..."
    export $(grep -v '^#' .env | xargs)
  else
    echo "⚠️  DATABASE_URL not set and no .env file found."
    echo ""
    echo "Creating .env file with default values..."
    cat > .env << EOF
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
REDIS_URL="redis://localhost:6379"
S3_BUCKET="ticketing-attachments"
AWS_REGION="eu-west-2"
OPENSEARCH_NODE="http://localhost:9200"
OPENSEARCH_USER="admin"
OPENSEARCH_PASS="admin"
NODE_ENV="development"
PORT=3000
EOF
    echo "✅ Created .env file. Please update DATABASE_URL if your database is at a different location."
    echo ""
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
  fi
fi

echo "📦 Generating Prisma Client..."
npm run prisma:generate

echo ""
echo "🗄️  Running database migrations..."
npm run prisma:deploy || {
  echo ""
  echo "❌ Migration failed. This might mean:"
  echo "   1. The database doesn't exist yet"
  echo "   2. The database server isn't running"
  echo "   3. The connection string is incorrect"
  echo ""
  echo "Please ensure:"
  echo "   - PostgreSQL is installed and running"
  echo "   - The database 'ticketing' exists (or create it)"
  echo "   - DATABASE_URL is correct in .env file"
  echo ""
  exit 1
}

echo ""
echo "🌱 Seeding database with users and sites..."
npm run seed

echo ""
echo "✅ Setup complete! Database has been seeded with:"
echo "   - 1 Tenant"
echo "   - 8 Sites"
echo "   - 10 Users (2 admins, 8 regular users)"
echo "   - 5 Issue Types"
echo "   - 2 Sample Tickets"
echo ""
echo "📝 Test credentials:"
echo "   Admin: admin@example.com / admin123"
echo "   User: user@example.com / user123"
echo ""

