import { getUncachableGitHubClient } from './github-client.js';

async function fixDockerfileFinal() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Verificando Dockerfile no GitHub...');
    
    // Buscar Dockerfile atual no GitHub
    const currentDockerfile = await octokit.rest.repos.getContent({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      path: 'Dockerfile',
      branch: 'main'
    });
    
    const currentContent = Buffer.from(currentDockerfile.data.content, 'base64').toString();
    console.log('📋 Dockerfile atual no GitHub:');
    console.log(currentContent);
    
    // Dockerfile CORRETO - instalar TODAS deps, build, depois limpar
    const dockerfileCorrect = `FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar TODAS as dependências (incluindo dev para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação (agora tem acesso às dev dependencies)
RUN npm run build

# Limpar dev dependencies para economizar espaço
RUN npm prune --production

# Expor porta
EXPOSE 10000

# Comando de inicialização
CMD ["npm", "start"]`;

    console.log('🔧 Corrigindo Dockerfile...');
    
    const dockerfileEncoded = Buffer.from(dockerfileCorrect).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      path: 'Dockerfile',
      message: 'Fix Dockerfile - install all deps before build, then prune',
      content: dockerfileEncoded,
      sha: currentDockerfile.data.sha,
      branch: 'main'
    });
    
    console.log('✅ Dockerfile corrigido!');
    console.log('📝 Sequência correta:');
    console.log('  1. npm ci (TODAS deps incluindo dev)');
    console.log('  2. npm run build (tem acesso ao vite/tailwind)');
    console.log('  3. npm prune --production (remove dev deps)');
    console.log('🚀 Agora faça "Clear cache & deploy" no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

fixDockerfileFinal().catch(console.error);