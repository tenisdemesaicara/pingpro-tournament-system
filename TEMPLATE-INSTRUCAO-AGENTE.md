# 📋 Template de Instrução para Agente Replit

> **Copie e cole este texto no chat de qualquer projeto Replit para configurar deploy autônomo**

---

## 🤖 INSTRUÇÃO PARA O AGENTE

```
Configure sistema de deploy autônomo neste projeto usando a metodologia do PingPong Pro.

REFERÊNCIAS:
- Projeto base: PingPong Pro (Replit)
- Documentação: DEPLOYMENT-GUIDE.md
- Guia rápido: QUICK-DEPLOY-SETUP.md

TAREFAS:

1. COPIAR ARQUIVOS DO PINGPONG PRO:
   - smart-deploy.js (arquivo completo)
   - .gitignore (adaptar se já existir)
   
2. ADAPTAR smart-deploy.js:
   const GITHUB_OWNER = '[MEU_USUARIO_GITHUB]';
   const GITHUB_REPO = '[NOME_DESTE_REPO]';
   const GITHUB_BRANCH = 'main';

3. INSTALAR DEPENDÊNCIA:
   npm install @octokit/rest

4. ATUALIZAR package.json:
   Adicionar scripts:
   {
     "deploy": "node smart-deploy.js",
     "build": "vite build",
     "start": "NODE_ENV=production tsx server/index.ts"
   }

5. VERIFICAR .gitignore:
   Deve incluir:
   - node_modules/
   - .env
   - .env.local
   - .env.production
   - dist/
   - *.log
   - .replit
   - replit.nix

6. CRIAR DOCUMENTAÇÃO:
   Criar README.md explicando:
   - Como fazer deploy: npm run deploy
   - Variáveis de ambiente necessárias
   - Tempo de deploy: 3-5 minutos

7. TESTAR PRIMEIRO DEPLOY:
   node smart-deploy.js
   
8. VALIDAR:
   - Script executa sem erros
   - Arquivos aparecem no GitHub
   - Logs mostram "Deploy completo!"

IMPORTANTE:
- Use mesma lógica e princípios do PingPong Pro
- Consulte DEPLOYMENT-GUIDE.md para detalhes técnicos
- Mantenha mesma estrutura de logging (emojis + timestamps)
- Preserve detecção inteligente de mudanças (SHA comparison)
- Deploy em batches de 100 arquivos
```

---

## 📝 VARIÁVEIS A PREENCHER

Antes de colar, substitua:

```
[MEU_USUARIO_GITHUB] → seu nome de usuário GitHub
[NOME_DESTE_REPO] → nome do repositório que você criou
```

**Exemplo:**
```javascript
const GITHUB_OWNER = 'joaosilva';
const GITHUB_REPO = 'meu-novo-app';
```

---

## ✅ CHECKLIST PRÉ-DEPLOY

Antes de colar a instrução, prepare:

- [ ] Repositório criado no GitHub
- [ ] Token GitHub gerado (Settings → Tokens)
- [ ] Secret GITHUB_TOKEN configurado no Replit
- [ ] Render account criado (render.com)

---

## 🚀 APÓS CONFIGURAÇÃO

O agente vai criar:
- ✅ smart-deploy.js configurado
- ✅ .gitignore adequado
- ✅ Scripts no package.json
- ✅ README com instruções

Você deve:
1. Configurar Render (uma vez)
2. Usar `npm run deploy` (sempre)

---

## 🔧 CONFIGURAÇÃO RENDER (MANUAL)

Após o agente configurar o Replit:

1. **Criar Web Service**
   - render.com → New → Web Service
   - Connect GitHub repository
   
2. **Configurar Build**
   ```
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Auto-Deploy**
   ```
   Auto-Deploy: Yes
   Branch: main
   ```

4. **Variáveis de Ambiente**
   ```
   DATABASE_URL=...
   SESSION_SECRET=...
   NODE_ENV=production
   ```

---

## 📊 RESULTADO FINAL

```
DESENVOLVIMENTO (Replit)
   ↓
npm run deploy (30seg)
   ↓
GITHUB (automático)
   ↓
RENDER rebuild (3-5min)
   ↓
PRODUÇÃO ATUALIZADA ✅
```

---

## 🎯 VERSÃO MINIMALISTA

Se quiser instrução mais curta:

```
Configure deploy autônomo:

1. Copie smart-deploy.js do PingPong Pro
2. Adapte: GITHUB_OWNER='usuario', GITHUB_REPO='repo'
3. npm install @octokit/rest
4. Adicione script "deploy": "node smart-deploy.js"
5. Teste: node smart-deploy.js

Consulte DEPLOYMENT-GUIDE.md do PingPong Pro.
```

---

*Template criado para replicação rápida em qualquer projeto Replit*
