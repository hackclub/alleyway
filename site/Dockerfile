# Specify target platform
FROM --platform=linux/amd64 node:24-alpine AS base

# Install dependencies needed for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Set working directory
WORKDIR /app

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Copy package files
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Astro site
RUN pnpm run build

# Production stage
FROM --platform=linux/amd64 node:24-alpine AS runner

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Set production environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run database migration and start the application
CMD npx @better-auth/cli migrate && node ./dist/server/entry.mjs