FROM node:latest
COPY . /usr/src/app/
WORKDIR /usr/src/app
RUN npm install
RUN chmod +x ./installModules.sh && ./installModules.sh

CMD ["node", "bot.js"]
