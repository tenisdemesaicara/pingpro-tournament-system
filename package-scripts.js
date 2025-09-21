import { readFileSync, writeFileSync } from 'fs';

// Adiciona script de auto-deploy ao package.json
try {
  const packagePath = './package.json';
  const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'));
  
  // Adiciona o script de auto-deploy
  packageContent.scripts = {
    ...packageContent.scripts,
    "auto-deploy": "node auto-deploy.js",
    "start-auto": "npm run dev & npm run auto-deploy"
  };
  
  writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
  console.log('✓ Scripts de auto-deploy adicionados ao package.json');
  
} catch (error) {
  console.error('❌ Erro ao atualizar package.json:', error.message);
}