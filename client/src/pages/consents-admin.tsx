import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, CheckCircle, XCircle, FileText, User, Calendar, Mail, Phone, Search, Filter, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Consent = {
  id: string;
  athleteId: string;
  birthDate: string;
  isMinor: boolean;
  lgpdConsent: boolean;
  imageRightsConsent: boolean;
  termsConsent: boolean;
  signature: string;
  signerName: string;
  parentName?: string;
  parentCpf?: string;
  parentEmail?: string;
  parentRelationship?: string;
  consentTimestamp: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
};

type Athlete = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  type: string;
};

const ITEMS_PER_PAGE = 15;

export default function ConsentsAdmin() {
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const { data: consents = [], isLoading: loadingConsents } = useQuery<Consent[]>({
    queryKey: ["/api/consents"],
  });

  const { data: athletes = [], isLoading: loadingAthletes } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const deleteConsentMutation = useMutation({
    mutationFn: async (consentId: string) => {
      await apiRequest("DELETE", `/api/consents/${consentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consents"] });
      toast({
        title: "Consentimento excluído",
        description: "O consentimento foi removido com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error deleting consent:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o consentimento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const getAthleteForConsent = (athleteId: string) => {
    return athletes.find((athlete) => athlete.id === athleteId);
  };

  // Filtrar consentimentos baseado nos filtros
  const filteredConsents = consents.filter((consent) => {
    const athlete = getAthleteForConsent(consent.athleteId);
    const consentDate = new Date(consent.consentTimestamp);
    
    // Filtro por nome (atleta ou responsável)
    const nameMatch = !searchName || 
      (athlete?.name.toLowerCase().includes(searchName.toLowerCase())) ||
      (consent.signerName.toLowerCase().includes(searchName.toLowerCase())) ||
      (consent.parentName?.toLowerCase().includes(searchName.toLowerCase()));
    
    // Filtro por data de início
    const startDateMatch = !searchStartDate || 
      consentDate >= new Date(searchStartDate);
      
    // Filtro por data de fim
    const endDateMatch = !searchEndDate || 
      consentDate <= new Date(searchEndDate + "T23:59:59");
    
    return nameMatch && startDateMatch && endDateMatch;
  });

  // Paginação
  const totalPages = Math.ceil(filteredConsents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedConsents = filteredConsents.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleDeleteConsent = async (consentId: string, athleteName: string) => {
    deleteConsentMutation.mutate(consentId);
  };

  if (loadingConsents || loadingAthletes) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-muted-foreground">Carregando consentimentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Consentimentos LGPD</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os consentimentos digitais de atletas e associados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-name">Nome (Atleta ou Responsável)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-name"
                  placeholder="Digite o nome para buscar..."
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-10"
                  data-testid="input-search-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="search-start-date">Data Inicial</Label>
              <Input
                id="search-start-date"
                type="date"
                value={searchStartDate}
                onChange={(e) => {
                  setSearchStartDate(e.target.value);
                  handleFilterChange();
                }}
                data-testid="input-search-start-date"
              />
            </div>
            <div>
              <Label htmlFor="search-end-date">Data Final</Label>
              <Input
                id="search-end-date"
                type="date"
                value={searchEndDate}
                onChange={(e) => {
                  setSearchEndDate(e.target.value);
                  handleFilterChange();
                }}
                data-testid="input-search-end-date"
              />
            </div>
          </div>
          {(searchName || searchStartDate || searchEndDate) && (
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">
                {filteredConsents.length} de {consents.length} consentimentos
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchName("");
                  setSearchStartDate("");
                  setSearchEndDate("");
                  setCurrentPage(1);
                }}
                data-testid="button-clear-filters"
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Consentimentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Consentimentos Registrados</CardTitle>
            <Badge variant="outline">
              {filteredConsents.length} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredConsents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                {consents.length === 0 ? "Nenhum consentimento encontrado" : "Nenhum resultado encontrado"}
              </h3>
              <p className="text-muted-foreground text-center mt-2">
                {consents.length === 0 
                  ? "Os consentimentos digitais aparecerão aqui quando forem criados"
                  : "Tente ajustar os filtros de pesquisa para encontrar outros consentimentos"
                }
              </p>
            </div>
          ) : (
            <>
              {/* Tabela - Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atleta</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Data Consentimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Consentimentos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedConsents.map((consent) => {
                      const athlete = getAthleteForConsent(consent.athleteId);
                      
                      return (
                        <TableRow key={consent.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {athlete?.name || "Atleta não encontrado"}
                              </span>
                              {consent.isMinor && (
                                <Badge variant="secondary" className="w-fit mt-1">
                                  Menor de idade
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {athlete?.email || "Email não informado"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(consent.consentTimestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={athlete?.status === "approved" ? "default" : "secondary"}>
                              {athlete?.status === "approved" ? "Aprovado" : athlete?.status === "pending" ? "Pendente" : "Desconhecido"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {consent.lgpdConsent && (
                                <CheckCircle className="h-4 w-4 text-green-600" title="LGPD" />
                              )}
                              {consent.imageRightsConsent && (
                                <CheckCircle className="h-4 w-4 text-blue-600" title="Uso de Imagem" />
                              )}
                              {consent.termsConsent && (
                                <CheckCircle className="h-4 w-4 text-purple-600" title="Termos" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedConsent(consent)}
                                    data-testid={`button-view-consent-${consent.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh]">
                                  <DialogHeader>
                                    <DialogTitle>Detalhes do Consentimento LGPD</DialogTitle>
                                    <DialogDescription>
                                      Informações completas do consentimento de {athlete?.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-[60vh]">
                                    {selectedConsent && (
                                      <div className="space-y-6 p-2">
                                        {/* Dados básicos */}
                                        <div>
                                          <h4 className="font-semibold mb-3">Dados Básicos</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div><strong>Nome:</strong> {consent.signerName}</div>
                                            <div><strong>Data de Nascimento:</strong> {consent.birthDate}</div>
                                            <div><strong>Menor de idade:</strong> {consent.isMinor ? "Sim" : "Não"}</div>
                                            <div><strong>Data do Consentimento:</strong> {format(new Date(consent.consentTimestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                                          </div>
                                        </div>

                                        <Separator />

                                        {/* Consentimentos */}
                                        <div>
                                          <h4 className="font-semibold mb-3">Consentimentos Aceitos</h4>
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              {consent.lgpdConsent ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                              ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                              )}
                                              <span className="text-sm">Tratamento de dados pessoais (LGPD)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {consent.imageRightsConsent ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                              ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                              )}
                                              <span className="text-sm">Autorização de uso de imagem</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {consent.termsConsent ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                              ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                              )}
                                              <span className="text-sm">Termos de uso e responsabilidade</span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Responsável legal (se aplicável) */}
                                        {consent.isMinor && (
                                          <>
                                            <Separator />
                                            <div>
                                              <h4 className="font-semibold mb-3">Responsável Legal</h4>
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                <div><strong>Nome:</strong> {consent.parentName}</div>
                                                <div><strong>Parentesco:</strong> {consent.parentRelationship}</div>
                                                {consent.parentEmail && <div><strong>Email:</strong> {consent.parentEmail}</div>}
                                                {consent.parentCpf && <div><strong>CPF:</strong> {consent.parentCpf}</div>}
                                              </div>
                                            </div>
                                          </>
                                        )}

                                        {/* Assinatura digital */}
                                        <Separator />
                                        <div>
                                          <h4 className="font-semibold mb-3">Assinatura Digital</h4>
                                          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                            <img 
                                              src={consent.signature} 
                                              alt="Assinatura digital" 
                                              className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded"
                                              style={{ maxHeight: "150px" }}
                                            />
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-2">
                                            Assinado por: {consent.signerName}
                                          </p>
                                        </div>

                                        {/* Dados técnicos */}
                                        <Separator />
                                        <div>
                                          <h4 className="font-semibold mb-3">Dados Técnicos</h4>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            {consent.ipAddress && <div><strong>IP:</strong> {consent.ipAddress}</div>}
                                            {consent.userAgent && <div><strong>Navegador:</strong> {consent.userAgent}</div>}
                                            <div><strong>Registro criado em:</strong> {format(new Date(consent.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    data-testid={`button-delete-consent-${consent.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o consentimento de <strong>{athlete?.name}</strong>?
                                      <br /><br />
                                      Esta ação não pode ser desfeita e removerá permanentemente todos os dados de consentimento LGPD deste atleta.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteConsent(consent.id, athlete?.name || "Atleta desconhecido")}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={deleteConsentMutation.isPending}
                                    >
                                      {deleteConsentMutation.isPending ? "Excluindo..." : "Sim, excluir"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Cards - Mobile */}
              <div className="block md:hidden space-y-4">
                {paginatedConsents.map((consent) => {
                  const athlete = getAthleteForConsent(consent.athleteId);
                  
                  return (
                    <Card key={consent.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">
                              {athlete?.name || "Atleta não encontrado"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {athlete?.email || "Email não informado"}
                            </p>
                          </div>
                          {consent.isMinor && (
                            <Badge variant="secondary" className="text-xs">
                              Menor
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm">
                          <p>
                            <strong>Data:</strong> {format(new Date(consent.consentTimestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                          <p>
                            <strong>Status:</strong>{" "}
                            <Badge variant={athlete?.status === "approved" ? "default" : "secondary"} className="text-xs">
                              {athlete?.status === "approved" ? "Aprovado" : athlete?.status === "pending" ? "Pendente" : "Desconhecido"}
                            </Badge>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Consentimentos:</span>
                          <div className="flex gap-1">
                            {consent.lgpdConsent && (
                              <CheckCircle className="h-4 w-4 text-green-600" title="LGPD" />
                            )}
                            {consent.imageRightsConsent && (
                              <CheckCircle className="h-4 w-4 text-blue-600" title="Uso de Imagem" />
                            )}
                            {consent.termsConsent && (
                              <CheckCircle className="h-4 w-4 text-purple-600" title="Termos" />
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1"
                                onClick={() => setSelectedConsent(consent)}
                                data-testid={`button-view-consent-mobile-${consent.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Consentimento LGPD</DialogTitle>
                                <DialogDescription>
                                  Informações completas do consentimento de {athlete?.name}
                                </DialogDescription>
                              </DialogHeader>
                              <ScrollArea className="max-h-[60vh]">
                                {selectedConsent && (
                                  <div className="space-y-6 p-2">
                                    {/* Conteúdo igual ao desktop */}
                                    <div>
                                      <h4 className="font-semibold mb-3">Dados Básicos</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <div><strong>Nome:</strong> {consent.signerName}</div>
                                        <div><strong>Data de Nascimento:</strong> {consent.birthDate}</div>
                                        <div><strong>Menor de idade:</strong> {consent.isMinor ? "Sim" : "Não"}</div>
                                        <div><strong>Data do Consentimento:</strong> {format(new Date(consent.consentTimestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                                      </div>
                                    </div>

                                    <Separator />

                                    <div>
                                      <h4 className="font-semibold mb-3">Consentimentos Aceitos</h4>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          {consent.lgpdConsent ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                          <span className="text-sm">Tratamento de dados pessoais (LGPD)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {consent.imageRightsConsent ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                          <span className="text-sm">Autorização de uso de imagem</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {consent.termsConsent ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-600" />
                                          )}
                                          <span className="text-sm">Termos de uso e responsabilidade</span>
                                        </div>
                                      </div>
                                    </div>

                                    {consent.isMinor && (
                                      <>
                                        <Separator />
                                        <div>
                                          <h4 className="font-semibold mb-3">Responsável Legal</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div><strong>Nome:</strong> {consent.parentName}</div>
                                            <div><strong>Parentesco:</strong> {consent.parentRelationship}</div>
                                            {consent.parentEmail && <div><strong>Email:</strong> {consent.parentEmail}</div>}
                                            {consent.parentCpf && <div><strong>CPF:</strong> {consent.parentCpf}</div>}
                                          </div>
                                        </div>
                                      </>
                                    )}

                                    <Separator />
                                    <div>
                                      <h4 className="font-semibold mb-3">Assinatura Digital</h4>
                                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                        <img 
                                          src={consent.signature} 
                                          alt="Assinatura digital" 
                                          className="max-w-full h-auto border border-gray-300 dark:border-gray-600 rounded"
                                          style={{ maxHeight: "150px" }}
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Assinado por: {consent.signerName}
                                      </p>
                                    </div>

                                    <Separator />
                                    <div>
                                      <h4 className="font-semibold mb-3">Dados Técnicos</h4>
                                      <div className="text-xs text-muted-foreground space-y-1">
                                        {consent.ipAddress && <div><strong>IP:</strong> {consent.ipAddress}</div>}
                                        {consent.userAgent && <div><strong>Navegador:</strong> {consent.userAgent}</div>}
                                        <div><strong>Registro criado em:</strong> {format(new Date(consent.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-consent-mobile-${consent.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o consentimento de <strong>{athlete?.name}</strong>?
                                  <br /><br />
                                  Esta ação não pode ser desfeita e removerá permanentemente todos os dados de consentimento LGPD deste atleta.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteConsent(consent.id, athlete?.name || "Atleta desconhecido")}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deleteConsentMutation.isPending}
                                >
                                  {deleteConsentMutation.isPending ? "Excluindo..." : "Sim, excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, filteredConsents.length)} de {filteredConsents.length} consentimentos
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}