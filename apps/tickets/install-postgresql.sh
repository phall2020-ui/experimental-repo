#!/bin/bash

set -e

echo "🚀 PostgreSQL Installation Script"
echo "=================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Homebrew not found. Installing Homebrew..."
    echo "   (This will ask for your password)"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -f "/usr/local/bin/brew" ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
fi

echo ""
echo "✅ Homebrew is installed"
echo ""

# Install PostgreSQL
echo "📦 Installing PostgreSQL 16..."
brew install postgresql@16

echo ""
echo "🔄 Starting PostgreSQL service..."
brew services start postgresql@16

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to start..."
sleep 3

# Check if PostgreSQL is ready
for i in {1..10}; do
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "   Attempt $i/10..."
    sleep 1
done

# Create database
echo ""
echo "🗄️  Creating database 'ticketing'..."
createdb ticketing 2>/dev/null || {
    if [ $? -eq 1 ]; then
        echo "⚠️  Database 'ticketing' might already exist, continuing..."
    else
        echo "❌ Failed to create database. Please create it manually:"
        echo "   createdb ticketing"
        exit 1
    fi
}

echo ""
echo "✅ PostgreSQL installation complete!"
echo ""
echo "📝 Next steps:"
echo "   cd ticketing-suite/ticketing"
echo "   ./setup-and-seed.sh"
echo ""

