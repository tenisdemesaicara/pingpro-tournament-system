import { type Athlete, type InsertAthlete, type Tournament, type InsertTournament, type TournamentParticipant, type InsertTournamentParticipant, type TournamentParticipantWithAthlete, type Match, type InsertMatch, type Community, type InsertCommunity, type Category, type InsertCategory, type TournamentWithParticipants, type Payment, type InsertPayment, type Revenue, type InsertRevenue, type Expense, type InsertExpense, type RankingSeason, type InsertRankingSeason, type Consent, type InsertConsent, type ExternalLink, type InsertExternalLink, type Asset, type InsertAsset, type SystemSetting, type InsertSystemSetting, type Team, type InsertTeam, type TeamMember, type InsertTeamMember, type TournamentTeam, type InsertTournamentTeam, type TeamTie, type InsertTeamTie, athletes, tournaments, tournamentParticipants, matches, communities, categories, tournamentCategories, payments, revenues, expenses, rankingSeasons, consents, externalLinks, assets, systemSettings, teams, teamMembers, tournamentTeams, teamTies } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, asc, and, or, sql } from "drizzle-orm";

// Interface simplificada
export interface IStorage {
  // Athletes
  getAthlete(id: string): Promise<Athlete | undefined>;
  getAthleteByEmail(email: string): Promise<Athlete | undefined>;
  getAllAthletes(): Promise<Athlete[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(id: string, athlete: Partial<InsertAthlete>): Promise<Athlete | undefined>;
  deleteAthlete(id: string): Promise<boolean>;

  // Tournaments
  getTournament(id: string): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: string): Promise<boolean>;
  getTournamentWithParticipants(id: string): Promise<TournamentWithParticipants | undefined>;

  // Tournament Participants
  addParticipant(participant: InsertTournamentParticipant): Promise<TournamentParticipant>;
  removeParticipant(tournamentId: string, athleteId: string): Promise<boolean>;
  getTournamentParticipants(tournamentId: string): Promise<Athlete[]>;

  // Matches
  getMatch(id: string): Promise<Match | undefined>;
  getTournamentMatches(tournamentId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined>;
  deleteMatch(id: string): Promise<boolean>;
  deleteMatchesByCategory(tournamentId: string, categoryId: string): Promise<boolean>;
  
  // Remoção inteligente de atletas
  getMatchesByAthleteAndCategory(athleteId: string, tournamentId: string, categoryId: string): Promise<Match[]>;
  removeAthleteFromMatch(matchId: string, athleteId: string): Promise<boolean>;
  renumberMatches(tournamentId: string, categoryId: string): Promise<boolean>;
  
  // Bracket functions
  computeGroupStandings(tournamentId: string, categoryId: string): Promise<{group: string, standings: any[]}[]>;
  createMatchesBulk(matches: InsertMatch[]): Promise<Match[]>;
  getMatchesByCategoryPhase(tournamentId: string, categoryId: string, phase: string): Promise<Match[]>;
  getCategoryRounds(tournamentId: string, categoryId: string): Promise<{ round: number; phase: string; matchCount: number }[]>;
  getMatchesByRound(tournamentId: string, categoryId: string, round: number, phase?: string): Promise<any[]>;

  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  getTournamentCategories(tournamentId: string): Promise<Category[]>;
  removeTournamentCategory(tournamentId: string, categoryId: string): Promise<boolean>;
  updateTournamentCategory(categoryId: string, updates: { format: string, settings?: string | null }): Promise<Category | undefined>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;

  // Revenues
  getRevenue(id: string): Promise<Revenue | undefined>;
  getAllRevenues(): Promise<Revenue[]>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined>;
  deleteRevenue(id: string): Promise<boolean>;

  // Expenses
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Ranking Seasons
  getRankingSeason(athleteId: string, categoryId: string, season: number): Promise<RankingSeason | undefined>;
  getRankingsByCategory(categoryId: string, season: number): Promise<RankingSeason[]>;
  createOrUpdateRankingSeason(ranking: InsertRankingSeason): Promise<RankingSeason>;
  getAvailableSeasons(): Promise<number[]>;

  // Consents
  getConsent(athleteId: string): Promise<Consent | undefined>;
  getAllConsents(): Promise<Consent[]>;
  createConsent(consent: InsertConsent): Promise<Consent>;
  updateConsent(id: string, consent: Partial<InsertConsent>): Promise<Consent | undefined>;
  deleteConsent(id: string): Promise<boolean>;

  // External Links
  getExternalLink(id: string): Promise<ExternalLink | undefined>;
  getExternalLinkByShortCode(shortCode: string): Promise<ExternalLink | undefined>;
  getAllExternalLinks(): Promise<ExternalLink[]>;
  createExternalLink(link: InsertExternalLink): Promise<ExternalLink>;
  updateExternalLink(id: string, link: Partial<InsertExternalLink>): Promise<ExternalLink | undefined>;
  deleteExternalLink(id: string): Promise<boolean>;
  incrementLinkAccess(shortCode: string): Promise<void>;

  // Assets (Controle Patrimonial)
  getAsset(id: string): Promise<Asset | undefined>;
  getAllAssets(): Promise<Asset[]>;
  getActiveAssets(): Promise<Asset[]>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  inactivateAsset(id: string): Promise<Asset | undefined>;
  activateAsset(id: string): Promise<Asset | undefined>;
  getAssetsByCategory(category: string): Promise<Asset[]>;
  getAssetsBySituation(situation: string): Promise<Asset[]>;

  // System Settings
  getSystemSetting(key: string): Promise<any>;
  getAllSystemSettings(): Promise<any[]>;
  createOrUpdateSystemSetting(key: string, value?: string, fileUrl?: string, description?: string, category?: string): Promise<any>;
  deleteSystemSetting(key: string): Promise<boolean>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  getAllTeams(): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;

  // Team Members
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;
  getTeamMembersWithAthletes(teamId: string): Promise<(TeamMember & { athlete: Athlete })[]>;

  // Tournament Teams
  getTournamentTeam(id: string): Promise<TournamentTeam | undefined>;
  getTournamentTeams(tournamentId: string, categoryId?: string): Promise<TournamentTeam[]>;
  createTournamentTeam(tournamentTeam: InsertTournamentTeam): Promise<TournamentTeam>;
  updateTournamentTeam(id: string, tournamentTeam: Partial<InsertTournamentTeam>): Promise<TournamentTeam | undefined>;
  deleteTournamentTeam(id: string): Promise<boolean>;
  getTeamsByTournamentCategory(tournamentId: string, categoryId: string): Promise<(TournamentTeam & { team: Team })[]>;

  // Team Ties
  getTeamTie(id: string): Promise<TeamTie | undefined>;
  getTeamTies(tournamentId: string, categoryId?: string): Promise<TeamTie[]>;
  createTeamTie(tie: InsertTeamTie): Promise<TeamTie>;
  updateTeamTie(id: string, tie: Partial<InsertTeamTie>): Promise<TeamTie | undefined>;
  deleteTeamTie(id: string): Promise<boolean>;
  getTiesByCategoryPhase(tournamentId: string, categoryId: string, phase: string): Promise<TeamTie[]>;
  updateTieScoreFromChildMatches(tieId: string): Promise<TeamTie | undefined>;
  computeTeamGroupStandings(tournamentId: string, categoryId: string): Promise<{group: string, standings: any[]}[]>;
  createTieWithChildren(tie: InsertTeamTie, matches: InsertMatch[]): Promise<{ tie: TeamTie, matches: Match[] }>;
}

// Implementação simplificada
export class DatabaseStorage implements IStorage {
  // Athletes
  async getAthlete(id: string): Promise<Athlete | undefined> {
    const results = await db.select().from(athletes).where(eq(athletes.id, id));
    return results[0];
  }

  async getAthleteByEmail(email: string): Promise<Athlete | undefined> {
    const results = await db.select().from(athletes).where(eq(athletes.email, email));
    return results[0];
  }

  async getAllAthletes(): Promise<Athlete[]> {
    return await db.select().from(athletes).orderBy(asc(athletes.name));
  }

  async createAthlete(athlete: InsertAthlete): Promise<Athlete> {
    try {
      const newAthlete = { ...athlete, id: randomUUID() };
      await db.insert(athletes).values(newAthlete);
      return newAthlete as Athlete;
    } catch (error) {
      console.error("Error in createAthlete:", error);
      throw error;
    }
  }

  async updateAthlete(id: string, athlete: Partial<InsertAthlete>): Promise<Athlete | undefined> {
    await db.update(athletes).set(athlete).where(eq(athletes.id, id));
    return this.getAthlete(id);
  }

  async deleteAthlete(id: string): Promise<boolean> {
    await db.delete(athletes).where(eq(athletes.id, id));
    return true;
  }

  // Tournaments
  async getTournament(id: string): Promise<Tournament | undefined> {
    try {
      console.log("Storage: getTournament called with ID:", id);
      const results = await db.select().from(tournaments).where(eq(tournaments.id, id));
      console.log("Storage: Query results:", results.length, "tournaments found");
      if (results.length > 0) {
        console.log("Storage: Tournament data:", results[0].name);
      }
      return results[0];
    } catch (error) {
      console.error("Storage: Error in getTournament:", error);
      throw error;
    }
  }

  async getAllTournaments(): Promise<Tournament[]> {
    try {
      return await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
    } catch (error) {
      console.error("Error in getAllTournaments:", error);
      // Fallback: retornar sem ordenação se houver problema com createdAt
      try {
        return await db.select().from(tournaments);
      } catch (fallbackError) {
        console.error("Fallback error in getAllTournaments:", fallbackError);
        return [];
      }
    }
  }

  async createTournament(tournament: InsertTournament & { categories?: any[] }): Promise<Tournament> {
    try {
      const { categories: tournamentCategoriesData, ...tournamentData } = tournament;
      const newTournament = { ...tournamentData, id: randomUUID() };
      console.log("Creating tournament with data:", JSON.stringify(newTournament, null, 2));
      
      // Criar o torneio
      await db.insert(tournaments).values(newTournament);
      
      // Se houver categorias, criar e associar ao torneio
      if (tournamentCategoriesData && tournamentCategoriesData.length > 0) {
        console.log("Creating categories:", tournamentCategoriesData.length);
        
        for (const categoryData of tournamentCategoriesData) {
          // Criar a categoria
          const newCategory = {
            id: randomUUID(),
            name: categoryData.name,
            description: categoryData.description || '',
            minAge: categoryData.minAge,
            maxAge: categoryData.maxAge,
            gender: categoryData.gender,
            isActive: categoryData.isActive ?? true,
          };
          
          await db.insert(categories).values(newCategory);
          
          // Associar categoria ao torneio
          const categoryFormat = categoryData.format || tournamentData.format || 'single_elimination';
          
          // Preparar configurações específicas para formatos de equipe
          let categorySettings: any = null;
          if (categoryFormat === 'team_round_robin' || categoryFormat === 'team_group_knockout') {
            categorySettings = {
              format: categoryFormat,
              maxBoards: tournamentData.teamMembersPerTeam || 7,
              pairingMode: tournamentData.teamPairingMode || 'ordered',
              pointsPerWin: tournamentData.pointsPerWin || 1,
              bestOfSets: tournamentData.bestOfSetsTeam || 3,
              numGroups: categoryFormat === 'team_round_robin' ? 1 : 2,
              advancesPerGroup: categoryFormat === 'team_group_knockout' ? 2 : undefined
            };
          }
          
          const tournamentCategory = {
            id: randomUUID(),
            tournamentId: newTournament.id,
            categoryId: newCategory.id,
            format: categoryFormat,
            settings: categorySettings ? JSON.stringify(categorySettings) : null,
            maxParticipants: categoryData.participantLimit || null,
          };
          
          await db.insert(tournamentCategories).values(tournamentCategory);
        }
        
        console.log("Categories created and associated successfully");
      }
      
      return newTournament as Tournament;
    } catch (error) {
      console.error("Error in createTournament:", error);
      console.error("Tournament data:", JSON.stringify(tournament, null, 2));
      throw error;
    }
  }

  async updateTournament(id: string, tournament: Partial<InsertTournament> & { categories?: any[] }): Promise<Tournament | undefined> {
    try {
      console.log("=== UPDATE TOURNAMENT DEBUG ===");
      console.log("Tournament ID:", id);
      console.log("Update data:", JSON.stringify(tournament, null, 2));
      
      const { categories: tournamentCategoriesData, ...tournamentData } = tournament;
      
      // Atualizar os dados do torneio
      if (Object.keys(tournamentData).length > 0) {
        await db.update(tournaments).set(tournamentData).where(eq(tournaments.id, id));
        console.log("Tournament data updated successfully");
      }
      
      // Se houver categorias para atualizar, limpar e recriar
      if (tournamentCategoriesData && Array.isArray(tournamentCategoriesData)) {
        console.log("🔄 SAFE UPDATE: Preserving participants while updating categories:", tournamentCategoriesData.length);
        
        // **SAFE APPROACH**: Get existing categories first to avoid orphaning participants
        const existingCategories = await db
          .select({
            categoryId: tournamentCategories.categoryId,
            categoryName: categories.name,
            categoryFormat: tournamentCategories.format
          })
          .from(tournamentCategories)
          .leftJoin(categories, eq(tournamentCategories.categoryId, categories.id))
          .where(eq(tournamentCategories.tournamentId, id));
        
        console.log("🔍 Found existing categories:", existingCategories.length);
        
        // **CRITICAL**: Create map of existing categories to preserve participants
        const existingCategoryMap = new Map();
        for (const cat of existingCategories) {
          existingCategoryMap.set(cat.categoryName, {
            id: cat.categoryId,
            format: cat.categoryFormat
          });
        }
        
        // **SMART UPDATE**: Update existing, create new, preserve participants
        for (const newCategoryData of tournamentCategoriesData) {
          const existingCat = existingCategoryMap.get(newCategoryData.name);
          
          if (existingCat) {
            console.log(`✅ PRESERVING category with participants: ${newCategoryData.name} (ID: ${existingCat.id})`);
            
            // **CRITICAL**: Check if category has participants before making changes
            const participantCount = await db
              .select({ count: sql`count(*)` })
              .from(tournamentParticipants)
              .where(and(
                eq(tournamentParticipants.tournamentId, id),
                eq(tournamentParticipants.categoryId, existingCat.id)
              ));
            
            const hasParticipants = Number(participantCount[0]?.count) > 0;
            console.log(`📊 Category ${newCategoryData.name} has ${participantCount[0]?.count} participants`);
            
            if (hasParticipants) {
              console.log(`🛡️ PROTECTING participants - updating in place for ${newCategoryData.name}`);
            }
            
            // Update format and properties (safe - doesn't affect participants)
            await db.update(tournamentCategories)
              .set({ format: newCategoryData.format || 'single_elimination' })
              .where(and(
                eq(tournamentCategories.tournamentId, id),
                eq(tournamentCategories.categoryId, existingCat.id)
              ));
              
            await db.update(categories)
              .set({
                description: newCategoryData.description || '',
                minAge: newCategoryData.minAge,
                maxAge: newCategoryData.maxAge,
                gender: newCategoryData.gender
              })
              .where(eq(categories.id, existingCat.id));
              
            console.log(`🔄 Updated ${newCategoryData.name}: ${existingCat.format} → ${newCategoryData.format}`);
            existingCategoryMap.delete(newCategoryData.name);
          } else {
            console.log(`🆕 CREATING new category: ${newCategoryData.name}`);
            
            // Create new category
            const newCategory = {
              id: randomUUID(),
              name: newCategoryData.name,
              description: newCategoryData.description || '',
              minAge: newCategoryData.minAge,
              maxAge: newCategoryData.maxAge,
              gender: newCategoryData.gender,
              isActive: newCategoryData.isActive ?? true,
            };
            
            await db.insert(categories).values(newCategory);
            
            // Associate with tournament
            const tournamentCategory = {
              id: randomUUID(),
              tournamentId: id,
              categoryId: newCategory.id,
              format: newCategoryData.format || 'single_elimination',
              maxParticipants: newCategoryData.participantLimit || null,
            };
            
            await db.insert(tournamentCategories).values(tournamentCategory);
          }
        }
        
        console.log("✅ SAFE category update completed - participant data preserved!");
      }
      
      return this.getTournament(id);
    } catch (error) {
      console.error("=== UPDATE TOURNAMENT ERROR ===");
      console.error("Error updating tournament:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  async deleteTournament(id: string): Promise<boolean> {
    await db.delete(tournaments).where(eq(tournaments.id, id));
    return true;
  }

  async getTournamentWithParticipants(id: string): Promise<TournamentWithParticipants | undefined> {
    try {
      console.log("Storage: Getting tournament with ID:", id);
      
      const tournament = await this.getTournament(id);
      if (!tournament) {
        console.log("Storage: Tournament not found");
        return undefined;
      }
      
      console.log("Storage: Tournament found:", tournament.name);
      
      let participants: any[] = [];
      let categoriesData: any[] = [];
      let tournamentMatches: any[] = [];
      
      try {
        participants = await this.getTournamentParticipantsWithCategories(id);
        console.log("Storage: Participants loaded:", participants.length);
      } catch (error) {
        console.log("Storage: Error loading participants:", error);
      }
      
      try {
        categoriesData = await this.getTournamentCategories(id);
        console.log("Storage: Categories loaded:", categoriesData.length);
      } catch (error) {
        console.log("Storage: Error loading categories:", error);
      }
      
      try {
        tournamentMatches = await this.getTournamentMatches(id);
        console.log("Storage: Matches loaded:", tournamentMatches.length);
      } catch (error) {
        console.log("Storage: Error loading matches:", error);
      }
      
      return {
        ...tournament,
        participants,
        categories: categoriesData,
        matches: tournamentMatches
      };
    } catch (error) {
      console.error("Storage: Error in getTournamentWithParticipants:", error);
      throw error;
    }
  }

  // Tournament Participants
  async addParticipant(participant: InsertTournamentParticipant): Promise<TournamentParticipant> {
    // Gerar número de inscrição único para este torneio
    const registrationNumber = await this.generateRegistrationNumber(participant.tournamentId);
    
    const newParticipant = { ...participant, id: randomUUID(), registrationNumber };
    await db.insert(tournamentParticipants).values(newParticipant);
    return newParticipant as TournamentParticipant;
  }

  // Gera número de inscrição único sequencial por torneio
  async generateRegistrationNumber(tournamentId: string): Promise<string> {
    try {
      // Buscar o maior número de inscrição existente para este torneio
      const existingParticipants = await db.select({ registrationNumber: tournamentParticipants.registrationNumber })
        .from(tournamentParticipants)
        .where(eq(tournamentParticipants.tournamentId, tournamentId));
      
      // Extrair números e encontrar o próximo
      let maxNumber = 0;
      existingParticipants.forEach(p => {
        if (p.registrationNumber) {
          const num = parseInt(p.registrationNumber);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
      
      // Retornar próximo número com formatação (001, 002, 003...)
      return String(maxNumber + 1).padStart(3, '0');
    } catch (error) {
      console.error('Erro ao gerar número de inscrição:', error);
      // Fallback para timestamp caso haja erro
      return String(Date.now()).slice(-6);
    }
  }

  async removeParticipant(tournamentId: string, athleteId: string): Promise<boolean> {
    await db.delete(tournamentParticipants)
      .where(and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.athleteId, athleteId)
      ));
    return true;
  }

  async getTournamentParticipants(tournamentId: string): Promise<Athlete[]> {
    const results = await db.select()
    .from(tournamentParticipants)
    .innerJoin(athletes, eq(tournamentParticipants.athleteId, athletes.id))
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
    
    return results.map(result => result.athletes);
  }

  // Nova função que retorna participantes com categoryId
  async getTournamentParticipantsWithCategories(tournamentId: string): Promise<any[]> {
    const results = await db.select({
      // Dados do participante
      participantId: tournamentParticipants.id,
      categoryId: tournamentParticipants.categoryId,
      technicalCategoryId: tournamentParticipants.technicalCategoryId,
      // status: tournamentParticipants.status, // Campo não existe na tabela atual
      seed: tournamentParticipants.seed,
      // Dados do atleta - CORREÇÃO CRÍTICA: usar athleteId como id principal
      id: athletes.id, // ✅ ID correto do atleta para o frontend
      athleteId: athletes.id, // Mantido para compatibilidade
      name: athletes.name,
      email: athletes.email,
      phone: athletes.phone,
      birthDate: athletes.birthDate,
      cpf: athletes.cpf,
      rg: athletes.rg,
      street: athletes.street,
      neighborhood: athletes.neighborhood,
      zipCode: athletes.zipCode,
      city: athletes.city,
      state: athletes.state,
      complement: athletes.complement,
      club: athletes.club,
      category: athletes.category,
      gender: athletes.gender,
      ranking: athletes.ranking,
      wins: athletes.wins,
      losses: athletes.losses,
      points: athletes.points,
      photoUrl: athletes.photoUrl,
      observations: athletes.observations,
      athleteStatus: athletes.status,
      type: athletes.type,
      createdAt: athletes.createdAt
    })
    .from(tournamentParticipants)
    .innerJoin(athletes, eq(tournamentParticipants.athleteId, athletes.id))
    .where(eq(tournamentParticipants.tournamentId, tournamentId));
    
    return results.map(result => ({
      id: result.id, // ✅ CORREÇÃO CRÍTICA: usar ID correto do atleta
      categoryId: result.categoryId,
      // status: result.status, // Campo não existe
      seed: result.seed,
      athlete: {
        id: result.athleteId,
        name: result.name,
        email: result.email,
        phone: result.phone,
        birthDate: result.birthDate,
        cpf: result.cpf,
        rg: result.rg,
        street: result.street,
        neighborhood: result.neighborhood,
        zipCode: result.zipCode,
        city: result.city,
        state: result.state,
        complement: result.complement,
        club: result.club,
        category: result.category,
        gender: result.gender,
        ranking: result.ranking,
        wins: result.wins,
        losses: result.losses,
        points: result.points,
        photoUrl: result.photoUrl,
        observations: result.observations,
        status: result.athleteStatus,
        type: result.type,
        createdAt: result.createdAt
      },
      // Para compatibilidade, também incluir dados do atleta no nível principal
      name: result.name,
      email: result.email,
      phone: result.phone,
      birthDate: result.birthDate,
      cpf: result.cpf,
      rg: result.rg,
      street: result.street,
      neighborhood: result.neighborhood,
      zipCode: result.zipCode,
      city: result.city,
      state: result.state,
      complement: result.complement,
      club: result.club,
      category: result.category,
      gender: result.gender,
      ranking: result.ranking,
      wins: result.wins,
      losses: result.losses,
      points: result.points,
      photoUrl: result.photoUrl,
      observations: result.observations,
      type: result.type,
      createdAt: result.createdAt
    }));
  }


  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    const results = await db.select().from(matches).where(eq(matches.id, id));
    return results[0];
  }

  async getTournamentMatches(tournamentId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
  }

  // Buscar participantes de uma categoria específica
  async getTournamentParticipantsByCategory(tournamentId: string, categoryId: string): Promise<TournamentParticipantWithAthlete[]> {
    const results = await db
      .select({
        id: tournamentParticipants.id,
        tournamentId: tournamentParticipants.tournamentId,
        athleteId: tournamentParticipants.athleteId,
        categoryId: tournamentParticipants.categoryId,
        registrationNumber: tournamentParticipants.registrationNumber,
        seed: tournamentParticipants.seed,
        registeredAt: tournamentParticipants.registeredAt,
        name: athletes.name,
        email: athletes.email,
        birthDate: athletes.birthDate,
        gender: athletes.gender,
        neighborhood: athletes.neighborhood,
        zipCode: athletes.zipCode,
        city: athletes.city,
        state: athletes.state,
        category: athletes.category,
        cpf: athletes.cpf,
        rg: athletes.rg,
        photoUrl: athletes.photoUrl,
        street: athletes.street,
        phone: athletes.phone,
        complement: athletes.complement,
        club: athletes.club,
        observations: athletes.observations,
        status: athletes.status,
        type: athletes.type,
        createdAt: athletes.createdAt
      })
      .from(tournamentParticipants)
      .innerJoin(athletes, eq(tournamentParticipants.athleteId, athletes.id))
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.categoryId, categoryId)
        )
      );

    return results.map(result => ({
      id: result.id,
      tournamentId: result.tournamentId,
      athleteId: result.athleteId,
      categoryId: result.categoryId,
      registrationNumber: result.registrationNumber,
      seed: result.seed,
      registeredAt: result.registeredAt,
      name: result.name,
      email: result.email,
      birthDate: result.birthDate,
      gender: result.gender,
      neighborhood: result.neighborhood,
      zipCode: result.zipCode,
      city: result.city,
      state: result.state,
      category: result.category,
      cpf: result.cpf,
      rg: result.rg,
      photoUrl: result.photoUrl,
      street: result.street,
      phone: result.phone,
      complement: result.complement,
      club: result.club,
      observations: result.observations,
      status: result.status,
      type: result.type,
      createdAt: result.createdAt
    }));
  }

  // Buscar partidas de uma categoria específica
  async getMatchesByCategory(tournamentId: string, categoryId: string): Promise<Match[]> {
    const results = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId)
        )
      )
      .orderBy(matches.round, matches.matchNumber);

    return results;
  }

  // Buscar partidas de uma categoria com dados completos dos jogadores
  async getMatchesByCategoryWithPlayers(tournamentId: string, categoryId: string): Promise<any[]> {
    const results = await db
      .select({
        id: matches.id,
        tournamentId: matches.tournamentId,
        categoryId: matches.categoryId,
        round: matches.round,
        matchNumber: matches.matchNumber,
        player1Id: matches.player1Id,
        player2Id: matches.player2Id,
        winnerId: matches.winnerId,
        score: matches.score,
        status: matches.status,
        scheduledAt: matches.scheduledAt,
        completedAt: matches.completedAt,
        notes: matches.notes,
        phase: matches.phase,
        groupName: matches.groupName,
        bestOfSets: matches.bestOfSets,
        sets: matches.sets,
        needsAttention: matches.needsAttention,
        player1Name: sql<string>`
          (SELECT a.name FROM athletes a 
           WHERE a.id = matches.player1_id)
        `.as('player1Name'),
        player1Photo: sql<string>`
          (SELECT a.photo_url FROM athletes a 
           WHERE a.id = matches.player1_id)
        `.as('player1Photo'),
        player1City: sql<string>`
          (SELECT a.city FROM athletes a 
           WHERE a.id = matches.player1_id)
        `.as('player1City'),
        player1State: sql<string>`
          (SELECT a.state FROM athletes a 
           WHERE a.id = matches.player1_id)
        `.as('player1State'),
        player1Club: sql<string>`
          (SELECT a.club FROM athletes a 
           WHERE a.id = matches.player1_id)
        `.as('player1Club'),
        player2Name: sql<string>`
          (SELECT a.name FROM athletes a 
           WHERE a.id = matches.player2_id)
        `.as('player2Name'),
        player2Photo: sql<string>`
          (SELECT a.photo_url FROM athletes a 
           WHERE a.id = matches.player2_id)
        `.as('player2Photo'),
        player2City: sql<string>`
          (SELECT a.city FROM athletes a 
           WHERE a.id = matches.player2_id)
        `.as('player2City'),
        player2State: sql<string>`
          (SELECT a.state FROM athletes a 
           WHERE a.id = matches.player2_id)
        `.as('player2State'),
        player2Club: sql<string>`
          (SELECT a.club FROM athletes a 
           WHERE a.id = matches.player2_id)
        `.as('player2Club')
      })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId)
        )
      )
      .orderBy(matches.round, matches.matchNumber);

    return results;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const newMatch = { ...match, id: randomUUID() };
    await db.insert(matches).values(newMatch);
    return newMatch as Match;
  }

  async updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined> {
    await db.update(matches).set(match).where(eq(matches.id, id));
    return this.getMatch(id);
  }

  async deleteMatch(matchId: string): Promise<boolean> {
    await db.delete(matches).where(eq(matches.id, matchId));
    return true;
  }

  async deleteMatchesByCategory(tournamentId: string, categoryId: string): Promise<boolean> {
    await db.delete(matches).where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.categoryId, categoryId)
      )
    );
    return true;
  }

  // REMOÇÃO INTELIGENTE DE ATLETAS
  async getMatchesByAthleteAndCategory(athleteId: string, tournamentId: string, categoryId: string): Promise<Match[]> {
    const result = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId),
          or(
            eq(matches.player1Id, athleteId),
            eq(matches.player2Id, athleteId)
          )
        )
      )
      .orderBy(matches.round, matches.matchNumber);
    
    return result;
  }

  async removeAthleteFromMatch(matchId: string, athleteId: string): Promise<boolean> {
    const match = await this.getMatch(matchId);
    if (!match) return false;
    
    const updates: Partial<InsertMatch> = {};
    
    if (match.player1Id === athleteId) {
      updates.player1Id = null;
    }
    
    if (match.player2Id === athleteId) {
      updates.player2Id = null;
    }
    
    if (Object.keys(updates).length > 0) {
      await db.update(matches).set(updates).where(eq(matches.id, matchId));
      return true;
    }
    
    return false;
  }

  async renumberMatches(tournamentId: string, categoryId: string): Promise<boolean> {
    // Buscar todas as partidas da categoria ordenadas por rodada e número da partida
    const categoryMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId)
        )
      )
      .orderBy(matches.round, matches.matchNumber);
    
    // Agrupar por rodada e renumerar
    const matchesByRound = new Map<number, Match[]>();
    
    for (const match of categoryMatches) {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)!.push(match);
    }
    
    // Renumerar partidas em cada rodada
    for (const [round, roundMatches] of matchesByRound.entries()) {
      for (let i = 0; i < roundMatches.length; i++) {
        const newMatchNumber = i + 1;
        if (roundMatches[i].matchNumber !== newMatchNumber) {
          await db
            .update(matches)
            .set({ matchNumber: newMatchNumber })
            .where(eq(matches.id, roundMatches[i].id));
        }
      }
    }
    
    return true;
  }

  // BRACKET FUNCTIONS - Sistema de chaveamento
  async computeGroupStandings(tournamentId: string, categoryId: string): Promise<{group: string, standings: any[]}[]> {
    // Buscar todas as partidas da fase de grupos desta categoria
    const groupMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId),
          eq(matches.phase, "group"),
          eq(matches.status, "completed")
        )
      );

    // Agrupar partidas por grupo
    const groups = new Map<string, any[]>();
    
    for (const match of groupMatches) {
      if (!match.groupName) continue;
      
      if (!groups.has(match.groupName)) {
        groups.set(match.groupName, []);
      }
      groups.get(match.groupName)!.push(match);
    }

    // Calcular classificação para cada grupo
    const standings = [];
    
    for (const [groupName, matches] of Array.from(groups.entries())) {
      const playerStats = new Map();
      
      // Inicializar stats dos jogadores
      matches.forEach((match: any) => {
        [match.player1Id, match.player2Id].forEach(playerId => {
          if (playerId && !playerStats.has(playerId)) {
            playerStats.set(playerId, {
              playerId,
              points: 0, // vitórias = 2 pontos, empate = 1, derrota = 0
              setsWon: 0,
              setsLost: 0,
              matchesWon: 0,
              matchesPlayed: 0
            });
          }
        });
      });

      // Calcular resultados
      matches.forEach((match: any) => {
        if (!match.sets || !Array.isArray(match.sets) || match.sets.length === 0) return;
        
        const sets = match.sets as Array<{player1Score: number, player2Score: number}>;
        const player1Sets = sets.filter(set => set.player1Score > set.player2Score).length;
        const player2Sets = sets.filter(set => set.player2Score > set.player1Score).length;
        
        const player1Stats = playerStats.get(match.player1Id);
        const player2Stats = playerStats.get(match.player2Id);
        
        if (player1Stats) {
          player1Stats.matchesPlayed++;
          player1Stats.setsWon += player1Sets;
          player1Stats.setsLost += player2Sets;
          
          if (player1Sets > player2Sets) {
            player1Stats.points += 2; // vitória = 2 pontos
            player1Stats.matchesWon++;
          }
        }
        
        if (player2Stats) {
          player2Stats.matchesPlayed++;
          player2Stats.setsWon += player2Sets;
          player2Stats.setsLost += player1Sets;
          
          if (player2Sets > player1Sets) {
            player2Stats.points += 2; // vitória = 2 pontos
            player2Stats.matchesWon++;
          }
        }
      });

      // Ordenar por pontos, depois por saldo de sets
      const groupStandings = Array.from(playerStats.values())
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
        })
        .map((player, index) => ({ ...player, position: index + 1 }));

      standings.push({ group: groupName, standings: groupStandings });
    }

    return standings;
  }

  async createMatchesBulk(matchesToCreate: InsertMatch[]): Promise<Match[]> {
    const newMatches = matchesToCreate.map(match => ({
      ...match,
      id: randomUUID()
    }));
    
    await db.insert(matches).values(newMatches);
    return newMatches as Match[];
  }

  async getMatchesByCategoryPhase(tournamentId: string, categoryId: string, phase: string): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId),
          eq(matches.phase, phase)
        )
      )
      .orderBy(matches.round, matches.matchNumber);
  }

  async getCategoryRounds(tournamentId: string, categoryId: string): Promise<{ round: number; phase: string; matchCount: number }[]> {
    const roundsQuery = await db
      .select({
        round: matches.round,
        phase: matches.phase,
        matchCount: sql<number>`count(*)`
      })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.categoryId, categoryId)
        )
      )
      .groupBy(matches.round, matches.phase)
      .orderBy(matches.round, matches.phase);
    
    return roundsQuery.map(row => ({
      round: row.round,
      phase: row.phase || 'knockout',
      matchCount: Number(row.matchCount)
    }));
  }

  async getMatchesByRound(tournamentId: string, categoryId: string, round: number, phase?: string): Promise<any[]> {
    try {
      console.log('getMatchesByRound called:', { tournamentId, categoryId, round, phase });
      
      // Validar parâmetros
      if (!tournamentId || !categoryId || round === null || round === undefined) {
        console.warn('Invalid parameters for getMatchesByRound:', { tournamentId, categoryId, round, phase });
        return [];
      }
      
      // **SOLUÇÃO TEMPORÁRIA**: usar função existente e filtrar por rodada
      console.log('🔧 USANDO SOLUÇÃO TEMPORÁRIA - função existente + filtro');
      
      // Buscar todas as partidas da categoria (que sabemos que funciona)
      const allMatches = await db
        .select({
          id: matches.id,
          tournamentId: matches.tournamentId,
          categoryId: matches.categoryId,
          round: matches.round,
          phase: matches.phase,
          groupName: matches.groupName,
          matchNumber: matches.matchNumber,
          player1Id: matches.player1Id,
          player2Id: matches.player2Id,
          winnerId: matches.winnerId,
          score: matches.score,
          sets: matches.sets,
          status: matches.status,
          scheduledAt: matches.scheduledAt,
          completedAt: matches.completedAt,
          notes: matches.notes
        })
        .from(matches)
        .where(
          and(
            eq(matches.tournamentId, tournamentId),
            eq(matches.categoryId, categoryId)
          )
        );

      console.log('All category matches found:', allMatches.length);
      
      // Filtrar por rodada e fase no JavaScript (temporário)
      let filteredMatches = allMatches.filter(match => match.round === round);
      
      if (phase) {
        filteredMatches = filteredMatches.filter(match => match.phase === phase);
      }
      
      console.log('Filtered matches for round', round, ':', filteredMatches.length);
      
      if (filteredMatches.length === 0) {
        return [];
      }

      // Buscar dados dos jogadores
      const matchesWithPlayers = await Promise.all(
        filteredMatches.map(async (match) => {
          let player1Data = null;
          let player2Data = null;
          
          // Buscar jogador 1
          if (match.player1Id) {
            try {
              const player1Result = await db
                .select({
                  name: athletes.name,
                  photoUrl: athletes.photoUrl,
                  city: athletes.city,
                  state: athletes.state
                })
                .from(athletes)
                .where(eq(athletes.id, match.player1Id));
              
              player1Data = player1Result[0] || null;
            } catch (err) {
              console.error('Error fetching player1:', err);
            }
          }
          
          // Buscar jogador 2
          if (match.player2Id) {
            try {
              const player2Result = await db
                .select({
                  name: athletes.name,
                  photoUrl: athletes.photoUrl,
                  city: athletes.city,
                  state: athletes.state
                })
                .from(athletes)
                .where(eq(athletes.id, match.player2Id));
              
              player2Data = player2Result[0] || null;
            } catch (err) {
              console.error('Error fetching player2:', err);
            }
          }
          
          return {
            ...match,
            player1Name: player1Data?.name || null,
            player1Photo: player1Data?.photoUrl || null,
            player1City: player1Data?.city || null,
            player1State: player1Data?.state || null,
            player2Name: player2Data?.name || null,
            player2Photo: player2Data?.photoUrl || null,
            player2City: player2Data?.city || null,
            player2State: player2Data?.state || null
          };
        })
      );

      console.log('Final matches with players:', matchesWithPlayers.length);
      return matchesWithPlayers.sort((a, b) => a.matchNumber - b.matchNumber);
      
    } catch (error) {
      console.error('Error in getMatchesByRound:', error);
      return [];
    }
  }

  // Categories
  async getCategory(id: string): Promise<Category | undefined> {
    const results = await db.select().from(categories).where(eq(categories.id, id));
    return results[0];
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory = { ...category, id: randomUUID() };
    await db.insert(categories).values(newCategory);
    return newCategory as Category;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories).set(category).where(eq(categories.id, id));
    return this.getCategory(id);
  }

  async deleteCategory(id: string): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  async getTournamentCategories(tournamentId: string): Promise<Category[]> {
    const results = await db.select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      minAge: categories.minAge,
      maxAge: categories.maxAge,
      gender: categories.gender,
      isActive: categories.isActive,
      format: tournamentCategories.format,
      maxParticipants: tournamentCategories.maxParticipants,
      currentParticipants: tournamentCategories.currentParticipants
    })
    .from(tournamentCategories)
    .innerJoin(categories, eq(tournamentCategories.categoryId, categories.id))
    .where(eq(tournamentCategories.tournamentId, tournamentId));
    
    return results;
  }

  async removeTournamentCategory(tournamentId: string, categoryId: string): Promise<boolean> {
    const result = await db.delete(tournamentCategories)
      .where(and(
        eq(tournamentCategories.tournamentId, tournamentId),
        eq(tournamentCategories.categoryId, categoryId)
      ));
      
    return true;
  }

  async updateTournamentCategory(categoryId: string, updates: { format: string, settings?: string | null }): Promise<Category | undefined> {
    try {
      // Atualizar o formato da categoria no torneio (tabela tournamentCategories)
      const updateData: any = { format: updates.format };
      if (updates.settings !== undefined) {
        updateData.settings = updates.settings;
      }
      
      const [updatedTournamentCategory] = await db.update(tournamentCategories)
        .set(updateData)
        .where(eq(tournamentCategories.categoryId, categoryId))
        .returning();

      if (!updatedTournamentCategory) {
        console.error(`Categoria ${categoryId} não encontrada para atualização`);
        return undefined;
      }

      // Buscar a categoria completa para retornar
      const category = await db.select()
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (!category[0]) {
        console.error(`Categoria ${categoryId} não encontrada`);
        return undefined;
      }

      console.log(`✅ Categoria ${categoryId} atualizada com formato: ${updates.format}`);
      return { ...category[0], format: updates.format } as Category;
    } catch (error) {
      console.error(`Erro ao atualizar categoria ${categoryId}:`, error);
      throw error;
    }
  }

  // Buscar dados específicos de uma categoria no torneio (com formato)
  async getTournamentCategory(tournamentId: string, categoryId: string): Promise<any> {
    const results = await db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        createdAt: categories.createdAt,
        minAge: categories.minAge,
        maxAge: categories.maxAge,
        gender: categories.gender,
        isActive: categories.isActive,
        format: tournamentCategories.format,
        maxParticipants: tournamentCategories.maxParticipants,
        currentParticipants: tournamentCategories.currentParticipants
      })
      .from(tournamentCategories)
      .innerJoin(categories, eq(tournamentCategories.categoryId, categories.id))
      .where(
        and(
          eq(tournamentCategories.tournamentId, tournamentId),
          eq(tournamentCategories.categoryId, categoryId)
        )
      );
    
    return results[0];
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const results = await db.select().from(payments).where(eq(payments.id, id));
    return results[0];
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.dueDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment = { ...payment, id: randomUUID() };
    await db.insert(payments).values(newPayment);
    return newPayment as Payment;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    await db.update(payments).set(payment).where(eq(payments.id, id));
    return this.getPayment(id);
  }

  async deletePayment(id: string): Promise<boolean> {
    await db.delete(payments).where(eq(payments.id, id));
    return true;
  }

  // Revenues
  async getRevenue(id: string): Promise<Revenue | undefined> {
    const results = await db.select().from(revenues).where(eq(revenues.id, id));
    return results[0];
  }

  async getAllRevenues(): Promise<Revenue[]> {
    return await db.select().from(revenues).orderBy(desc(revenues.date));
  }

  async createRevenue(revenue: InsertRevenue): Promise<Revenue> {
    const newRevenue = { 
      ...revenue, 
      id: randomUUID(),
      amount: typeof revenue.amount === 'number' ? revenue.amount.toString() : revenue.amount
    };
    await db.insert(revenues).values(newRevenue);
    return newRevenue as Revenue;
  }

  async updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const updateData: any = { ...revenue };
    if (revenue.amount !== undefined) {
      updateData.amount = typeof revenue.amount === 'number' ? revenue.amount.toString() : revenue.amount;
    }
    await db.update(revenues).set(updateData).where(eq(revenues.id, id));
    return this.getRevenue(id);
  }

  async deleteRevenue(id: string): Promise<boolean> {
    await db.delete(revenues).where(eq(revenues.id, id));
    return true;
  }

  // Expenses
  async getExpense(id: string): Promise<Expense | undefined> {
    const results = await db.select().from(expenses).where(eq(expenses.id, id));
    return results[0];
  }

  async getAllExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const newExpense = { 
      ...expense, 
      id: randomUUID(),
      amount: typeof expense.amount === 'number' ? expense.amount.toString() : expense.amount
    };
    await db.insert(expenses).values(newExpense);
    return newExpense as Expense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const updateData: any = { ...expense };
    if (expense.amount !== undefined) {
      updateData.amount = typeof expense.amount === 'number' ? expense.amount.toString() : expense.amount;
    }
    await db.update(expenses).set(updateData).where(eq(expenses.id, id));
    return this.getExpense(id);
  }

  async deleteExpense(id: string): Promise<boolean> {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }

  // Ranking Seasons
  async getRankingSeason(athleteId: string, categoryId: string, season: number): Promise<RankingSeason | undefined> {
    const results = await db.select().from(rankingSeasons)
      .where(and(
        eq(rankingSeasons.athleteId, athleteId),
        eq(rankingSeasons.categoryId, categoryId),
        eq(rankingSeasons.season, season)
      ));
    return results[0];
  }

  async getRankingsByCategory(categoryId: string, season: number): Promise<RankingSeason[]> {
    return await db.select().from(rankingSeasons)
      .where(and(
        eq(rankingSeasons.categoryId, categoryId),
        eq(rankingSeasons.season, season)
      ))
      .orderBy(asc(rankingSeasons.position));
  }

  async createOrUpdateRankingSeason(ranking: InsertRankingSeason): Promise<RankingSeason> {
    const existing = await this.getRankingSeason(ranking.athleteId, ranking.categoryId, ranking.season);
    
    if (existing) {
      await db.update(rankingSeasons)
        .set({ ...ranking, updatedAt: new Date() })
        .where(eq(rankingSeasons.id, existing.id));
      return { ...existing, ...ranking } as RankingSeason;
    } else {
      const newRanking = { ...ranking, id: randomUUID() };
      await db.insert(rankingSeasons).values(newRanking);
      return newRanking as RankingSeason;
    }
  }

  async getAvailableSeasons(): Promise<number[]> {
    const results = await db.selectDistinct({ season: rankingSeasons.season })
      .from(rankingSeasons)
      .orderBy(desc(rankingSeasons.season));
    return results.map(r => r.season);
  }

  // Consents
  async getConsent(athleteId: string): Promise<Consent | undefined> {
    const results = await db.select().from(consents).where(eq(consents.athleteId, athleteId));
    return results[0];
  }

  async getAllConsents(): Promise<Consent[]> {
    return await db.select().from(consents).orderBy(desc(consents.createdAt));
  }

  async createConsent(consent: InsertConsent): Promise<Consent> {
    const newConsent = { ...consent, id: randomUUID() };
    await db.insert(consents).values(newConsent);
    return newConsent as Consent;
  }

  async updateConsent(id: string, consent: Partial<InsertConsent>): Promise<Consent | undefined> {
    await db.update(consents).set(consent).where(eq(consents.id, id));
    const results = await db.select().from(consents).where(eq(consents.id, id));
    return results[0];
  }

  async deleteConsent(id: string): Promise<boolean> {
    await db.delete(consents).where(eq(consents.id, id));
    return true;
  }

  // External Links
  async getExternalLink(id: string): Promise<ExternalLink | undefined> {
    const results = await db.select().from(externalLinks).where(eq(externalLinks.id, id));
    return results[0];
  }

  async getExternalLinkByShortCode(shortCode: string): Promise<ExternalLink | undefined> {
    const results = await db.select().from(externalLinks).where(eq(externalLinks.shortCode, shortCode));
    return results[0];
  }

  async getAllExternalLinks(): Promise<ExternalLink[]> {
    return await db.select().from(externalLinks).orderBy(desc(externalLinks.createdAt));
  }

  async createExternalLink(link: InsertExternalLink): Promise<ExternalLink> {
    // Gerar código único curto
    const shortCode = this.generateShortCode();
    const newLink = { 
      ...link, 
      id: randomUUID(), 
      shortCode,
      accessCount: 0
    };
    await db.insert(externalLinks).values(newLink);
    return newLink as ExternalLink;
  }

  async updateExternalLink(id: string, link: Partial<InsertExternalLink>): Promise<ExternalLink | undefined> {
    const updateData = { ...link, updatedAt: new Date() };
    await db.update(externalLinks).set(updateData).where(eq(externalLinks.id, id));
    return this.getExternalLink(id);
  }

  async deleteExternalLink(id: string): Promise<boolean> {
    await db.delete(externalLinks).where(eq(externalLinks.id, id));
    return true;
  }

  async incrementLinkAccess(shortCode: string): Promise<void> {
    await db.update(externalLinks)
      .set({ 
        accessCount: sql`${externalLinks.accessCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(externalLinks.shortCode, shortCode));
  }

  // Função auxiliar para gerar códigos únicos curtos
  private generateShortCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Assets (Controle Patrimonial)
  private async generateAssetCode(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PAT-${currentYear}-`;
    
    // Busca o último código do ano atual
    const latestAssets = await db.select()
      .from(assets)
      .where(sql`asset_code LIKE ${prefix + '%'}`)
      .orderBy(desc(assets.assetCode))
      .limit(1);
    
    let nextNumber = 1;
    if (latestAssets.length > 0) {
      const lastCode = latestAssets[0].assetCode;
      const numberPart = lastCode.split('-').pop();
      if (numberPart) {
        nextNumber = parseInt(numberPart) + 1;
      }
    }
    
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const results = await db.select().from(assets).where(eq(assets.id, id));
    return results[0];
  }

  async getAllAssets(): Promise<Asset[]> {
    return await db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getActiveAssets(): Promise<Asset[]> {
    return await db.select().from(assets)
      .where(eq(assets.isActive, true))
      .orderBy(desc(assets.createdAt));
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    try {
      const assetCode = await this.generateAssetCode();
      const newAsset = { 
        ...asset, 
        id: randomUUID(),
        assetCode,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(assets).values(newAsset);
      return newAsset as Asset;
    } catch (error) {
      console.error("Error in createAsset:", error);
      throw error;
    }
  }

  async updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    await db.update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id));
    return this.getAsset(id);
  }

  async deleteAsset(id: string): Promise<boolean> {
    await db.delete(assets).where(eq(assets.id, id));
    return true;
  }

  async inactivateAsset(id: string): Promise<Asset | undefined> {
    await db.update(assets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(assets.id, id));
    return this.getAsset(id);
  }

  async activateAsset(id: string): Promise<Asset | undefined> {
    await db.update(assets)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(assets.id, id));
    return this.getAsset(id);
  }

  async getAssetsByCategory(category: string): Promise<Asset[]> {
    return await db.select().from(assets)
      .where(and(eq(assets.category, category), eq(assets.isActive, true)))
      .orderBy(desc(assets.createdAt));
  }

  async getAssetsBySituation(situation: string): Promise<Asset[]> {
    return await db.select().from(assets)
      .where(and(eq(assets.situation, situation), eq(assets.isActive, true)))
      .orderBy(desc(assets.createdAt));
  }

  // System Settings
  async getSystemSetting(key: string): Promise<any> {
    const results = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return results[0];
  }

  async getAllSystemSettings(): Promise<any[]> {
    return await db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  }

  async createOrUpdateSystemSetting(key: string, value?: string, fileUrl?: string, description?: string, category?: string): Promise<any> {
    const existing = await this.getSystemSetting(key);
    
    const settingData = {
      key,
      value: value || null,
      fileUrl: fileUrl || null,
      description: description || null,
      category: category || 'general',
      updatedAt: new Date()
    };

    if (existing) {
      // Atualizar existente
      await db.update(systemSettings)
        .set(settingData)
        .where(eq(systemSettings.key, key));
      return await this.getSystemSetting(key);
    } else {
      // Criar novo
      const newSetting = {
        ...settingData,
        id: randomUUID(),
        createdAt: new Date()
      };
      await db.insert(systemSettings).values(newSetting);
      return newSetting;
    }
  }

  async deleteSystemSetting(key: string): Promise<boolean> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
    return true;
  }

  // ===============================
  // TEAM MANAGEMENT METHODS  
  // ===============================

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const results = await db.select().from(teams).where(eq(teams.id, id));
    return results[0];
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(asc(teams.name));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    try {
      const newTeam = { ...team, id: randomUUID() };
      await db.insert(teams).values(newTeam);
      return newTeam as Team;
    } catch (error) {
      console.error("Error in createTeam:", error);
      throw error;
    }
  }

  async updateTeam(id: string, team: Partial<InsertTeam>): Promise<Team | undefined> {
    try {
      await db.update(teams).set(team).where(eq(teams.id, id));
      return await this.getTeam(id);
    } catch (error) {
      console.error("Error in updateTeam:", error);
      throw error;
    }
  }

  async deleteTeam(id: string): Promise<boolean> {
    try {
      // Primeiro, remover todos os membros da equipe
      await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
      // Depois, remover a equipe
      await db.delete(teams).where(eq(teams.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteTeam:", error);
      return false;
    }
  }

  // Team Members
  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const results = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return results[0];
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId)).orderBy(asc(teamMembers.boardOrder));
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    try {
      const newMember = { ...member, id: randomUUID() };
      await db.insert(teamMembers).values(newMember);
      return newMember as TeamMember;
    } catch (error) {
      console.error("Error in createTeamMember:", error);
      throw error;
    }
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    try {
      await db.update(teamMembers).set(member).where(eq(teamMembers.id, id));
      return await this.getTeamMember(id);
    } catch (error) {
      console.error("Error in updateTeamMember:", error);
      throw error;
    }
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    try {
      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteTeamMember:", error);
      return false;
    }
  }

  async getTeamMembersWithAthletes(teamId: string): Promise<(TeamMember & { athlete: Athlete })[]> {
    try {
      console.log("\ud83d\udd0d DEBUG STORAGE - getTeamMembersWithAthletes teamId:", teamId);
      
      // Primeiro, verificar quantos membros existem para a equipe
      const rawMembers = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
      console.log("\ud83d\udd0d DEBUG STORAGE - Membros na tabela team_members:", rawMembers.length);
      console.log("\ud83d\udd0d DEBUG STORAGE - Dados dos membros:", JSON.stringify(rawMembers, null, 2));
      
      const results = await db
        .select({
          id: teamMembers.id,
          teamId: teamMembers.teamId,
          athleteId: teamMembers.athleteId,
          boardOrder: teamMembers.boardOrder,
          isCaptain: teamMembers.isCaptain,
          createdAt: teamMembers.createdAt,
          athlete: athletes
        })
        .from(teamMembers)
        .innerJoin(athletes, eq(teamMembers.athleteId, athletes.id))
        .where(eq(teamMembers.teamId, teamId))
        .orderBy(asc(teamMembers.boardOrder));
      
      console.log("\ud83d\udd0d DEBUG STORAGE - Resultado do JOIN:", results.length);
      console.log("\ud83d\udd0d DEBUG STORAGE - Dados do JOIN:", JSON.stringify(results, null, 2));
      
      return results as (TeamMember & { athlete: Athlete })[];
    } catch (error) {
      console.error("\u274c Error in getTeamMembersWithAthletes:", error);
      throw error;
    }
  }

  // Tournament Teams
  async getTournamentTeam(id: string): Promise<TournamentTeam | undefined> {
    const results = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, id));
    return results[0];
  }

  async getTournamentTeams(tournamentId: string, categoryId?: string): Promise<TournamentTeam[]> {
    let query = db.select().from(tournamentTeams).where(eq(tournamentTeams.tournamentId, tournamentId));
    
    if (categoryId) {
      query = query.where(and(eq(tournamentTeams.tournamentId, tournamentId), eq(tournamentTeams.categoryId, categoryId)));
    }
    
    return await query.orderBy(asc(tournamentTeams.registeredAt));
  }

  async createTournamentTeam(tournamentTeam: InsertTournamentTeam): Promise<TournamentTeam> {
    try {
      const newTournamentTeam = { ...tournamentTeam, id: randomUUID() };
      await db.insert(tournamentTeams).values(newTournamentTeam);
      return newTournamentTeam as TournamentTeam;
    } catch (error) {
      console.error("Error in createTournamentTeam:", error);
      throw error;
    }
  }

  async updateTournamentTeam(id: string, tournamentTeam: Partial<InsertTournamentTeam>): Promise<TournamentTeam | undefined> {
    try {
      await db.update(tournamentTeams).set(tournamentTeam).where(eq(tournamentTeams.id, id));
      return await this.getTournamentTeam(id);
    } catch (error) {
      console.error("Error in updateTournamentTeam:", error);
      throw error;
    }
  }

  async deleteTournamentTeam(id: string): Promise<boolean> {
    try {
      await db.delete(tournamentTeams).where(eq(tournamentTeams.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteTournamentTeam:", error);
      return false;
    }
  }

  async getTeamsByTournamentCategory(tournamentId: string, categoryId: string): Promise<(TournamentTeam & { team: Team })[]> {
    try {
      const results = await db
        .select({
          id: tournamentTeams.id,
          tournamentId: tournamentTeams.tournamentId,
          categoryId: tournamentTeams.categoryId,
          teamId: tournamentTeams.teamId,
          groupLabel: tournamentTeams.groupLabel,
          seed: tournamentTeams.seed,
          registeredAt: tournamentTeams.registeredAt,
          team: teams
        })
        .from(tournamentTeams)
        .innerJoin(teams, eq(tournamentTeams.teamId, teams.id))
        .where(and(eq(tournamentTeams.tournamentId, tournamentId), eq(tournamentTeams.categoryId, categoryId)))
        .orderBy(asc(tournamentTeams.registeredAt));
      
      return results as (TournamentTeam & { team: Team })[];
    } catch (error) {
      console.error("Error in getTeamsByTournamentCategory:", error);
      throw error;
    }
  }

  // Team Ties  
  async getTeamTie(id: string): Promise<TeamTie | undefined> {
    const results = await db.select().from(teamTies).where(eq(teamTies.id, id));
    return results[0];
  }

  async getTeamTies(tournamentId: string, categoryId?: string): Promise<TeamTie[]> {
    let query = db.select().from(teamTies).where(eq(teamTies.tournamentId, tournamentId));
    
    if (categoryId) {
      query = query.where(and(eq(teamTies.tournamentId, tournamentId), eq(teamTies.categoryId, categoryId)));
    }
    
    return await query.orderBy(asc(teamTies.createdAt));
  }

  async createTeamTie(tie: InsertTeamTie): Promise<TeamTie> {
    try {
      const newTie = { ...tie, id: randomUUID() };
      await db.insert(teamTies).values(newTie);
      return newTie as TeamTie;
    } catch (error) {
      console.error("Error in createTeamTie:", error);
      throw error;
    }
  }

  async updateTeamTie(id: string, tie: Partial<InsertTeamTie>): Promise<TeamTie | undefined> {
    try {
      await db.update(teamTies).set(tie).where(eq(teamTies.id, id));
      return await this.getTeamTie(id);
    } catch (error) {
      console.error("Error in updateTeamTie:", error);
      throw error;
    }
  }

  async deleteTeamTie(id: string): Promise<boolean> {
    try {
      // Remove matches relacionadas primeiro
      await db.delete(matches).where(eq(matches.tieId, id));
      // Remove o confronto
      await db.delete(teamTies).where(eq(teamTies.id, id));
      return true;
    } catch (error) {
      console.error("Error in deleteTeamTie:", error);
      return false;
    }
  }

  async getTiesByCategoryPhase(tournamentId: string, categoryId: string, phase: string): Promise<TeamTie[]> {
    return await db
      .select()
      .from(teamTies)
      .where(and(
        eq(teamTies.tournamentId, tournamentId),
        eq(teamTies.categoryId, categoryId),
        eq(teamTies.phase, phase)
      ))
      .orderBy(asc(teamTies.round));
  }

  async updateTieScoreFromChildMatches(tieId: string): Promise<TeamTie | undefined> {
    try {
      // Buscar todas as partidas relacionadas ao confronto
      const tieMatches = await db.select().from(matches).where(eq(matches.tieId, tieId));
      
      // Buscar dados do confronto
      const tie = await this.getTeamTie(tieId);
      if (!tie) return undefined;

      let team1Points = 0;
      let team2Points = 0;

      // Calcular pontos baseado nas vitórias
      for (const match of tieMatches) {
        if (match.status === 'completed' && match.winnerId) {
          // Verificar qual equipe o vencedor pertence
          const team1Members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, tie.team1Id));
          const team2Members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, tie.team2Id));
          
          const isTeam1Winner = team1Members.some(member => member.athleteId === match.winnerId);
          const isTeam2Winner = team2Members.some(member => member.athleteId === match.winnerId);
          
          if (isTeam1Winner) {
            team1Points += tie.pointsPerWin;
          } else if (isTeam2Winner) {
            team2Points += tie.pointsPerWin;
          }
        }
      }

      // Determinar vencedor
      let winnerTeamId: string | null = null;
      if (team1Points > team2Points) {
        winnerTeamId = tie.team1Id;
      } else if (team2Points > team1Points) {
        winnerTeamId = tie.team2Id;
      }

      // Atualizar confronto
      const updatedTie = await this.updateTeamTie(tieId, {
        team1Points,
        team2Points,
        winnerTeamId,
        status: winnerTeamId ? 'completed' : 'in_progress'
      });

      return updatedTie;
    } catch (error) {
      console.error("Error in updateTieScoreFromChildMatches:", error);
      throw error;
    }
  }

  async computeTeamGroupStandings(tournamentId: string, categoryId: string): Promise<{group: string, standings: any[]}[]> {
    try {
      // Buscar todos os confrontos da fase de grupos
      const groupTies = await this.getTiesByCategoryPhase(tournamentId, categoryId, 'group');
      
      // Agrupar por grupo
      const groups = [...new Set(groupTies.map(tie => tie.groupLabel).filter(Boolean))];
      
      const result = [];
      
      for (const group of groups) {
        const groupTiesFiltered = groupTies.filter(tie => tie.groupLabel === group);
        const teamStats: { [teamId: string]: any } = {};
        
        // Inicializar stats das equipes
        for (const tie of groupTiesFiltered) {
          if (!teamStats[tie.team1Id]) {
            teamStats[tie.team1Id] = { teamId: tie.team1Id, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
          }
          if (!teamStats[tie.team2Id]) {
            teamStats[tie.team2Id] = { teamId: tie.team2Id, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
          }
        }
        
        // Processar confrontos completos
        for (const tie of groupTiesFiltered) {
          if (tie.status === 'completed') {
            teamStats[tie.team1Id].played += 1;
            teamStats[tie.team2Id].played += 1;
            teamStats[tie.team1Id].pointsFor += tie.team1Points;
            teamStats[tie.team1Id].pointsAgainst += tie.team2Points;
            teamStats[tie.team2Id].pointsFor += tie.team2Points;
            teamStats[tie.team2Id].pointsAgainst += tie.team1Points;
            
            if (tie.winnerTeamId === tie.team1Id) {
              teamStats[tie.team1Id].won += 1;
              teamStats[tie.team2Id].lost += 1;
            } else if (tie.winnerTeamId === tie.team2Id) {
              teamStats[tie.team2Id].won += 1;
              teamStats[tie.team1Id].lost += 1;
            }
          }
        }
        
        // Ordenar por vitórias, depois por diferença de pontos
        const standings = Object.values(teamStats).sort((a: any, b: any) => {
          if (b.won !== a.won) return b.won - a.won;
          return (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst);
        });
        
        result.push({ group, standings });
      }
      
      return result;
    } catch (error) {
      console.error("Error in computeTeamGroupStandings:", error);
      throw error;
    }
  }

  async createTieWithChildren(tie: InsertTeamTie, matches: InsertMatch[]): Promise<{ tie: TeamTie, matches: Match[] }> {
    try {
      // Criar o confronto
      const createdTie = await this.createTeamTie(tie);
      
      // Criar as partidas filhas com tieId
      const matchesWithTieId = matches.map(match => ({
        ...match,
        tieId: createdTie.id
      }));
      
      const createdMatches = await this.createMatchesBulk(matchesWithTieId);
      
      return { tie: createdTie, matches: createdMatches };
    } catch (error) {
      console.error("Error in createTieWithChildren:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();