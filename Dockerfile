# ----- Build Stage -----
FROM node:25-bookworm-slim AS build

# Environment variables
ENV PUPPETEER_CACHE_DIR=/home/node/browser
ENV PUPPETEER_DOWNLOAD_PATH=/home/node/browser

WORKDIR /home/node

# Copy package and OS requirements to leverage Docker cache
COPY --chown=node:node package.json ./

# Install npm dependencies
USER node
RUN npm install --omit=dev

# ----- Production Stage -----
FROM node:25-bookworm-slim

WORKDIR /home/node

# Environment variables
ENV PUPPETEER_CACHE_DIR=/home/node/browser
ENV PUPPETEER_DOWNLOAD_PATH=/home/node/browser

# Copy installed node_modules and app only
COPY --chown=node:node requirements.apt     ./
COPY --chown=node:node src                  ./
COPY --from=build /home/node/browser        ./browser
COPY --from=build /home/node/node_modules   ./node_modules

# Install system dependencies
RUN apt-get update \
    && sed 's/#.*//' requirements.apt | xargs apt-get install -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* requirements.apt

USER node

# Start the application
CMD [ "node", "index.js" ]