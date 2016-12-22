FROM node:latest
COPY . /usr/src/app/
WORKDIR /usr/src/app
RUN npm install

VOLUME /usr/src/app/conf
VOLUME /usr/src/app/data

CMD ["node", "--max_old_space_size=150","bot.js"]
