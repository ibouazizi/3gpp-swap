# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies for library and server
COPY swap-protocol/package.json swap-protocol/package-lock.json* ./swap-protocol/
RUN cd swap-protocol && npm ci --omit=dev || npm i --omit=dev

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev

# Copy sources
COPY server.js ./
COPY swap-protocol ./swap-protocol

ENV NODE_ENV=production
ENV PORT=8080
# Optional security config; set at runtime if needed
# ENV SWAP_SECURITY_ENABLED=false
# ENV SWAP_SHARED_SECRET=

EXPOSE 8080
CMD ["node", "server.js"]

