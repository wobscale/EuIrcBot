FROM node:7
COPY . /usr/src/app/
WORKDIR /usr/src/app

RUN useradd --home-dir /usr/src/app bot
RUN chown -R bot:bot /usr/src/app
VOLUME /usr/src/app/conf
VOLUME /usr/src/app/data

USER bot
RUN npm install

CMD ["node", "--max_old_space_size=150", "bot.js"]
