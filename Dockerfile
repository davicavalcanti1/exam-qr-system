FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Variáveis do Vite precisam existir no BUILD (são "assadas" no bundle do frontend).
# No EasyPanel, defina-as no ambiente do serviço (são repassadas como build args).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ─────────────────────────────────────────────
FROM node:22-alpine AS backend

WORKDIR /app

# Build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
# 3001 e a porta em que o nginx do Controle Operacional procura os modulos: a
# regra dele monta o destino como projetos_davi_<slug>:3001. Este app nasceu com
# 3000, antes dessa convencao existir — daqui em diante o container escuta 3001.
# Continua respeitando PORT, entao dev local e outros usos nao mudam.
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/app.js"]
