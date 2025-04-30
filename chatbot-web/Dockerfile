FROM node:20-alpine as builder

WORKDIR /app

RUN npm install -g pnpm

ARG BUILD_MODE=production

COPY package.json pnpm-lock.yaml ./

RUN pnpm install 

COPY public ./public
COPY src ./src
COPY index.html ./index.html
COPY vite.config.ts ./vite.config.ts
COPY tailwind.config.ts ./tailwind.config.ts
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.node.json ./tsconfig.node.json
COPY tsconfig.app.json ./tsconfig.app.json
RUN mkdir -p /app/dist

EXPOSE 3000
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]

# RUN pnpm build

# FROM nginx:alpine as production
# COPY --from=builder /app/dist /usr/share/nginx/html 
# COPY conf/nginx.conf /etc/nginx/conf.d/default.conf
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]

