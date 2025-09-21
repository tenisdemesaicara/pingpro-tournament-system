import { getUncachableGitHubClient } from './github-client.js';

async function checkRepository() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    // Verificar se há commits no repositório
    const commits = await octokit.rest.repos.listCommits({
      owner: user.data.login,
      repo: 'pingpro-tournament-system',
      per_page: 5
    });
    
    console.log('✅ Repositório GitHub Status:');
    console.log(`📦 Owner: ${user.data.login}`);
    console.log(`📁 Repo: pingpro-tournament-system`);
    console.log(`📝 Commits encontrados: ${commits.data.length}`);
    
    if (commits.data.length > 0) {
      console.log(`🔄 Último commit: "${commits.data[0].commit.message}"`);
      console.log(`👤 Por: ${commits.data[0].commit.author.name}`);
      console.log(`⏰ Em: ${commits.data[0].commit.author.date}`);
      console.log('\n✅ Push realizado com sucesso!');
      console.log('🚀 Pronto para configurar Render!');
    } else {
      console.log('⚠️ Nenhum commit encontrado. Push pode não ter funcionado.');
    }
    
    return user.data.login;
  } catch (error) {
    console.error('❌ Erro ao verificar repositório:', error.message);
  }
}

checkRepository().catch(console.error);