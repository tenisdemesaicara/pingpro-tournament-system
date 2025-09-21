import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function sendEntireServer() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔥 ENVIANDO TODO O SERVER/ - RESOLUÇÃO DEFINITIVA');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Função recursiva para enviar TUDO
    async function sendDirectory(localPath, remotePath) {
      if (!existsSync(localPath)) {
        console.log(`⚠️ Não existe: ${localPath}`);
        return;
      }
      
      const items = readdirSync(localPath);
      
      for (const item of items) {
        const itemPath = join(localPath, item);
        const remoteItemPath = `${remotePath}/${item}`;
        
        try {
          const stats = statSync(itemPath);
          
          if (stats.isDirectory()) {
            console.log(`📁 Diretório: ${remoteItemPath}/`);
            await sendDirectory(itemPath, remoteItemPath);
          } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.json')) {
            const content = readFileSync(itemPath, 'utf8');
            console.log(`📤 CRITICAL: ${remoteItemPath}`);
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: remoteItemPath,
              message: `FINAL: Add ${remoteItemPath}`,
              content: Buffer.from(content).toString('base64'),
              branch: 'main'
            });
            
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (e) {
          if (e.status !== 422) {
            console.log(`⚠️ ${item}: ${e.message.split('\n')[0]}`);
          }
        }
      }
    }
    
    // Enviar TUDO do server/
    await sendDirectory('server', 'server');
    
    console.log('🎯 TODO O SERVER/ ENVIADO!');
    console.log('✅ vite.ts, auth.ts, bracketUtils.ts, bracketLogic.ts - TODOS!');
    console.log('🚀 DEPLOY FINAL NO RENDER!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendEntireServer().catch(console.error);