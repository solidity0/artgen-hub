FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production DATA_FILE=/data/raffle.json PORT=8787
VOLUME /data
EXPOSE 8787
USER node
CMD ["node", "server.js"]
