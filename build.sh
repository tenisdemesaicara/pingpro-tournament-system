#!/bin/bash
# Build script para Render

# Instalar dependências
npm install

# Build do frontend
npm run build

# Configurar PostgreSQL (se necessário)
npm run db:push --force

echo "Build concluído!"