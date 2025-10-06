### Builder stage: install deps and build the Astro site
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests and lockfile first for better caching
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Install dependencies (prebuilt native binaries are available on Debian-based images)
RUN pnpm install --frozen-lockfile

# Copy rest of the source and build
COPY . .
RUN pnpm build


### Production stage: run the built site
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

# Create a non-root user
RUN useradd -m -u 10001 app

# Copy minimal runtime files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Copy the sqlite DB path parent (if any migrations or seeds exist you can add them)
# Ensure the sqlite file exists so better-auth can open it
RUN mkdir -p /app && touch /app/sqlite.db && chown app:app /app/sqlite.db

USER app

ENV NODE_ENV=production
EXPOSE 3000

# Start the Astro built server. Adjust if you use a different start command.
CMD ["node", "./dist/server/entry.mjs"]
