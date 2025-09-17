import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Atletas
export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  birthDate: text("birth_date").notNull(),
  cpf: text("cpf").unique(),
  rg: text("rg"),
  
  // Endereco completo  
  street: text("street"),
  neighborhood: text("neighborhood").notNull(),
  zipCode: text("zip_code").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  complement: text("complement"),
  
  club: text("club"),
  category: text("category"), // A, B, C, D, Iniciante - agora opcional, definida na inscrição do torneio
  gender: text("gender").notNull(), // masculino, feminino
  ranking: integer("ranking").default(1000),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  points: integer("points").default(0), // Pontuação acumulada pelo atleta
  
  // Foto e observacoes
  photoUrl: text("photo_url"), // Obrigatória apenas no frontend para novos cadastros
  observations: text("observations"),
  
  // Status de aprovação
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  type: text("type").notNull().default("atleta"), // "atleta" ou "associado"
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Torneios
export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, registration_open, in_progress, ready_to_finish, completed
  maxParticipants: integer("max_participants"), // Agora opcional - pode ser nulo
  currentParticipants: integer("current_participants").default(0),
  coverImage: text("cover_image"), // URL da imagem de capa do torneio
  registrationDeadline: timestamp("registration_deadline"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  organizer: text("organizer").notNull(),
  season: text("season").notNull(), // 2024, 2025, etc
  prizePool: text("prize_pool"),
  rules: text("rules"),
  format: text("format").default("single_elimination"), // Formato do torneio
  isPublic: boolean("is_public").default(true),
  
  // Sistema de pontuação avançado
  scoringSystem: json("scoring_system"), // Configurações do sistema de pontuação
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Categorias de torneios (relacionamento N:N)
export const tournamentCategories = pgTable("tournament_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  categoryId: varchar("category_id").notNull(),
  format: text("format").notNull().default("single_elimination"), // formato específico desta categoria
  maxParticipants: integer("max_participants"), // Limite opcional por categoria
  currentParticipants: integer("current_participants").default(0), // Contador de participantes por categoria
  createdAt: timestamp("created_at").defaultNow(),
});

// Participações em torneios
export const tournamentParticipants = pgTable("tournament_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  athleteId: varchar("athlete_id").notNull(),
  categoryId: varchar("category_id").notNull(), // categoria específica da inscrição
  registrationNumber: varchar("registration_number"), // Número único de inscrição por torneio
  seed: integer("seed"),
  registeredAt: timestamp("registered_at").defaultNow(),
});

// Partidas
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  categoryId: varchar("category_id").notNull(), // ADICIONADO: categoria específica da partida
  round: integer("round").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: varchar("player1_id"),
  player2Id: varchar("player2_id"),
  winnerId: varchar("winner_id"),
  score: text("score"), // formato: "3-1" ou "11-9,11-7,9-11,11-5"
  status: text("status").default("pending"), // pending, in_progress, completed, walkover
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  phase: text("phase").default("knockout"), // Fases: group, round_of_32, round_of_16, quarterfinal, semifinal, final
  groupName: text("group_name"), // Nova coluna: A, B, C, etc.
  bestOfSets: integer("best_of_sets").notNull().default(3), // Melhor de X sets (padrão: melhor de 3)
  sets: json("sets"), // Detalhes dos sets: [{ setNumber: 1, player1Score: 11, player2Score: 9 }, ...]
  needsAttention: boolean("needs_attention").default(false), // Indica se a partida precisa de atenção após alteração de resultado anterior
  tableNumber: integer("table_number").default(1), // Número da mesa (editável)
  
  // CAMPOS PARA BRACKET - Sistema de chaveamento
  player1Source: text("player1_source"), // "1º A", "Vencedor Partida #3", etc.
  player2Source: text("player2_source"), // "2º B", "Vencedor Partida #4", etc.
  nextMatchId: varchar("next_match_id"), // ID da próxima partida onde o vencedor vai
  nextMatchSlot: integer("next_match_slot"), // 1 ou 2 - qual slot o vencedor ocupará na próxima partida
});

// Categorias
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  gender: text("gender").notNull(), // masculino, feminino
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comunidades/Clubes
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  contact: text("contact"),
  website: text("website"),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Esquemas de validação
export const insertAthleteSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.string().min(1, "Sexo é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  zipCode: z.string().min(8, "CEP é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  // Campos opcionais
  cpf: z.string().optional(),
  rg: z.string().optional(),
  photoUrl: z.string().optional(),
  category: z.string().optional(),
  street: z.string().optional(),
  phone: z.string().optional(),
  complement: z.string().optional(),
  club: z.string().optional(),
  observations: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  currentParticipants: true,
  createdAt: true,
}).extend({
  categoryIds: z.array(z.string()).optional(),
  categoryLimits: z.record(z.number()).optional(), // Limites por categoria (opcional)
  categoryFormats: z.record(z.string()).optional(), // Formatos por categoria (opcional) 
  registrationDeadline: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  // Categorias a serem criadas junto com o torneio
  categories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    minAge: z.number().nullable().optional(),
    maxAge: z.number().nullable().optional(),
    gender: z.string(),
    isActive: z.boolean().default(true),
    participantLimit: z.number().optional(),
    format: z.string().optional(),
  })).optional(),
});

export const insertTournamentCategorySchema = createInsertSchema(tournamentCategories).omit({
  id: true,
  currentParticipants: true,
  createdAt: true,
});

export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({
  id: true,
  registeredAt: true,
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  completedAt: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  memberCount: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
}).refine(data => data.name && data.name.trim().length > 0, {
  message: "Nome da categoria é obrigatório",
  path: ["name"]
});

// Pagamentos/Mensalidades
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  paymentDate: date("payment_date"),
  status: text("status").notNull().default("pending"), // pending, paid, overdue
  description: text("description"),
  paymentMethod: text("payment_method"), // dinheiro, pix, cartao, transferencia
  reference: text("reference"), // mês/ano ou descrição da cobrança
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().min(1, "Valor é obrigatório"),
  dueDate: z.string().min(1, "Data de vencimento é obrigatória"),
  reference: z.string().min(1, "Referência é obrigatória"),
});

// Receitas
export const revenues = pgTable("revenues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // mensalidade, taxa_inscricao, patrocinio, outros
  paymentMethod: text("payment_method"), // dinheiro, pix, cartao, transferencia
  athleteId: varchar("athlete_id").references(() => athletes.id), // opcional, para receitas vinculadas a atletas
  paymentId: varchar("payment_id").references(() => payments.id), // referência ao pagamento que gerou esta receita
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Despesas
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // material, equipamento, local, alimentacao, transporte, outros
  paymentMethod: text("payment_method"), // dinheiro, pix, cartao, transferencia
  supplier: text("supplier"), // fornecedor/prestador de serviço
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRevenueSchema = createInsertSchema(revenues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  }).refine((val) => val > 0, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  }).refine((val) => val > 0, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Data é obrigatória"),
  description: z.string().min(1, "Descrição é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

// Tipos
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;
export type Athlete = typeof athletes.$inferSelect;

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

export type InsertTournamentCategory = z.infer<typeof insertTournamentCategorySchema>;
export type TournamentCategory = typeof tournamentCategories.$inferSelect;

export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenues.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Schema para auto cadastro de atletas (sem alguns campos administrativos)
export const selfRegistrationAthleteSchema = z.object({
  // Campos obrigatórios para auto-cadastro
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.enum(["M", "F"], { required_error: "Gênero é obrigatório" }),
  address: z.string().min(1, "Endereço é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  zipCode: z.string().min(8, "CEP é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  category: z.string().optional(), // Será definido automaticamente como "Iniciante"
  
  // Campos opcionais
  cpf: z.string().optional(),
  rg: z.string().optional(),
  street: z.string().optional(),
  photoUrl: z.string().optional(),
  observations: z.string().optional(),
});

export type SelfRegistrationAthlete = z.infer<typeof selfRegistrationAthleteSchema>;

// Tipos derivados para APIs
export type TournamentWithParticipants = Tournament & {
  participants: Athlete[];
  matches: Match[];
  categories: Category[];
};

export type TournamentWithCategories = Tournament & {
  categories: Category[];
};

export type EligibleAthlete = Athlete & {
  eligibleCategories: Category[];
  canRegisterInAbsoluto: boolean;
};

export type TournamentParticipantWithAthlete = TournamentParticipant & {
  name: string;
  email: string;
  birthDate: string;
  gender: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  state: string;
  category: string | null;
  cpf: string | null;
  rg: string | null;
  photoUrl: string | null;
  street: string | null;
  phone: string | null;
  complement: string | null;
  club: string | null;
  observations: string | null;
  status: string;
  type: string;
  createdAt: Date | null;
};

export type AthleteWithStats = Athlete & {
  points: number;
  wins: number;
  losses: number;
  winRate: number;
  totalMatches: number;
  previousPosition?: number;
  recentMatches: Match[];
};

// Tabela de imagens carregadas
export const uploadedImages = pgTable("uploaded_images", {
  fileName: text("file_name").primaryKey(),
  data: text("data").notNull(), // Base64 encoded image data
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});

export type UploadedImage = typeof uploadedImages.$inferSelect;

// Temporadas/Rankings anuais
export const rankingSeasons = pgTable("ranking_seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  season: integer("season").notNull(), // Ano da temporada (2025, 2026, etc)
  position: integer("position").notNull(), // Posição no ranking
  previousPosition: integer("previous_position"), // Posição anterior para cálculo de mudança
  points: integer("points").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default("0.00"),
  totalMatches: integer("total_matches").default(0),
  eligibleByAge: boolean("eligible_by_age").default(false), // Elegível por idade
  eligibleByParticipation: boolean("eligible_by_participation").default(false), // Elegível por participação (absolutos)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRankingSeasonSchema = createInsertSchema(rankingSeasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRankingSeason = z.infer<typeof insertRankingSeasonSchema>;
export type RankingSeason = typeof rankingSeasons.$inferSelect;

// Consentimentos LGPD e Assinaturas Digitais
export const consents = pgTable("consents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteId: varchar("athlete_id").notNull().references(() => athletes.id),
  
  // Dados do usuário que está assinando
  birthDate: text("birth_date").notNull(),
  isMinor: boolean("is_minor").notNull().default(false),
  
  // Consentimentos aceitos
  lgpdConsent: boolean("lgpd_consent").notNull().default(false),
  imageRightsConsent: boolean("image_rights_consent").notNull().default(false),
  termsConsent: boolean("terms_consent").notNull().default(false),
  
  // Assinatura digital (base64 dataURL)
  signature: text("signature").notNull(), // Imagem da assinatura em base64
  signerName: text("signer_name").notNull(), // Nome de quem assinou
  
  // Dados do responsável legal (para menores de idade)
  parentName: text("parent_name"), // Nome do pai/mãe/responsável
  parentCpf: text("parent_cpf"), // CPF do responsável
  parentEmail: text("parent_email"), // Email do responsável
  parentRelationship: text("parent_relationship"), // Grau de parentesco
  
  // Metadados
  consentTimestamp: timestamp("consent_timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"), // IP de onde veio o consentimento
  userAgent: text("user_agent"), // Navegador usado
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConsentSchema = createInsertSchema(consents).omit({
  id: true,
  createdAt: true,
});

export type InsertConsent = z.infer<typeof insertConsentSchema>;
export type Consent = typeof consents.$inferSelect;

// Tournament registration validation schema
export const tournamentRegistrationSchema = z.object({
  // Tournament and participation data
  tournamentId: z.string().uuid("ID do torneio inválido"),
  category: z.string().uuid("ID da categoria inválido"), // This is actually categoryId
  athleteId: z.string().uuid().nullish(), // For existing athletes - allows null/undefined for new athletes
  
  // Athlete data (required for new athletes)
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.string().min(1, "Sexo é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  zipCode: z.string().min(8, "CEP é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
  
  // Optional athlete fields
  cpf: z.string().optional(),
  rg: z.string().optional(),
  photoUrl: z.string().optional(),
  street: z.string().optional(),
  phone: z.string().optional(),
  complement: z.string().optional(),
  club: z.string().optional(),
  observations: z.string().optional(),
  
  // Consent data
  consentData: z.object({
    birthDate: z.string(),
    isMinor: z.boolean(),
    lgpdConsent: z.boolean(),
    imageRightsConsent: z.boolean(),
    termsConsent: z.boolean(),
    signature: z.string(),
    signerName: z.string().optional(),
    consentTimestamp: z.string().optional(),
    athleteCpf: z.string().optional(),
    parentalData: z.object({
      parentName: z.string(),
      parentCpf: z.string(),
      parentEmail: z.string(),
      relationship: z.string(),
    }).optional(),
  }).optional(),
});

export type InsertTournamentRegistration = z.infer<typeof tournamentRegistrationSchema>;

// Links externos para QR codes e compartilhamento
export const externalLinks = pgTable("external_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identificador único do link externo (URL path)
  shortCode: varchar("short_code", { length: 32 }).notNull().unique(),
  
  // URL original (interna) para onde o link redireciona
  originalUrl: text("original_url").notNull(),
  
  // Tipo de link para categorização
  linkType: text("link_type").notNull(), // 'tournament_public', 'tournament_registration', 'consent', 'self_registration'
  
  // IDs de referência (opcionais dependendo do tipo)
  tournamentId: varchar("tournament_id"),
  categoryId: varchar("category_id"),
  
  // Metadados
  title: text("title"), // Título descritivo do link
  description: text("description"), // Descrição do link
  
  // Controle de acesso e expiração
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // Data de expiração (opcional)
  accessCount: integer("access_count").default(0), // Contador de acessos
  
  // Auditoria
  createdBy: text("created_by"), // Usuário que criou o link
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertExternalLinkSchema = createInsertSchema(externalLinks).omit({
  id: true,
  shortCode: true, // Será gerado automaticamente
  accessCount: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  expiresAt: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export type InsertExternalLink = z.infer<typeof insertExternalLinkSchema>;
export type ExternalLink = typeof externalLinks.$inferSelect;

