FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY server ./server
RUN cd server && npm ci --include=dev --no-audit --no-fund
RUN cd server && npm run build
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]