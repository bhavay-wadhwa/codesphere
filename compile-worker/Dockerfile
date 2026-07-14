FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential python3 default-jdk ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install --production || true
COPY . .

EXPOSE 3001
CMD [ "node", "index.js" ]
