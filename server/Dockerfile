# server/Dockerfile
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production || npm install

# Copy application code
COPY . .

EXPOSE 5000

# Use node directly instead of nodemon for production
CMD ["node", "server.js"]