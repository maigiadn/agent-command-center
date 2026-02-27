# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
