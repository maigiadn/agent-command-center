# Backend Dockerfile
FROM node:18-alpine

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files and install
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production

# Remove build tools after install to reduce image size
RUN apk del python3 make g++

# Copy backend source code
COPY backend/ .

# Expose backend port
EXPOSE 3000

CMD ["node", "server.js"]
