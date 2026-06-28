# ─── Stage 1: Build ───────────────────────────────────────────────────────────
# Installs all dependencies (including devDependencies) and compiles TypeScript.
# Node version pinned to match .nvmrc (22.21.1) for reproducible builds.
FROM node:22.21.1-alpine AS builder

RUN apk add --no-cache bash

WORKDIR /build

# Copy package files first — layer is cached unless package.json changes
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile
COPY . .

# NestJS requires a .env file to exist at startup for config validation.
# An empty file satisfies the requirement; real values are injected at runtime.
RUN echo "" > .env

RUN npm run build

# ─── Stage 2: Production runtime ──────────────────────────────────────────────
# Uses only production dependencies — no TypeScript compiler, no NestJS CLI.
# Results in a significantly smaller image than the builder stage.
FROM node:22.21.1-alpine AS runner

RUN apk add --no-cache bash

WORKDIR /usr/src/app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy the compiled output from the builder stage
COPY --from=builder /build/dist ./dist

# Copy i18n locale files required by NestJS at runtime
COPY --from=builder /build/src/i18n ./src/i18n

# Copy wait-for-it.sh — used to wait for DB readiness in docker-compose healthchecks
COPY wait-for-it.sh /opt/wait-for-it.sh
RUN chmod +x /opt/wait-for-it.sh \
 && sed -i 's/\r//' /opt/wait-for-it.sh

# Security: run as a non-root system user
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
USER nestjs

EXPOSE 3000

# Run the compiled main.js directly — no ts-node, no NestJS CLI in production
CMD ["node", "dist/main"]
