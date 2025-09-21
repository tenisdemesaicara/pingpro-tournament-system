import { type Athlete, type InsertAthlete, type Tournament, type InsertTournament, type TournamentParticipant, type InsertTournamentParticipant, type Match, type InsertMatch, type Community, type InsertCommunity, type Category, type InsertCategory, type TournamentWithParticipants, type AthleteWithStats, type EligibleAthlete, type TournamentCategory, type InsertTournamentCategory, type Payment, type InsertPayment, type Revenue, type InsertRevenue, type Expense, type InsertExpense, type SystemSetting, type InsertSystemSetting } from "@shared/schema";

export interface IStorage {
  // Athletes
  getAthlete(id: string): Promise<Athlete | undefined>;
  getAthleteByEmail(email: string): Promise<Athlete | undefined>;
  getAthleteByCpf(cpf: string): Promise<Athlete | undefined>;
  getAthleteByRg(rg: string): Promise<Athlete | undefined>;
  getAllAthletes(): Promise<Athlete[]>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(id: string, athlete: Partial<InsertAthlete>): Promise<Athlete | undefined>;
  deleteAthlete(id: string): Promise<boolean>;
  getAthletesByRanking(limit?: number): Promise<AthleteWithStats[]>;
  getAthletesByRankingApproved(limit?: number): Promise<AthleteWithStats[]>;
  getAthletesByRankingAndCategory(categoryName: string, limit?: number): Promise<AthleteWithStats[]>;
  getAthletesByStatus(status: string): Promise<Athlete[]>;
  updateAthleteStatus(id: string, status: string, reason?: string): Promise<Athlete | undefined>;

  // Tournaments
  getTournament(id: string): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  getTournamentsByStatus(status: string): Promise<Tournament[]>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, tournament: Partial<InsertTournament>): Promise<Tournament | undefined>;
  deleteTournament(id: string): Promise<boolean>;
  getTournamentWithParticipants(id: string): Promise<TournamentWithParticipants | undefined>;

  // Tournament Participants
  addParticipant(participant: InsertTournamentParticipant): Promise<TournamentParticipant>;
  removeParticipant(tournamentId: string, athleteId: string): Promise<boolean>;
  getTournamentParticipants(tournamentId: string): Promise<Athlete[]>;
  getTournamentParticipantsWithCategories(tournamentId: string): Promise<any[]>;

  // Matches
  getMatch(id: string): Promise<Match | undefined>;
  getTournamentMatches(tournamentId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, match: Partial<InsertMatch>): Promise<Match | undefined>;
  deleteMatch(id: string): Promise<boolean>;
  deleteMatchesByTournament(tournamentId: string): Promise<boolean>;

  // Communities
  getCommunity(id: string): Promise<Community | undefined>;
  getAllCommunities(): Promise<Community[]>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  updateCommunity(id: string, community: Partial<InsertCommunity>): Promise<Community | undefined>;
  deleteCommunity(id: string): Promise<boolean>;

  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Tournament Categories
  addTournamentCategory(tournamentCategory: InsertTournamentCategory): Promise<TournamentCategory>;
  getTournamentCategories(tournamentId: string): Promise<Category[]>;
  getTournamentCategoryLimit(tournamentId: string, categoryId: string): Promise<TournamentCategory | undefined>;
  updateTournamentCategoryLimit(tournamentId: string, categoryId: string, maxParticipants: number): Promise<boolean>;
  setTournamentCategoryFormat(tournamentId: string, categoryId: string, format: string): Promise<boolean>;
  removeTournamentCategory(tournamentId: string, categoryId: string): Promise<boolean>;

  // Athlete Eligibility
  getEligibleAthletes(categoryIds: string[], currentYear?: number): Promise<EligibleAthlete[]>;
  calculateAge(birthDate: string, currentYear?: number): number;
  isAthleteEligibleForCategory(athlete: Athlete, category: Category, currentYear?: number): boolean;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  getPaymentsByAthlete(athleteId: string): Promise<Payment[]>;
  getPaymentsByTournament(tournamentId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;

  // Revenues
  getRevenue(id: string): Promise<Revenue | undefined>;
  getAllRevenues(): Promise<Revenue[]>;
  getRevenuesByCategory(category: string): Promise<Revenue[]>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  updateRevenue(id: string, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined>;
  deleteRevenue(id: string): Promise<boolean>;

  // Expenses
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByCategory(category: string): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Image Management
  saveUploadedImage(filename: string, originalName: string, size: number, mimeType: string): Promise<string>;
  getUploadedImage(filename: string): Promise<{ filename: string; originalName: string; uploadedAt: Date } | undefined>;
  deleteUploadedImage(filename: string): Promise<boolean>;

  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  createOrUpdateSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<boolean>;
}