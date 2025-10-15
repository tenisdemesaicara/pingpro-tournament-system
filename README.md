# 🏓 PingPong Pro - Tournament Management System

Sistema completo de gerenciamento de torneios de tênis de mesa com páginas públicas, módulo financeiro robusto, e sistema de deploy autônomo.

## 🚀 Deploy Automático

Este projeto utiliza um sistema de deploy autônomo via GitHub + Render.

### Para Fazer Deploy

```bash
npm run deploy
```

Aguarde 3-5 minutos para rebuild automático no Render.

### Documentação de Deploy

📚 **Guias Disponíveis:**

1. **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)** - Manual técnico completo
   - Arquitetura do sistema
   - Explicação detalhada do código
   - Troubleshooting avançado
   - Para: Agentes Replit e desenvolvedores

2. **[QUICK-DEPLOY-SETUP.md](./QUICK-DEPLOY-SETUP.md)** - Guia rápido
   - Setup passo a passo
   - Comandos prontos
   - Checklist de validação
   - Para: Configuração inicial

3. **[COMO-REPLICAR.md](./COMO-REPLICAR.md)** - Resumo executivo
   - Instruções em português
   - Fluxo visual completo
   - Para: Usuários e replicação em outros apps

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Deploy:** GitHub + Render (autônomo)
- **Versionamento:** GitHub

## 📦 Instalação Local

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm start
```

## 🔧 Variáveis de Ambiente

```bash
# .env
DATABASE_URL=postgresql://...
SESSION_SECRET=seu-secret-aqui
NODE_ENV=development
GITHUB_TOKEN=ghp_xxx  # Para deploy
```

## 📊 Funcionalidades

### Módulo de Torneios
- ✅ Múltiplos formatos (Eliminação, Round Robin, Suíço)
- ✅ Gestão de chaves e partidas
- ✅ Páginas públicas com brackets
- ✅ Sistema de classificação em tempo real

### Módulo Financeiro
- ✅ Gestão de cobranças e pagamentos
- ✅ Relatórios em PDF
- ✅ Dashboard com status em tempo real
- ✅ Cálculo automático de vencidos

### Módulo de Atletas
- ✅ Cadastro com fotos
- ✅ Categorias por idade e técnica
- ✅ Gestão de associados
- ✅ Endpoint otimizado para seletores

### Performance
- ✅ Endpoint `/api/athletes/minimal` (90% menor)
- ✅ Loading states inteligentes
- ✅ Cálculo de status em tempo real

## 🚀 Deploy em Produção

O sistema está configurado para deploy automático:

1. **Desenvolvimento:** Editar código no Replit
2. **Deploy:** `npm run deploy` (30 segundos)
3. **GitHub:** Recebe código automaticamente
4. **Render:** Rebuild automático (3-5 min)
5. **Produção:** App atualizado ✅

### Primeira Vez

Consulte [QUICK-DEPLOY-SETUP.md](./QUICK-DEPLOY-SETUP.md) para configuração inicial.

## 🔄 Replicar em Outros Projetos

Este sistema de deploy pode ser replicado em qualquer projeto Replit:

```bash
# 1. Copiar smart-deploy.js
# 2. Adaptar variáveis (GITHUB_OWNER, GITHUB_REPO)
# 3. Configurar GitHub Token
# 4. Configurar Render
# 5. npm run deploy
```

Consulte [COMO-REPLICAR.md](./COMO-REPLICAR.md) para instruções completas.

## 📝 Estrutura do Projeto

```
pingpong-pro/
├── client/              # Frontend React
│   ├── src/
│   │   ├── pages/      # Páginas da aplicação
│   │   ├── components/ # Componentes reutilizáveis
│   │   └── lib/        # Utilitários
├── server/             # Backend Express
│   ├── routes.ts       # Rotas da API
│   ├── storage.ts      # Interface de dados
│   └── index.ts        # Servidor principal
├── shared/             # Código compartilhado
│   └── schema.ts       # Schemas Drizzle
├── smart-deploy.js     # Script de deploy
└── docs/               # Documentação
```

## 🐛 Troubleshooting

### Deploy não funciona
```bash
# Verificar token
echo $GITHUB_TOKEN

# Forçar mudança
touch README.md
npm run deploy
```

### Render não rebuilda
```bash
# Render Dashboard → Settings
# Auto-Deploy: Yes
# Branch: main
```

### Consulte a documentação completa em [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

## 📄 Licença

Desenvolvido para gestão de torneios de tênis de mesa.

## 🤝 Contato

Para replicar este sistema em outros apps, consulte a documentação de deploy.

---

**Status:** ✅ Em produção - Deploy autônomo ativo
**Última atualização:** Outubro 2025
