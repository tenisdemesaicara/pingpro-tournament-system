import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { categories } from '../shared/schema';

// Função para garantir que as categorias existam (sem limpar)
export async function ensureCategories() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  try {
    // Verificar se já existem categorias
    const existingCategories = await db.select().from(categories).limit(1);
    
    if (existingCategories.length > 0) {
      console.log('✅ Categorias já existem no banco de dados');
      return { success: true, count: 0, message: 'Categories already exist' };
    }
    
    console.log('🌱 Criando categorias oficiais CBTM...');

    // Categorias organizadas na ordem correta: Feminino → Masculino → Absoluto
    const categoriasData = getCategoriasData();

    // Inserir todas as categorias
    await db.insert(categories).values(categoriasData);
    
    console.log(`✅ ${categoriasData.length} categorias criadas com sucesso!`);
    console.log('📋 Ordem: Feminino → Masculino → Absoluto F → Absoluto M');
    
    return { success: true, count: categoriasData.length };
  } catch (error) {
    console.error('❌ Erro ao criar categorias:', error);
    return { success: false, error };
  }
}

// Script para popular categorias automaticamente (força recriação)
export async function seedCategories() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('🌱 Iniciando seed das categorias...');

  try {
    // Limpar categorias existentes
    await db.delete(categories);
    console.log('✅ Categorias existentes removidas');

    // Categorias organizadas na ordem correta: Feminino → Masculino → Absoluto
    const categoriasData = getCategoriasData();

    // Inserir todas as categorias
    await db.insert(categories).values(categoriasData);
    
    console.log(`✅ ${categoriasData.length} categorias inseridas com sucesso!`);
    console.log('📋 Ordem: Feminino → Masculino → Absoluto F → Absoluto M');
    
    return { success: true, count: categoriasData.length };
  } catch (error) {
    console.error('❌ Erro ao popular categorias:', error);
    return { success: false, error };
  }
}

// Dados das categorias organizados
function getCategoriasData() {
  return [
    // === CATEGORIAS FEMININAS (por idade crescente) ===
      { id: 'e883e39a-8f49-4ef6-bdd6-13212ab917eb', name: 'Sub-11 F', description: 'Categoria Infantil até 11 anos (Feminino)', minAge: 0, maxAge: 11, isActive: true, gender: 'feminino' },
      { id: '4a0dccc9-8a39-40b6-8e9e-65b89c3dd3f7', name: 'Sub-13 F', description: 'Categoria Juvenil até 13 anos (Feminino)', minAge: 0, maxAge: 13, isActive: true, gender: 'feminino' },
      { id: '645da970-cd63-4e33-9395-9546a761d08d', name: 'Sub-15 F', description: 'Categoria Cadete até 15 anos (Feminino)', minAge: 0, maxAge: 15, isActive: true, gender: 'feminino' },
      { id: '48ebb3b8-06c7-4480-9f7a-c4b800ef81f9', name: 'Sub-19 F', description: 'Categoria Junior internacional - até 19 anos (Feminino)', minAge: 0, maxAge: 19, isActive: true, gender: 'feminino' },
      { id: 'cf6e952e-4fdf-420b-a2ad-c88ce3fef530', name: 'Lady 30-34 F', description: 'Categoria Lady 30 a 34 anos (Feminino)', minAge: 30, maxAge: 34, isActive: true, gender: 'feminino' },
      { id: '3cec7ce1-3dd4-439c-8f50-51facb85c3fd', name: 'Lady 35-39 F', description: 'Categoria Lady 35 a 39 anos (Feminino)', minAge: 35, maxAge: 39, isActive: true, gender: 'feminino' },
      { id: 'c37466e9-fcb6-43b9-b0f8-274c46900554', name: '40-44 F', description: 'Categoria Veterana 40 a 44 anos (Feminino)', minAge: 40, maxAge: 44, isActive: true, gender: 'feminino' },
      { id: '56cdb842-0e81-4000-b5ba-881a29c68d6a', name: '45-49 F', description: 'Categoria Veterana 45 a 49 anos (Feminino)', minAge: 45, maxAge: 49, isActive: true, gender: 'feminino' },
      { id: 'b560fd8c-ac76-496f-bde3-0b8d05d862e0', name: '50-54 F', description: 'Categoria Veterana 50 a 54 anos (Feminino)', minAge: 50, maxAge: 54, isActive: true, gender: 'feminino' },
      { id: '3db26a32-cdec-40d6-92e6-0a1d991cf63b', name: '55-59 F', description: 'Categoria Veterana 55 a 59 anos (Feminino)', minAge: 55, maxAge: 59, isActive: true, gender: 'feminino' },
      { id: '4816315a-6212-4d73-8985-8b2e6aaa75fd', name: '60-64 F', description: 'Categoria Veterana 60 a 64 anos (Feminino)', minAge: 60, maxAge: 64, isActive: true, gender: 'feminino' },
      { id: '5f6981f2-4459-42c6-8836-3b5f3397117f', name: '65-69 F', description: 'Categoria Veterana 65 a 69 anos (Feminino)', minAge: 65, maxAge: 69, isActive: true, gender: 'feminino' },
      { id: 'ef5ca020-0468-48f3-bf07-8838cc800bc5', name: '70-74 F', description: 'Categoria Veterana 70 a 74 anos (Feminino)', minAge: 70, maxAge: 74, isActive: true, gender: 'feminino' },
      { id: '846c1244-d4f5-454b-befd-9e3e860d965d', name: '75+ F', description: 'Categoria Veterana 75 anos ou mais (Feminino)', minAge: 75, maxAge: null, isActive: true, gender: 'feminino' },

      // === CATEGORIAS MASCULINAS (por idade crescente) ===
      { id: 'e547042b-c594-4842-881a-d48e14a98f5a', name: 'Sub-11 M', description: 'Categoria Infantil até 11 anos (Masculino)', minAge: 0, maxAge: 11, isActive: true, gender: 'masculino' },
      { id: 'b7268b74-ce43-4dad-9c1a-3aa377a9869d', name: 'Sub-13 M', description: 'Categoria Juvenil até 13 anos (Masculino)', minAge: 0, maxAge: 13, isActive: true, gender: 'masculino' },
      { id: '3065ffd1-335e-4ced-9b71-f1d8f60ebafb', name: 'Sub-15 M', description: 'Categoria Cadete até 15 anos (Masculino)', minAge: 0, maxAge: 15, isActive: true, gender: 'masculino' },
      { id: '6d38f311-c88b-42c3-b4b5-3ebdac935f65', name: 'Sub-19 M', description: 'Categoria Junior internacional - até 19 anos (Masculino)', minAge: 0, maxAge: 19, isActive: true, gender: 'masculino' },
      { id: 'b0dcbc55-43ae-41bc-aa75-7c132c1ab8da', name: 'Senior 30-34 M', description: 'Categoria Senior 30 a 34 anos (Masculino)', minAge: 30, maxAge: 34, isActive: true, gender: 'masculino' },
      { id: '16e1376a-1a26-41c2-907b-29dfed74dbdb', name: 'Senior 35-39 M', description: 'Categoria Senior 35 a 39 anos (Masculino)', minAge: 35, maxAge: 39, isActive: true, gender: 'masculino' },
      { id: '6be1514c-dc44-4c74-a818-3de3c0fde86a', name: '40-44 M', description: 'Categoria Veterana 40 a 44 anos (Masculino)', minAge: 40, maxAge: 44, isActive: true, gender: 'masculino' },
      { id: '0bac2895-b4c2-4101-970a-8e27d53d76df', name: '45-49 M', description: 'Categoria Veterana 45 a 49 anos (Masculino)', minAge: 45, maxAge: 49, isActive: true, gender: 'masculino' },
      { id: 'e4b8454b-17ef-493a-9450-2cf751e23dc7', name: '50-54 M', description: 'Categoria Veterana 50 a 54 anos (Masculino)', minAge: 50, maxAge: 54, isActive: true, gender: 'masculino' },
      { id: 'e7b1499c-5b40-4b24-b5a9-f2480b578f28', name: '55-59 M', description: 'Categoria Veterana 55 a 59 anos (Masculino)', minAge: 55, maxAge: 59, isActive: true, gender: 'masculino' },
      { id: '43179a91-83e6-47fa-a884-a5197c1ace7c', name: '60-64 M', description: 'Categoria Veterana 60 a 64 anos (Masculino)', minAge: 60, maxAge: 64, isActive: true, gender: 'masculino' },
      { id: '91457f43-87e7-468e-ac9d-bb9f4be64497', name: '65-69 M', description: 'Categoria Veterana 65 a 69 anos (Masculino)', minAge: 65, maxAge: 69, isActive: true, gender: 'masculino' },
      { id: '46e8d65c-a530-4b1d-b7fb-1bfc63fb436a', name: '70-74 M', description: 'Categoria Veterana 70 a 74 anos (Masculino)', minAge: 70, maxAge: 74, isActive: true, gender: 'masculino' },
      { id: '93747148-c166-4ed8-9d3f-0504c9bd9bb5', name: '75+ M', description: 'Categoria Veterana 75 anos ou mais (Masculino)', minAge: 75, maxAge: null, isActive: true, gender: 'masculino' },

      // === CATEGORIAS ABSOLUTO (Feminino primeiro, depois Masculino) ===
      { id: '1b765af4-b569-467e-8079-bd1db87c51bf', name: 'Absoluto D F', description: 'Categoria Absoluto nível D - atletas iniciantes (Feminino)', minAge: 14, maxAge: null, isActive: true, gender: 'feminino' },
      { id: 'b59e0667-90db-44b9-9fd7-0f5902f2da4c', name: 'Absoluto C F', description: 'Categoria Absoluto nível C - atletas intermediários (Feminino)', minAge: 14, maxAge: null, isActive: true, gender: 'feminino' },
      { id: 'd1e2f742-7b31-4964-902f-b921f0bdfa22', name: 'Absoluto B F', description: 'Categoria Absoluto nível B - atletas avançados (Feminino)', minAge: 14, maxAge: null, isActive: true, gender: 'feminino' },
      { id: 'ee3f19dd-02f0-4d2f-adab-60f67bf409a7', name: 'Absoluto A F', description: 'Categoria Absoluto nível A - atletas de elite (Feminino)', minAge: 14, maxAge: null, isActive: true, gender: 'feminino' },
      { id: '67ca940c-addb-4cbd-bcf4-86a4851132cc', name: 'Absoluto D M', description: 'Categoria Absoluto nível D - atletas iniciantes (Masculino)', minAge: 14, maxAge: null, isActive: true, gender: 'masculino' },
      { id: '3be24e05-bff4-4e77-a34a-7b2674534b2d', name: 'Absoluto C M', description: 'Categoria Absoluto nível C - atletas intermediários (Masculino)', minAge: 14, maxAge: null, isActive: true, gender: 'masculino' },
      { id: 'c829286e-64d1-493f-88c8-7c248fb14814', name: 'Absoluto B M', description: 'Categoria Absoluto nível B - atletas avançados (Masculino)', minAge: 14, maxAge: null, isActive: true, gender: 'masculino' },
      { id: '4cc9e1e4-75a0-49b2-b8de-03abc1d92e53', name: 'Absoluto A M', description: 'Categoria Absoluto nível A - atletas de elite (Masculino)', minAge: 14, maxAge: null, isActive: true, gender: 'masculino' }
    ];
}

// Execução manual se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCategories()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Seed das categorias concluído!');
        process.exit(0);
      } else {
        console.error('💥 Falha no seed das categorias');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Erro inesperado:', error);
      process.exit(1);
    });
}