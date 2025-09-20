/**
 * Calcula a idade que o atleta completará no ano do torneio
 * Baseado na data de nascimento e no ano do torneio
 */
export function calculateAgeInTournamentYear(birthDate: string, tournamentYear: number): number {
  const birth = new Date(birthDate);
  const birthYear = birth.getFullYear();
  
  // Idade que completará no ano do torneio (mesmo que ainda não tenha completado)
  return tournamentYear - birthYear;
}

/**
 * Verifica se um atleta é elegível para uma categoria específica
 * com base na sua idade no ano do torneio
 */
export function isEligibleForCategory(
  birthDate: string, 
  tournamentYear: number, 
  categoryMinAge: number | null, 
  categoryMaxAge: number | null
): boolean {
  const ageInTournament = calculateAgeInTournamentYear(birthDate, tournamentYear);
  
  // Verifica limite mínimo (se existir)
  if (categoryMinAge !== null && ageInTournament < categoryMinAge) {
    return false;
  }
  
  // Verifica limite máximo (se existir)
  if (categoryMaxAge !== null && ageInTournament > categoryMaxAge) {
    return false;
  }
  
  return true;
}

/**
 * Filtra categorias elegíveis para um atleta com base na sua idade
 */
export function getEligibleCategoriesForAthlete(
  birthDate: string, 
  tournamentYear: number, 
  categories: Array<{name: string, minAge: number | null, maxAge: number | null}>
): Array<{name: string, minAge: number | null, maxAge: number | null}> {
  return categories.filter(category => 
    isEligibleForCategory(birthDate, tournamentYear, category.minAge, category.maxAge)
  );
}

/**
 * Extrai o ano de uma string de data ISO ou timestamp
 */
export function extractYearFromDate(dateString: string | Date): number {
  if (!dateString) return new Date().getFullYear();
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.getFullYear();
}