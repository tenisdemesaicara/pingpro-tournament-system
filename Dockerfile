FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (agora tem acesso às dev dependencies)
RUN npm run build

# Limpar dev dependencies para economizar espaço
RUN npm prune --production

# Expor porta
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]