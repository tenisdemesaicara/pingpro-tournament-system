import { Category } from "@shared/schema";

/**
 * Calcula a idade que o atleta terá/teve no ano atual
 * baseado no ano de nascimento (padrão CBTM)
 */
export function calculateAgeForYear(birthDate: string, year?: number): number {
  const currentYear = year || new Date().getFullYear();
  const birthYear = new Date(birthDate).getFullYear();
  return currentYear - birthYear;
}

/**
 * Determina automaticamente as categorias elegíveis para um atleta
 * baseado na sua data de nascimento
 */
export function getEligibleCategoriesForAthlete(
  birthDate: string, 
  gender: string,
  allCategories: Category[],
  year?: number
): Category[] {
  const age = calculateAgeForYear(birthDate, year);
  const eligibleCategories: Category[] = [];

  for (const category of allCategories) {
    // Verificar se o atleta está dentro da faixa etária da categoria
    const isWithinAgeRange = checkAgeEligibility(age, category);
    
    // Verificar se o gênero é compatível (mista aceita todos)
    const isGenderCompatible = category.gender === "mista" || 
                              category.gender === gender || 
                              (category.gender === "M" && gender === "masculino") ||
                              (category.gender === "F" && gender === "feminino");

    if (isWithinAgeRange && isGenderCompatible) {
      eligibleCategories.push(category);
    }
  }

  return eligibleCategories.sort((a, b) => {
    // Priorizar categorias por idade (mais específicas primeiro)
    if (a.minAge && b.minAge) {
      return a.minAge - b.minAge;
    }
    if (a.maxAge && b.maxAge) {
      return a.maxAge - b.maxAge;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Verifica se um atleta está elegível para uma categoria específica
 */
function checkAgeEligibility(age: number, category: Category): boolean {
  // Categorias Absoluto (sem restrição de idade)
  if (category.name.startsWith("Absoluto")) {
    return age >= 14; // Idade mínima para Absoluto
  }

  // Categorias Sub (idade máxima)
  if (category.name.startsWith("Sub-")) {
    const maxAge = category.maxAge;
    return maxAge ? age <= maxAge : false;
  }

  // Categorias com faixa etária específica (min e max)
  if (category.minAge && category.maxAge) {
    return age >= category.minAge && age <= category.maxAge;
  }

  // Categorias só com idade mínima (veteranos)
  if (category.minAge && !category.maxAge) {
    return age >= category.minAge;
  }

  // Categorias só com idade máxima
  if (!category.minAge && category.maxAge) {
    return age <= category.maxAge;
  }

  // Se não tem restrição de idade, aceita todos
  return true;
}

/**
 * Encontra a categoria principal/primária para um atleta
 * baseada na sua idade (categoria mais específica)
 */
export function getPrimaryCategoryForAthlete(
  birthDate: string,
  gender: string, 
  allCategories: Category[],
  year?: number
): Category | null {
  const eligibleCategories = getEligibleCategoriesForAthlete(birthDate, gender, allCategories, year);
  
  if (eligibleCategories.length === 0) {
    return null;
  }

  // Priorizar categorias de base (mais específicas por idade)
  const baseCategories = eligibleCategories.filter(cat => 
    cat.name.startsWith("Sub-") || 
    cat.name === "Pré-Mirim" ||
    cat.name === "Mirim" ||
    cat.name === "Infantil" ||
    cat.name === "Juvenil" ||
    cat.name === "Juventude" ||
    cat.name === "Adulto" ||
    cat.name.startsWith("Sênior") ||
    cat.name.startsWith("Veterano")
  );

  if (baseCategories.length > 0) {
    // Retorna a categoria de base mais específica
    return baseCategories[0];
  }

  // Se não tem categoria de base, retorna a primeira elegível
  return eligibleCategories[0];
}

/**
 * Atualiza automaticamente a categoria de um atleta baseada na idade
 */
export function updateAthleteAutoCategory(
  athlete: { birthDate: string | null, gender: string },
  allCategories: Category[],
  year?: number
): string | null {
  if (!athlete.birthDate) {
    return null;
  }

  const primaryCategory = getPrimaryCategoryForAthlete(
    athlete.birthDate,
    athlete.gender,
    allCategories,
    year
  );

  return primaryCategory ? primaryCategory.name : null;
}