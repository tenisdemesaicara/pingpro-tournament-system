#!/bin/bash
# Start script para Render

# Aplicar schema do banco
npm run db:push --force

# Iniciar servidor
npm start