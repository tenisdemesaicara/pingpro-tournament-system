-- Script de Importação das Categorias para Produção
-- Gerado automaticamente em 02/09/2025
-- Total de 36 categorias configuradas

-- Limpar categorias existentes (opcional - descomente se necessário)
-- DELETE FROM categories;

-- Inserir categorias na ordem correta: Feminino primeiro, depois Masculino, por idade crescente
-- Categorias "Absoluto" aparecem no final

-- === CATEGORIAS FEMININAS (por idade crescente) ===

INSERT INTO categories (id, name, description, min_age, max_age, is_active, created_at, gender) VALUES
('e883e39a-8f49-4ef6-bdd6-13212ab917eb', 'Sub-11 F', 'Categoria Infantil até 11 anos (Feminino)', 0, 11, true, '2025-09-01 17:56:40.251373', 'feminino'),
('4a0dccc9-8a39-40b6-8e9e-65b89c3dd3f7', 'Sub-13 F', 'Categoria Juvenil até 13 anos (Feminino)', 0, 13, true, '2025-09-01 17:56:40.251373', 'feminino'),
('645da970-cd63-4e33-9395-9546a761d08d', 'Sub-15 F', 'Categoria Cadete até 15 anos (Feminino)', 0, 15, true, '2025-09-01 17:56:40.251373', 'feminino'),
('48ebb3b8-06c7-4480-9f7a-c4b800ef81f9', 'Sub-19 F', 'Categoria Junior internacional - até 19 anos (Feminino)', 0, 19, true, '2025-09-01 17:56:40.251373', 'feminino'),
('cf6e952e-4fdf-420b-a2ad-c88ce3fef530', 'Lady 30-34 F', 'Categoria Lady 30 a 34 anos (Feminino)', 30, 34, true, '2025-09-01 18:09:26.498345', 'feminino'),
('3cec7ce1-3dd4-439c-8f50-51facb85c3fd', 'Lady 35-39 F', 'Categoria Lady 35 a 39 anos (Feminino)', 35, 39, true, '2025-09-01 18:09:26.498345', 'feminino'),
('c37466e9-fcb6-43b9-b0f8-274c46900554', '40-44 F', 'Categoria Veterana 40 a 44 anos (Feminino)', 40, 44, true, '2025-09-01 17:56:40.251373', 'feminino'),
('56cdb842-0e81-4000-b5ba-881a29c68d6a', '45-49 F', 'Categoria Veterana 45 a 49 anos (Feminino)', 45, 49, true, '2025-09-01 17:56:40.251373', 'feminino'),
('b560fd8c-ac76-496f-bde3-0b8d05d862e0', '50-54 F', 'Categoria Veterana 50 a 54 anos (Feminino)', 50, 54, true, '2025-09-01 17:56:40.251373', 'feminino'),
('3db26a32-cdec-40d6-92e6-0a1d991cf63b', '55-59 F', 'Categoria Veterana 55 a 59 anos (Feminino)', 55, 59, true, '2025-09-01 17:56:40.251373', 'feminino'),
('4816315a-6212-4d73-8985-8b2e6aaa75fd', '60-64 F', 'Categoria Veterana 60 a 64 anos (Feminino)', 60, 64, true, '2025-09-01 17:56:40.251373', 'feminino'),
('5f6981f2-4459-42c6-8836-3b5f3397117f', '65-69 F', 'Categoria Veterana 65 a 69 anos (Feminino)', 65, 69, true, '2025-09-01 17:56:40.251373', 'feminino'),
('ef5ca020-0468-48f3-bf07-8838cc800bc5', '70-74 F', 'Categoria Veterana 70 a 74 anos (Feminino)', 70, 74, true, '2025-09-01 17:56:40.251373', 'feminino'),
('846c1244-d4f5-454b-befd-9e3e860d965d', '75+ F', 'Categoria Veterana 75 anos ou mais (Feminino)', 75, null, true, '2025-09-01 17:56:40.251373', 'feminino');

-- === CATEGORIAS MASCULINAS (por idade crescente) ===

INSERT INTO categories (id, name, description, min_age, max_age, is_active, created_at, gender) VALUES
('e547042b-c594-4842-881a-d48e14a98f5a', 'Sub-11 M', 'Categoria Infantil até 11 anos (Masculino)', 0, 11, true, '2025-09-01 17:56:40.251373', 'masculino'),
('b7268b74-ce43-4dad-9c1a-3aa377a9869d', 'Sub-13 M', 'Categoria Juvenil até 13 anos (Masculino)', 0, 13, true, '2025-09-01 17:56:40.251373', 'masculino'),
('3065ffd1-335e-4ced-9b71-f1d8f60ebafb', 'Sub-15 M', 'Categoria Cadete até 15 anos (Masculino)', 0, 15, true, '2025-09-01 17:56:40.251373', 'masculino'),
('6d38f311-c88b-42c3-b4b5-3ebdac935f65', 'Sub-19 M', 'Categoria Junior internacional - até 19 anos (Masculino)', 0, 19, true, '2025-09-01 17:56:40.251373', 'masculino'),
('b0dcbc55-43ae-41bc-aa75-7c132c1ab8da', 'Senior 30-34 M', 'Categoria Senior 30 a 34 anos (Masculino)', 30, 34, true, '2025-09-01 18:09:26.498345', 'masculino'),
('16e1376a-1a26-41c2-907b-29dfed74dbdb', 'Senior 35-39 M', 'Categoria Senior 35 a 39 anos (Masculino)', 35, 39, true, '2025-09-01 18:09:26.498345', 'masculino'),
('6be1514c-dc44-4c74-a818-3de3c0fde86a', '40-44 M', 'Categoria Veterana 40 a 44 anos (Masculino)', 40, 44, true, '2025-09-01 17:56:40.251373', 'masculino'),
('0bac2895-b4c2-4101-970a-8e27d53d76df', '45-49 M', 'Categoria Veterana 45 a 49 anos (Masculino)', 45, 49, true, '2025-09-01 17:56:40.251373', 'masculino'),
('e4b8454b-17ef-493a-9450-2cf751e23dc7', '50-54 M', 'Categoria Veterana 50 a 54 anos (Masculino)', 50, 54, true, '2025-09-01 17:56:40.251373', 'masculino'),
('e7b1499c-5b40-4b24-b5a9-f2480b578f28', '55-59 M', 'Categoria Veterana 55 a 59 anos (Masculino)', 55, 59, true, '2025-09-01 17:56:40.251373', 'masculino'),
('43179a91-83e6-47fa-a884-a5197c1ace7c', '60-64 M', 'Categoria Veterana 60 a 64 anos (Masculino)', 60, 64, true, '2025-09-01 17:56:40.251373', 'masculino'),
('91457f43-87e7-468e-ac9d-bb9f4be64497', '65-69 M', 'Categoria Veterana 65 a 69 anos (Masculino)', 65, 69, true, '2025-09-01 17:56:40.251373', 'masculino'),
('46e8d65c-a530-4b1d-b7fb-1bfc63fb436a', '70-74 M', 'Categoria Veterana 70 a 74 anos (Masculino)', 70, 74, true, '2025-09-01 17:56:40.251373', 'masculino'),
('93747148-c166-4ed8-9d3f-0504c9bd9bb5', '75+ M', 'Categoria Veterana 75 anos ou mais (Masculino)', 75, null, true, '2025-09-01 17:56:40.251373', 'masculino');

-- === CATEGORIAS ABSOLUTO (por gênero: Feminino primeiro, depois Masculino) ===

INSERT INTO categories (id, name, description, min_age, max_age, is_active, created_at, gender) VALUES
('1b765af4-b569-467e-8079-bd1db87c51bf', 'Absoluto D F', 'Categoria Absoluto nível D - atletas iniciantes (Feminino)', 14, null, true, '2025-09-01 17:56:40.251373', 'feminino'),
('b59e0667-90db-44b9-9fd7-0f5902f2da4c', 'Absoluto C F', 'Categoria Absoluto nível C - atletas intermediários (Feminino)', 14, null, true, '2025-09-01 17:56:40.251373', 'feminino'),
('d1e2f742-7b31-4964-902f-b921f0bdfa22', 'Absoluto B F', 'Categoria Absoluto nível B - atletas avançados (Feminino)', 14, null, true, '2025-09-01 17:56:40.251373', 'feminino'),
('ee3f19dd-02f0-4d2f-adab-60f67bf409a7', 'Absoluto A F', 'Categoria Absoluto nível A - atletas de elite (Feminino)', 14, null, true, '2025-09-01 17:56:40.251373', 'feminino'),
('67ca940c-addb-4cbd-bcf4-86a4851132cc', 'Absoluto D M', 'Categoria Absoluto nível D - atletas iniciantes (Masculino)', 14, null, true, '2025-09-01 17:56:40.251373', 'masculino'),
('3be24e05-bff4-4e77-a34a-7b2674534b2d', 'Absoluto C M', 'Categoria Absoluto nível C - atletas intermediários (Masculino)', 14, null, true, '2025-09-01 17:56:40.251373', 'masculino'),
('c829286e-64d1-493f-88c8-7c248fb14814', 'Absoluto B M', 'Categoria Absoluto nível B - atletas avançados (Masculino)', 14, null, true, '2025-09-01 17:56:40.251373', 'masculino'),
('4cc9e1e4-75a0-49b2-b8de-03abc1d92e53', 'Absoluto A M', 'Categoria Absoluto nível A - atletas de elite (Masculino)', 14, null, true, '2025-09-01 17:56:40.251373', 'masculino');

-- Verificar se todas as categorias foram inseridas
SELECT COUNT(*) as total_categories FROM categories;

-- Verificar a ordenação final das categorias
SELECT name, min_age, max_age, gender 
FROM categories 
ORDER BY 
  CASE WHEN name LIKE 'Absoluto%' THEN 1 ELSE 0 END,
  CASE WHEN gender = 'feminino' THEN 0 ELSE 1 END,
  min_age;