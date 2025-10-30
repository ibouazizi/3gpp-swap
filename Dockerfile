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

# Optionally copy TLS certificates from build context using BuildKit (if provided)
# This will not fail if certs/ does not exist in the build context
RUN mkdir -p certs
# syntax requires BuildKit; bind mount certs directory if present
# docker buildx build --build-context certs=./certs .
RUN --mount=type=bind,source=certs,target=/tmp/certs,required=false \
    if [ -d /tmp/certs ]; then cp -r /tmp/certs/* ./certs/ 2>/dev/null || true; fi

ENV NODE_ENV=production
ENV PORT=8080
# TLS / WSS configuration
ENV USE_TLS=false
ENV TLS_CERT_FILE=/app/certs/cert.pem
ENV TLS_KEY_FILE=/app/certs/key.pem
ENV TLS_CA_FILE=
ENV PUBLIC_DOMAIN=localhost
# Optional security config; set at runtime if needed
# ENV SWAP_SECURITY_ENABLED=false
# ENV SWAP_SHARED_SECRET=

EXPOSE 8080
CMD ["node", "server.js"]
