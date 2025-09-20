FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (com dev dependencies disponíveis)
RUN npm run build

# Build do servidor de produção (SEM VITE)
RUN npx esbuild server/prod.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --outbase=server

# Limpar dev dependencies após o build
RUN npm prune --production

# Expor porta
EXPOSE 5000

# Comando de inicialização (com migrations programáticas)
CMD ["node", "dist/prod.js"]