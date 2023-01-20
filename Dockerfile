FROM node:19-bullseye-slim
ENV TZ=Europe/Paris

RUN apt-get update && \
    apt-get install -y libgtk2.0-0 libgtk-3-0 libnotify-dev \
            libgconf-2-4 libnss3 libxss1 \
            libasound2 libxtst6 xauth xvfb \
            libgbm-dev

RUN mkdir -p /home/node/app \
    && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node app.js        .
COPY --chown=node:node package*.json .

USER node
RUN npm ci --only=production

CMD ["node", "app.js"]