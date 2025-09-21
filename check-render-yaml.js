import { getUncachableGitHubClient } from './github-client.js';

async function checkRenderYaml() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Verificando render.yaml no GitHub...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    try {
      const { data: file } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: 'render.yaml',
        branch: 'main'
      });
      
      const content = Buffer.from(file.content, 'base64').toString('utf8');
      console.log('📄 Conteúdo do render.yaml no GitHub:');
      console.log(content);
      
      // Verificar se tem buildCommand
      if (content.includes('buildCommand')) {
        console.log('❌ PROBLEMA: Ainda tem buildCommand no GitHub!');
        return false;
      } else if (content.includes('env: docker')) {
        console.log('✅ GitHub está correto - env: docker, sem buildCommand');
        return true;
      } else {
        console.log('❌ PROBLEMA: Configuração incorreta no GitHub');
        return false;
      }
    } catch (e) {
      console.log('❌ Erro ao buscar render.yaml:', e.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

checkRenderYaml().catch(console.error);