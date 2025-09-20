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

# Limpar dev dependencies após o build
RUN npm prune --production

# Aplicar schema do banco
RUN npm run db:push --force || true

# Expor porta
EXPOSE 5000

# Comando de inicialização
CMD ["npm", "start"]