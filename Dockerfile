FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────
FROM node:20-alpine AS backend

WORKDIR /app

# Build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/app.js"]
