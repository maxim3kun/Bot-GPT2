FROM node:20-slim
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm --filter @workspace/api-server run build
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
