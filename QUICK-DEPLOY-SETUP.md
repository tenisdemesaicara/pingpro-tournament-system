# 🚀 Quick Setup - Deploy Autônomo (GitHub + Render)

> **Guia Rápido para Replicar em Outros Projetos**
> 
> Use este documento para instruir o Replit Agent a configurar deploy autônomo em qualquer projeto.

---

## 📋 Instruções para o Agente Replit

**Cole isso no chat do agente:**

```
Preciso configurar deploy autônomo neste projeto usando o mesmo sistema do PingPong Pro.

Consulte o arquivo DEPLOYMENT-GUIDE.md do projeto PingPong Pro para detalhes técnicos completos.

Execute estas etapas:

1. COPIAR ARQUIVOS BASE:
   - Copiar smart-deploy.js do PingPong Pro
   - Copiar .gitignore (ou adaptar o existente)
   - Adicionar script "deploy" no package.json

2. ADAPTAR CONFIGURAÇÕES:
   - No smart-deploy.js, atualizar:
     * GITHUB_OWNER = 'meu-usuario'
     * GITHUB_REPO = 'nome-deste-repo'
     * GITHUB_BRANCH = 'main'

3. INSTALAR DEPENDÊNCIA:
   - npm install @octokit/rest

4. VERIFICAR .gitignore:
   - Deve incluir: node_modules/, .env, dist/, *.log
   - Nunca commitar secrets ou arquivos de desenvolvimento

5. TESTAR PRIMEIRO DEPLOY:
   - node smart-deploy.js
   - Verificar se arquivos aparecem no GitHub

6. DOCUMENTAR NO README:
   - Como fazer deploy: npm run deploy
   - Variáveis de ambiente necessárias
   - Processo de configuração do Render

IMPORTANTE: Use os mesmos princípios e lógica do PingPong Pro.
```

---

## 🔧 Configuração Manual (Para Você)

### 1. GitHub - Criar Repository

```bash
# 1. Acesse: https://github.com/new
# 2. Nome do repositório: nome-do-projeto
# 3. Privado ou Público
# 4. NÃO inicializar com README (já existe no projeto)
# 5. Create repository
```

### 2. GitHub - Criar Token

```bash
# 1. Acesse: https://github.com/settings/tokens
# 2. Generate new token (classic)
# 3. Nome: "Replit Deploy - Nome do Projeto"
# 4. Expiration: No expiration
# 5. Scopes: ✅ repo (marcar todas)
# 6. Generate token
# 7. COPIAR O TOKEN (ghp_xxxxxxxxxxxxx)
```

### 3. Replit - Adicionar Secret

```bash
# 1. No projeto Replit: Tools → Secrets
# 2. Add new secret
# 3. Key: GITHUB_TOKEN
# 4. Value: colar o token (ghp_xxxxx)
# 5. Add secret
```

### 4. Render - Criar Web Service

```bash
# 1. Acesse: https://render.com
# 2. New → Web Service
# 3. Connect GitHub account (se primeira vez)
# 4. Selecionar o repositório
# 5. Configurar:

   Name: nome-do-projeto
   
   Environment: Node
   
   Build Command: npm install && npm run build
   
   Start Command: npm start
   
   Auto-Deploy: Yes
   
   Branch: main

# 6. Create Web Service
```

### 5. Render - Configurar Variáveis

```bash
# No Render Dashboard do projeto:
# Environment → Add Environment Variable

DATABASE_URL=postgresql://usuario:senha@host/database
SESSION_SECRET=seu-secret-aleatório-aqui
NODE_ENV=production

# Adicionar todas as variáveis que o app precisa
# (consultar .env.example do projeto)
```

---

## ✅ Verificação Pós-Configuração

### Checklist Completo

- [ ] **GitHub Token**
  ```bash
  # No Replit, verificar:
  echo $GITHUB_TOKEN
  # Deve retornar: ghp_xxxxx...
  ```

- [ ] **Primeiro Deploy**
  ```bash
  # No Replit Shell:
  node smart-deploy.js
  
  # Deve mostrar:
  # ✅ Deploy completo! X arquivos deployados
  ```

- [ ] **Arquivos no GitHub**
  ```bash
  # Acessar: https://github.com/usuario/repo
  # Verificar se os arquivos aparecem
  ```

- [ ] **Build no Render**
  ```bash
  # Render Dashboard → Events
  # Deve mostrar: "Deploy started" e depois "Deploy succeeded"
  ```

- [ ] **App Online**
  ```bash
  # Render Dashboard → link do app
  # Clicar e verificar se app abre
  ```

---

## 🔄 Uso Diário

### Fazer Deploy

```bash
# Opção 1: Via script npm
npm run deploy

# Opção 2: Via Node direto
node smart-deploy.js

# Opção 3: Via agente Replit
"Faça deploy das alterações"
```

### O que Acontece

```
1. Script detecta mudanças (30seg)
2. Envia para GitHub (30seg)  
3. Render detecta commit (1min)
4. Rebuild automático (2-4min)
5. App atualizado! ✅

Total: ~3-5 minutos
```

### Verificar Deploy

```bash
# 1. Ver no GitHub
https://github.com/usuario/repo/commits/main

# 2. Ver no Render
Render Dashboard → Events → últimos deploys

# 3. Ver app funcionando
https://seu-app.onrender.com
```

---

## 🐛 Troubleshooting Rápido

### Erro: "GITHUB_TOKEN not found"

```bash
# Replit: Tools → Secrets → Verificar se existe
# Se não: Adicionar GITHUB_TOKEN com valor ghp_xxx
# Reiniciar shell: exit e abrir novo terminal
```

### Erro: "No changes detected"

```bash
# Forçar mudança:
touch README.md
node smart-deploy.js
```

### Erro: "Render não fez rebuild"

```bash
# 1. Render → Settings → Build & Deploy
# 2. Verificar: Auto-Deploy = Yes
# 3. Verificar: Branch = main
# 4. Manual deploy: Deploy latest commit
```

### Erro: "Build failed"

```bash
# 1. Verificar package.json completo no GitHub
# 2. Render → Logs → Build Logs (ver erro)
# 3. Testar build local: npm run build
```

---

## 📁 Arquivos Necessários

```
projeto/
├── smart-deploy.js          # ← Copiar do PingPong Pro
├── .gitignore              # ← Adaptar ou copiar
├── package.json            # ← Adicionar "deploy" script
├── README.md              # ← Documentar processo
└── [resto do código]
```

---

## 🎯 Template de Instrução para Outros Projetos

**Cole isso no chat:**

```
Configure deploy autônomo neste projeto:

1. Copie smart-deploy.js do projeto PingPong Pro
2. Adapte GITHUB_OWNER e GITHUB_REPO
3. Adicione script "deploy": "node smart-deploy.js" no package.json
4. Verifique .gitignore (node_modules/, .env, dist/)
5. Instale @octokit/rest
6. Teste: node smart-deploy.js

Consulte DEPLOYMENT-GUIDE.md do PingPong Pro para detalhes.
```

---

## 📊 Resumo de Endpoints/URLs

```bash
# GITHUB
Repository: https://github.com/USUARIO/REPO
Commits: https://github.com/USUARIO/REPO/commits/main
Token: https://github.com/settings/tokens

# RENDER
Dashboard: https://dashboard.render.com
Logs: https://dashboard.render.com/web/[service-id]/logs
App: https://[nome-app].onrender.com
```

---

## 🔑 Variáveis de Ambiente Comuns

```bash
# Sempre necessárias:
NODE_ENV=production

# Se usar banco de dados:
DATABASE_URL=postgresql://...

# Se usar sessões:
SESSION_SECRET=string-aleatória-segura

# Se usar autenticação:
JWT_SECRET=outro-secret-aleatório

# Projeto específico:
# (consultar .env.example)
```

---

## ⚡ Comandos Úteis

```bash
# Ver status do deploy
node smart-deploy.js 2>&1 | head -20

# Ver último commit no GitHub
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/usuario/repo/commits/main

# Forçar rebuild no Render (se tiver API key)
curl -X POST https://api.render.com/deploy/[service-id] \
  -H "Authorization: Bearer $RENDER_API_KEY"

# Ver logs do build
# Render Dashboard → Logs → Build
```

---

## 📚 Links de Referência

- **Manual Completo:** `DEPLOYMENT-GUIDE.md`
- **GitHub API:** https://docs.github.com/en/rest
- **Render Docs:** https://render.com/docs
- **Projeto Base:** PingPong Pro (Replit)

---

## 🎓 Conclusão

Com este setup:
- ✅ Deploy em 30 segundos
- ✅ App funciona sem Replit
- ✅ Atualizações automáticas
- ✅ Hospedagem profissional
- ✅ Fácil de replicar

**Um comando = Deploy completo!** 🚀

```bash
npm run deploy
```

---

*Use este guia para qualquer projeto Node.js + React no Replit*
*Desenvolvido e testado no: PingPong Pro Tournament System*
