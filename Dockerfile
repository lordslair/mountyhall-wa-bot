# Build Stage 1
FROM node:19-bullseye-slim AS BASEIMAGE

WORKDIR /src
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Build Stage 2
FROM node:19-bullseye-slim

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
ENV TZ=Europe/Paris
COPY --chown=node:node app.js           ./
COPY --chown=node:node package*.json    ./
COPY --from=BASEIMAGE /src/node_modules ./node_modules

USER node

CMD ["node", "app.js"]