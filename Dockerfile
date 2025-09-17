FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm install

# Copiar código fonte
COPY . .

# Build da aplicação (agora tem acesso às dev dependencies)
RUN npm run build

# Limpar dev dependencies após build (economia de espaço)
RUN npm prune --omit=dev

# Expor porta
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]