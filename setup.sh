#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install react-router-dom

# Make sure Tailwind is properly configured
echo "Setting up Tailwind CSS..."
npx tailwindcss init -p

# Create build
echo "Building the application..."
npm run build

# Start the application
echo "Starting the application..."
npm run dev
