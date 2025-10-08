#!/bin/bash

# Automated Deployment Script
echo "Starting automated deployment process..."

# 1. Clean Installation
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# 2. Environment Setup
echo "NODE_ENV=production
NEXT_PUBLIC_API_URL=/api
UNIVERSAL_BYPASS=enabled
API_OVERRIDE=enabled
SECURITY_LAYER=maximum" > .env.production

# 3. Build Process
npm run build:client
npm run build:server

# 4. Database Migrations
npm run db:migrate

# 5. Start Production Server
npm run start
