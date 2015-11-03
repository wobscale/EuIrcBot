FROM node:latest

RUN mkdir /EuIrcBot
RUN mkdir /EuIrcBot/data
WORKDIR /EuIrcBot

COPY package.json ./

RUN npm install
RUN npm install forever -g

COPY ./installModules.sh ./
COPY ./modules ./modules
COPY ./node-module-manager.js ./
RUN chmod +x installModules.sh
RUN sh installModules.sh

COPY ./conf ./conf
COPY ./config.json ./
COPY ./config.example.json ./
COPY ./bot.js ./
CMD forever start bot.js
