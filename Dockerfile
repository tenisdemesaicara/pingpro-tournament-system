FROM node:18-alpine

WORKDIR /app

# Copiar package.json primeiro para cache de dependências  
COPY package*.json ./

# Instalar dependências (incluindo dev para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação  
RUN npm run build

# Remover dependências de desenvolvimento após o build
RUN npm prune --production

# Expor porta
EXPOSE 5000

# Definir variável de ambiente
ENV NODE_ENV=production

# Comando de inicialização
CMD ["npm", "start"]