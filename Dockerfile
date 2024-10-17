# Build Stage 1
FROM node:23-bullseye-slim AS BASEIMAGE

WORKDIR /src

ENV PUPPETEER_CACHE_DIR=/tmp/browser

# Copy package.json and package-lock.json for reproducible builds
COPY package.json ./
# Install dependencies
RUN npm install --omit=dev

COPY . .

# Build Stage 2
FROM node:23-bullseye-slim

# Copy only requirements to leverage Docker cache
COPY --chown=node:node requirements.apt /tmp/requirements.apt

# Install required packages
RUN apt-get update \
    && sed 's/#.*//' /tmp/requirements.apt | xargs apt-get install -y --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /tmp/requirements.apt

# Create and set permissions for the application directory
RUN mkdir -p /home/node/app \
    && chown -R node:node /home/node/app

WORKDIR /home/node/app

# Environment variables
ENV PUPPETEER_CACHE_DIR=/home/node/app/browser
ENV PUPPETEER_DOWNLOAD_PATH=/home/node/app/browser

# Copy necessary files
COPY                  --chown=node:node index.js          ./
COPY --from=BASEIMAGE --chown=node:node /src/node_modules ./node_modules
COPY --from=BASEIMAGE --chown=node:node /tmp/browser      ./browser

USER node

# Start the application
CMD ["node", "index.js"]