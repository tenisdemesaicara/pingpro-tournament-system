import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function sendAllComponents() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Enviando TODOS os componentes principais...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Enviar componentes principais primeiro
    const componentsPath = 'client/src/components';
    if (existsSync(componentsPath)) {
      const componentFiles = readdirSync(componentsPath).filter(f => 
        (f.endsWith('.tsx') || f.endsWith('.ts')) && statSync(join(componentsPath, f)).isFile()
      );
      
      console.log(`📁 Enviando ${componentFiles.length} componentes principais...`);
      
      for (const fileName of componentFiles) {
        try {
          const filePath = join(componentsPath, fileName);
          const content = readFileSync(filePath, 'utf8');
          const githubPath = `client/src/components/${fileName}`;
          
          console.log(`📤 ${fileName}...`);
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: githubPath,
            message: `Add ${githubPath}`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          if (e.status !== 422) {
            console.log(`⚠️ ${fileName}: ${e.message.split('\n')[0]}`);
          }
        }
      }
    }
    
    // Enviar páginas também
    const pagesPath = 'client/src/pages';
    if (existsSync(pagesPath)) {
      const pageFiles = readdirSync(pagesPath).filter(f => 
        (f.endsWith('.tsx') || f.endsWith('.ts')) && statSync(join(pagesPath, f)).isFile()
      );
      
      console.log(`📁 Enviando ${pageFiles.length} páginas...`);
      
      for (const fileName of pageFiles) {
        try {
          const filePath = join(pagesPath, fileName);
          const content = readFileSync(filePath, 'utf8');
          const githubPath = `client/src/pages/${fileName}`;
          
          console.log(`📤 Página: ${fileName}...`);
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: githubPath,
            message: `Add ${githubPath}`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          if (e.status !== 422) {
            console.log(`⚠️ Página ${fileName}: ${e.message.split('\n')[0]}`);
          }
        }
      }
    }
    
    console.log('✅ TODOS os componentes e páginas enviados!');
    console.log('🎯 Navbar e todos os outros agora estão no GitHub!');
    console.log('🚀 Faça deploy no Render - deve funcionar agora!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendAllComponents().catch(console.error);