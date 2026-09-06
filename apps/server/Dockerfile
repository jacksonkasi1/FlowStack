FROM oven/bun:1.3.14 AS build
WORKDIR /app

# Copy root workspace config
COPY package.json bun.lock turbo.json ./

# Copy packages and app source
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN bun install --frozen-lockfile

# Build the server
WORKDIR /app/apps/server
RUN bun run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/server/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
