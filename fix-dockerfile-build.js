import { getUncachableGitHubClient } from './github-client.js';

async function fixDockerfileBuild() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔧 Corrigindo Dockerfile para build correto...');
    
    // Buscar SHA do Dockerfile atual
    const currentDockerfile = await octokit.rest.repos.getContent({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      path: 'Dockerfile',
      branch: 'main'
    });
    
    // Dockerfile corrigido - instalar TODAS as dependências para build
    const dockerfileContent = `FROM node:18-alpine

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
CMD ["npm", "start"]`;

    const dockerfileEncoded = Buffer.from(dockerfileContent).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      path: 'Dockerfile',
      message: 'Fix Dockerfile - install all deps for build then prune',
      content: dockerfileEncoded,
      sha: currentDockerfile.data.sha,
      branch: 'main'
    });
    
    console.log('✅ Dockerfile corrigido!');
    console.log('📝 Agora instala todas as deps → faz build → remove dev deps');
    console.log('🚀 Trigger novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

fixDockerfileBuild().catch(console.error);