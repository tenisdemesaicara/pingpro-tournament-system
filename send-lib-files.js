import { getUncachableGitHubClient } from './github-client.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

async function sendLibFiles() {
  try {
    const octokit = await getUncachableGitHubClient();
    const user = await octokit.rest.users.getAuthenticated();
    
    console.log('🔍 Verificando arquivos lib/ faltando...');
    
    const owner = user.data.login;
    const repo = 'pingpro-tournament-system';
    
    // Verificar diretório lib
    const libPath = 'client/src/lib';
    if (existsSync(libPath)) {
      const libFiles = readdirSync(libPath);
      console.log('📁 Arquivos lib/ locais:', libFiles);
      
      for (const fileName of libFiles) {
        const filePath = join(libPath, fileName);
        if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
          try {
            const content = readFileSync(filePath, 'utf8');
            const githubPath = `client/src/lib/${fileName}`;
            
            console.log(`📤 Enviando ${githubPath}...`);
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: githubPath,
              message: `Add ${githubPath} - required for build`,
              content: Buffer.from(content).toString('base64'),
              branch: 'main'
            });
            
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) {
            console.log(`⚠️ Erro ${fileName}: ${e.message}`);
          }
        }
      }
    }
    
    // Verificar outros arquivos importantes
    const importantFiles = [
      'client/src/components/ui/form.tsx',
      'client/src/hooks/use-toast.ts',
      'client/src/components/ui/toast.tsx',
      'client/src/components/ui/toaster.tsx'
    ];
    
    for (const filePath of importantFiles) {
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8');
          console.log(`📤 Enviando ${filePath}...`);
          
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: `Add ${filePath} - required for build`,
            content: Buffer.from(content).toString('base64'),
            branch: 'main'
          });
          
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          console.log(`⚠️ ${filePath}: ${e.message}`);
        }
      }
    }
    
    console.log('✅ Arquivos lib/ enviados!');
    console.log('🚀 Faça novo deploy no Render!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

sendLibFiles().catch(console.error);