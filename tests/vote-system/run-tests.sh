#!/bin/bash

# Vote System Tests Runner
# This script runs all vote system tests

echo "🧪 Running SodeClick Vote System Tests..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the tests/vote-system directory"
    echo "   cd tests/vote-system && ./run-tests.sh"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests
echo ""
echo "🔍 Running Vote Consistency Test..."
node test-vote-consistency.js

echo ""
echo "🔍 Running Premium Vote Display Test..."
node test-premium-vote-display.js

echo ""
echo "✅ All tests completed!"
echo "📝 Check the results above for any issues"
