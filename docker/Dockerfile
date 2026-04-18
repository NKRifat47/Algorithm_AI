FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY . .

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "until npx prisma migrate deploy; do echo 'Waiting for DB...'; sleep 3; done && node src/server.js"]