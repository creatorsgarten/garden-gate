FROM node:18-alpine AS deps-prod
WORKDIR /app

COPY package.json *pnpm-lock.yaml ./
RUN npx pnpm -r i --frozen-lockfile --prod

# ? -------------------------

FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json *pnpm-lock.yaml ./
RUN npx pnpm -r i --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src

RUN npx pnpm build

# ? -------------------------

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV production
CMD ["dist/index.js"]

ENV PORT 3000
EXPOSE 3000

ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}