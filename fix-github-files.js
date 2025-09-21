import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function fixGitHubFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    console.log('🔧 Corrigindo arquivos no GitHub...');
    
    // 1. Primeiro, enviar package-lock.json
    console.log('📤 Enviando package-lock.json...');
    try {
      const packageLock = readFileSync('package-lock.json', 'utf8');
      const packageLockEncoded = Buffer.from(packageLock).toString('base64');
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'package-lock.json',
        message: 'Add package-lock.json for proper npm install',
        content: packageLockEncoded,
        branch: 'main'
      });
      
      console.log('✅ package-lock.json enviado!');
    } catch (e) {
      console.log('⚠️ Erro no package-lock.json:', e.message);
    }
    
    // 2. Buscar SHA do Dockerfile atual
    console.log('🔍 Buscando Dockerfile atual...');
    let dockerfileSha = null;
    try {
      const currentDockerfile = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'Dockerfile',
        branch: 'main'
      });
      dockerfileSha = currentDockerfile.data.sha;
      console.log('✅ SHA encontrado:', dockerfileSha);
    } catch (e) {
      console.log('ℹ️ Dockerfile não existe, criando novo');
    }
    
    // 3. Dockerfile corrigido
    const dockerfileContent = `FROM node:18-alpine

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
CMD ["npm", "start"]`;

    const dockerfileEncoded = Buffer.from(dockerfileContent).toString('base64');
    
    const dockerfileParams = {
      owner,
      repo,
      path: 'Dockerfile',
      message: 'Fix Dockerfile - add package-lock.json support',
      content: dockerfileEncoded,
      branch: 'main'
    };
    
    if (dockerfileSha) {
      dockerfileParams.sha = dockerfileSha;
    }
    
    await octokit.rest.repos.createOrUpdateFileContents(dockerfileParams);
    
    console.log('✅ Dockerfile corrigido!');
    console.log('🚀 Arquivos atualizados no GitHub!');
    console.log('🔄 O Render vai fazer redeploy automaticamente');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

fixGitHubFiles().catch(console.error);