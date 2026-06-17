FROM node:20-slim
RUN apt-get update && apt-get install -y python3 python3-pip make g++ libopus-dev ffmpeg && pip3 install yt-dlp --break-system-packages && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm --filter @workspace/api-server run build
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
