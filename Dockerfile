FROM node:20-slim
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY server ./server
ENV NPM_CONFIG_PRODUCTION=false
RUN cd server && npm ci --include=dev --no-audit --no-fund
RUN cd server && npm run build
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]