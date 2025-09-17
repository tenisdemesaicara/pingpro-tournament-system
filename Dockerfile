FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Aplicar schema do banco
RUN npm run db:push --force || true

# Expor porta
EXPOSE 5000

# Comando de inicialização
CMD ["npm", "start"]