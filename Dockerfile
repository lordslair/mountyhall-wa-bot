# Build Stage 1
FROM node:20-bullseye-slim AS BASEIMAGE

WORKDIR /src

ENV PUPPETEER_CACHE_DIR=/tmp/browser
RUN npm i --save venom-bot winston
COPY . .

# Build Stage 2
FROM node:20-bullseye-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgtk-3-0 \
        libnotify-dev \
        libgconf-2-4 \
        libnss3 \
        libxss1 \
        libasound2 \
        libxtst6 \
        xauth \
        xvfb \
        libgbm-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/node/app \
    && chown -R node:node /home/node/app

WORKDIR /home/node/app

ENV PUPPETEER_CACHE_DIR=/tmp/browser
ENV PUPPETEER_DOWNLOAD_PATH=/home/node/app/browser
COPY --chown=node:node app.js           ./
COPY --from=BASEIMAGE --chown=node:node /src/node_modules ./node_modules
COPY --from=BASEIMAGE --chown=node:node /tmp/browser      ./browser

USER node

CMD ["node", "app.js"]