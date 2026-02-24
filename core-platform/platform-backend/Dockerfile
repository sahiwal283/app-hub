FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ARG APP_VERSION
ARG APP_BUILD
ARG APP_COMMIT
ENV APP_VERSION=${APP_VERSION}
ENV APP_BUILD=${APP_BUILD}
ENV APP_COMMIT=${APP_COMMIT}

RUN apk add --no-cache openssl

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
