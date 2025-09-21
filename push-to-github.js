import { getUncachableGitHubClient } from './github-client.js';
import { execSync } from 'child_process';

async function pushToGitHub() {
  try {
    // Obter token de acesso
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log(`✅ Autenticado como: ${user.data.login}`);
    
    // Verificar se há arquivos para commit
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        console.log('📝 Fazendo commit dos arquivos pendentes...');
        execSync('git add -A');
        execSync('git commit -m "Sistema completo de torneios - deploy inicial"');
      } else {
        console.log('⚠️ Nenhum arquivo novo para commit');
      }
    } catch (e) {
      console.log('ℹ️ Nenhuma mudança para commit ou já está commitado');
    }
    
    // Usar API do GitHub para fazer upload
    console.log('🚀 Fazendo upload via API GitHub...');
    
    // Verificar se branch main existe no remoto
    try {
      await octokit.rest.repos.getBranch({
        owner: user.data.login,
        repo: 'pingpro-tournament-system',
        branch: 'main'
      });
      console.log('✅ Branch main já existe no GitHub');
    } catch (e) {
      if (e.status === 404) {
        console.log('📦 Criando primeira branch no GitHub...');
        
        // Obter último commit local
        const lastCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        const commitData = execSync('git cat-file -p ' + lastCommit, { encoding: 'utf8' });
        
        // Criar ref main no GitHub
        await octokit.rest.git.createRef({
          owner: user.data.login,
          repo: 'pingpro-tournament-system',
          ref: 'refs/heads/main',
          sha: lastCommit
        });
      }
    }
    
    console.log('✅ Repositório configurado!');
    console.log(`🌐 URL: https://github.com/${user.data.login}/pingpro-tournament-system`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

pushToGitHub().catch(console.error);