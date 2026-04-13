FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@10.17.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY public ./public
COPY src ./src
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY vitest.config.ts ./vitest.config.ts
COPY tailwind.config.ts ./tailwind.config.ts
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.node.json ./tsconfig.node.json
COPY tsconfig.app.json ./tsconfig.app.json

# RUN chmod -R 755 /app

EXPOSE 3000

# Development mode - use pnpm dev for hot reloading
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
