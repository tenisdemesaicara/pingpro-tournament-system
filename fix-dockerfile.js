import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync } from 'fs';

async function fixDockerfile() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Corrigindo Dockerfile...');
    
    // Dockerfile corrigido - usar npm install em vez de npm ci
    const dockerfileContent = `FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências (usar npm install em vez de npm ci)
RUN npm install --only=production

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]`;

    const contentEncoded = Buffer.from(dockerfileContent).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      path: 'Dockerfile',
      message: 'Fix Dockerfile - use npm install instead of npm ci',
      content: contentEncoded,
      branch: 'main'
    });
    
    console.log('✅ Dockerfile corrigido!');
    
    // Também vamos enviar o package-lock.json se existir
    try {
      const packageLock = readFileSync('package-lock.json', 'utf8');
      const packageLockEncoded = Buffer.from(packageLock).toString('base64');
      
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: user.data.login,
        repo: 'pingpro-tournament-system',
        path: 'package-lock.json',
        message: 'Add package-lock.json for npm ci',
        content: packageLockEncoded,
        branch: 'main'
      });
      
      console.log('✅ package-lock.json enviado!');
    } catch (e) {
      console.log('ℹ️ package-lock.json não encontrado, usando npm install');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

fixDockerfile().catch(console.error);