# CS3 Bridge Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p /app/extensions
EXPOSE 5000
CMD ["npm", "start"]
