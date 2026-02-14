#!/bin/bash
echo "🚀 PostgreSQL Installation Helper"
echo ""
echo "This script will help you install PostgreSQL on macOS"
echo ""
echo "Choose an option:"
echo "1. Install via Homebrew (recommended)"
echo "2. Use PostgreSQL.app (GUI)"
echo "3. Use Docker"
echo "4. Manual installation guide"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    echo "Installing Homebrew (if needed)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo "Installing PostgreSQL..."
    brew install postgresql@16
    echo "Starting PostgreSQL service..."
    brew services start postgresql@16
    echo "Creating database..."
    sleep 2
    createdb ticketing
    echo "✅ PostgreSQL installed and database created!"
    echo "Run: cd ticketing-suite/ticketing && ./setup-and-seed.sh"
    ;;
  2)
    echo "Please download PostgreSQL.app from: https://postgresapp.com/"
    echo "After installation, run: createdb ticketing"
    echo "Then: cd ticketing-suite/ticketing && ./setup-and-seed.sh"
    ;;
  3)
    echo "Starting Docker container..."
    cd ticketing-suite && docker compose up -d db
    echo "✅ Database container started!"
    echo "Run: cd ticketing-suite/ticketing && ./setup-and-seed.sh"
    ;;
  4)
    echo "See INSTALL_POSTGRESQL.md for detailed instructions"
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
