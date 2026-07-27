FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
