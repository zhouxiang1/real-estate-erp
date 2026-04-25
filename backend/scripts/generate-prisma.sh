#!/bin/bash

# Prisma Generation Workaround Script
# This script provides multiple methods to generate Prisma client when the standard method fails

echo "Attempting to generate Prisma client..."

# Method 1: Standard generation
echo "Method 1: Standard generation..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✓ Prisma client generated successfully!"
    exit 0
fi

# Method 2: Using Docker
echo ""
echo "Method 2: Using Docker..."
if command -v docker &> /dev/null; then
    docker run --rm -v $(pwd):/app -w /app node:20-slim npx prisma generate

    if [ $? -eq 0 ]; then
        echo "✓ Prisma client generated successfully via Docker!"
        exit 0
    fi
else
    echo "Docker not found, skipping Method 2"
fi

# Method 3: Fetch and regenerate
echo ""
echo "Method 3: Fetching Prisma engine..."
npx prisma fetch --force

if [ $? -eq 0 ]; then
    echo "Regenerating client..."
    npx prisma generate

    if [ $? -eq 0 ]; then
        echo "✓ Prisma client generated successfully!"
        exit 0
    fi
fi

echo ""
echo "✗ All methods failed. Please check your Node.js version and try:"
echo "  1. Update Node.js to version 20 or later"
echo "  2. Use Docker to generate the client"
echo "  3. Check the Prisma documentation for your platform"
exit 1
