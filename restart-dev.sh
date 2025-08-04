#!/bin/bash

echo "🔄 Restarting Development Server..."

# Kill any existing processes
pkill -f "npm run dev"
pkill -f "server.ts"
pkill -f "vite"

# Wait a moment for processes to terminate
sleep 2

echo "✅ Processes cleared"

# Start the development server
npm run dev
