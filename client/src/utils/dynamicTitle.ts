// Função para carregar e aplicar o título dinâmico do sistema
export async function loadDynamicTitle() {
  try {
    const response = await fetch('/api/system/settings/site_title');
    if (response.ok) {
      const setting = await response.json();
      if (setting && setting.value) {
        document.title = setting.value;
      }
    }
  } catch (error) {
    console.warn('Could not load dynamic title from system settings:', error);
    // Mantém o título padrão se houver erro
  }
}

// Aplicar automaticamente quando o script é carregado
if (typeof window !== 'undefined') {
  // Aguardar o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicTitle);
  } else {
    loadDynamicTitle();
  }
}