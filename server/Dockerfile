# Dockerfile for ProSync Hub Backend (Node.js/Express)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "start"]
