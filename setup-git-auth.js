import { getUncachableGitHubClient } from './github-client.js';
import { execSync } from 'child_process';

async function setupGitAuth() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log(`✅ GitHub conectado como: ${user.data.login}`);
    
    // Verificar remote atual
    try {
      const remotes = execSync('git remote -v', { encoding: 'utf8' });
      console.log('📋 Remotes atuais:');
      console.log(remotes);
    } catch (e) {
      console.log('ℹ️ Nenhum remote configurado');
    }
    
    // Usar SSH URL que é mais confiável
    const sshUrl = `git@github.com:${user.data.login}/pingpro-tournament-system.git`;
    console.log(`🔑 Configurando SSH URL: ${sshUrl}`);
    
    try {
      // Remover origin atual se existe
      execSync('git remote remove origin', { stdio: 'ignore' });
    } catch (e) {
      // Ignorar se não existe
    }
    
    // Adicionar SSH origin
    execSync(`git remote add origin ${sshUrl}`);
    
    console.log('✅ Remote SSH configurado!');
    console.log('📝 Vamos tentar push novamente...');
    
    return user.data.login;
  } catch (error) {
    console.error('❌ Erro ao configurar git:', error.message);
    return null;
  }
}

setupGitAuth().catch(console.error);