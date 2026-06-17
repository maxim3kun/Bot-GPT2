FROM node:20-slim
RUN apt-get update && apt-get install -y python3 make g++ libopus-dev && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm --filter @workspace/api-server run build
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
