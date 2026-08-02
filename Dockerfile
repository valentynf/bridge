FROM node:20.11.1-slim
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY shared ./shared
COPY server ./server
ENV NODE_ENV=development
RUN cd server && npm install
RUN cd server && npm run build
ENV NODE_ENV=production
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/index.js"]