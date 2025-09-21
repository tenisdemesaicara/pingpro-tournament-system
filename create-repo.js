import { getUncachableGitHubClient } from './github-client.js';

async function createRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    // Criar repositório
    const repo = await octokit.rest.repos.createForAuthenticatedUser({
      name: 'pingpro-tournament-system',
      description: 'Sistema completo de gerenciamento de torneios de tênis de mesa',
      private: false, // público para facilitar
      auto_init: false
    });
    
    console.log('✅ Repositório criado:', repo.data.html_url);
    console.log('📋 Clone URL:', repo.data.clone_url);
    return repo.data;
  } catch (error) {
    if (error.status === 422) {
      console.log('⚠️ Repositório já existe, buscando informações...');
      const octokit = await getUncachableGitHubClient();
      const user = await octokit.rest.users.getAuthenticated();
      const existingRepo = await octokit.rest.repos.get({
        owner: user.data.login,
        repo: 'pingpro-tournament-system'
      });
      console.log('✅ Repositório encontrado:', existingRepo.data.html_url);
      console.log('📋 Clone URL:', existingRepo.data.clone_url);
      return existingRepo.data;
    }
    throw error;
  }
}

createRepository().catch(console.error);