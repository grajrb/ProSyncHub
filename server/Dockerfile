FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "src/index.js"]
