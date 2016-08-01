FROM node:latest
COPY . /usr/src/app/
WORKDIR /usr/src/app
RUN npm install
RUN chmod +x ./installModules.sh && ./installModules.sh

VOLUME /usr/src/app/conf
VOLUME /usr/src/app/data

CMD ["node", "bot.js"]
