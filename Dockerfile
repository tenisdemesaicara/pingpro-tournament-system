FROM node:18-alpine

WORKDIR /app

# Copiar package files primeiro
COPY package*.json ./

# Instalar dependências
RUN npm install --omit=dev

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta padrão do Render
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]