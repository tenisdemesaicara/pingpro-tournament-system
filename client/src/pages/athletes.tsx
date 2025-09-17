import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Edit, Printer, UserX, Check, X, RefreshCw, QrCode, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Athlete } from "@shared/schema";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import { formatCPF, unformatCPF, formatPhone, unformatPhone } from "@/lib/format-utils";
import QRCode from 'qrcode';

export default function Athletes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const { toast } = useToast();

  // Form states for athlete registration
  const [athleteFormData, setAthleteFormData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    cpf: "",
    rg: "",
    street: "",
    neighborhood: "",
    zipCode: "",
    city: "",
    state: "",
    complement: "",
    club: "",
    gender: "",
    observations: "",
    photoUrl: "",
    type: "atleta"
  });

  const { data: athletes, isLoading } = useQuery<Athlete[]>({
    queryKey: ['/api/athletes'],
  });

  const deleteAthleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/athletes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir atleta.",
        variant: "destructive",
      });
    },
  });

  const updateAthleteStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest('PATCH', `/api/athletes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Status do atleta atualizado.",
      });
    },
  });

  // Create athlete mutation
  const createAthleteMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove formatting before sending to backend
      const cleanData = {
        ...data,
        cpf: data.cpf,
        phone: unformatPhone(data.phone)
      };
      
      const response = await fetch('/api/athletes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Erro no cadastro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta cadastrado com sucesso!",
      });
      setShowAthleteModal(false);
      setAthleteFormData({
        name: "",
        email: "",
        phone: "",
        birthDate: "",
        cpf: "",
        rg: "",
        street: "",
        neighborhood: "",
        zipCode: "",
        city: "",
        state: "",
        complement: "",
        club: "",
        gender: "",
        observations: "",
        photoUrl: "",
        type: "atleta"
      });
    },
    onError: (error: any) => {
      // Show friendly error messages for unique field violations
      let title = "Não foi possível cadastrar o atleta";
      let message = error.message;
      
      if (error.message.includes('CPF já cadastrado')) {
        title = "CPF já cadastrado";
      } else if (error.message.includes('RG já cadastrado')) {
        title = "RG já cadastrado";
      } else if (error.message.includes('Email já cadastrado')) {
        title = "Email já em uso";
      } else {
        message = "Ocorreu um erro inesperado ao cadastrar o atleta.";
      }
      
      toast({
        title: title,
        description: message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating athlete
  const updateAthleteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const cleanData = {
        ...data,
        cpf: data.cpf || "",
        phone: data.phone ? unformatPhone(data.phone) : "",
      };
      
      const response = await fetch(`/api/athletes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Erro na atualização');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta atualizado com sucesso!",
      });
      setShowEditModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar o atleta.",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const handleAthleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se a foto foi adicionada
    if (!athleteFormData.photoUrl) {
      toast({
        title: "Foto obrigatória",
        description: "Por favor, adicione uma foto do atleta.",
        variant: "destructive"
      });
      return;
    }
    
    createAthleteMutation.mutate(athleteFormData);
  };

  // Separar atletas por status (incluindo associados)
  const approvedAthletes = athletes?.filter(athlete => athlete.status === "approved") || [];
  const pendingAthletes = athletes?.filter(athlete => athlete.status === "pending") || [];
  const inactiveAthletes = athletes?.filter(athlete => athlete.status === "inactive") || [];

  // Aplicar filtro de busca
  const filteredApprovedAthletes = approvedAthletes.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingAthletes = pendingAthletes.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInactiveAthletes = inactiveAthletes.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Função para formatar data e hora
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mutations para aprovar/reprovar atletas
  const approveAthleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta aprovado com sucesso.",
      });
    },
  });

  const rejectAthleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta reprovado.",
      });
    },
  });

  const inactivateAthleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta inativado.",
      });
    },
  });

  const reactivateAthleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Atleta reativado.",
      });
    },
  });

  // Função para visualizar dados completos
  const handleView = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setShowViewModal(true);
  };

  // Função para gerar link de auto-cadastro
  const generateSelfRegistrationLink = async () => {
    const currentUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
    const selfRegisterUrl = `${currentUrl}/consent/athlete`;
    
    try {
      const qrDataURL = await QRCode.toDataURL(selfRegisterUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1e40af',
          light: '#ffffff'
        }
      });
      setQrCodeDataURL(qrDataURL);
      setShowQRModal(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o QR code",
        variant: "destructive"
      });
    }
  };

  // Função para copiar link
  const copyLinkToClipboard = () => {
    const currentUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
    const selfRegisterUrl = `${currentUrl}/consent/athlete`;
    navigator.clipboard.writeText(selfRegisterUrl);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência"
    });
  };

  // Função para editar
  const handleEdit = (athlete: Athlete) => {
    setSelectedAthlete(athlete);
    setAthleteFormData({
      name: athlete.name,
      email: athlete.email,
      phone: athlete.phone || "",
      birthDate: athlete.birthDate,
      cpf: athlete.cpf || "",
      rg: athlete.rg || "",
      street: athlete.street || "",
      neighborhood: athlete.neighborhood,
      zipCode: athlete.zipCode,
      city: athlete.city,
      state: athlete.state,
      complement: athlete.complement || "",
      club: athlete.club || "",
      gender: athlete.gender,
      observations: athlete.observations || "",
      photoUrl: athlete.photoUrl || "",
      type: "atleta"
    });
    setShowEditModal(true);
  };

  // Função para imprimir ficha
  const handlePrint = (athlete: Athlete) => {
    const initials = athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const age = calculateAge(athlete.birthDate);
    
    const printContent = `
      <html>
        <head>
          <title>Ficha do Atleta - ${athlete.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #1f2937;
              line-height: 1.3;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 15px;
            }
            .photo-container {
              width: 80px;
              height: 80px;
              margin: 0 auto 12px;
              position: relative;
            }
            .photo-img {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #e5e7eb;
              display: block;
              max-width: none !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            .photo-placeholder {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background: #dbeafe;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: bold;
              color: #1e40af;
              border: 3px solid #e5e7eb;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #111827;
            }
            .subtitle {
              display: flex;
              gap: 12px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .badge {
              background: #f3f4f6;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
            .section {
              margin-bottom: 16px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: #374151;
              border-bottom: 1px solid #d1d5db;
              padding-bottom: 4px;
              margin-bottom: 12px;
            }
            .data-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 8px;
            }
            .data-item {
              background: #f9fafb;
              padding: 8px;
              border-radius: 4px;
            }
            .data-label {
              font-size: 10px;
              font-weight: 500;
              color: #6b7280;
              margin-bottom: 2px;
            }
            .data-value {
              font-size: 12px;
              color: #111827;
            }
            .observations {
              background: #f9fafb;
              padding: 10px;
              border-radius: 4px;
              white-space: pre-wrap;
              font-size: 11px;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 15px;
                font-size: 11px;
              }
              .data-grid { 
                grid-template-columns: 1fr 1fr 1fr;
                gap: 6px;
              }
              .section {
                margin-bottom: 12px;
              }
              .header {
                margin-bottom: 15px;
                padding-bottom: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="photo-container">
              ${athlete.photoUrl ? 
                `<img src="${athlete.photoUrl}" alt="${athlete.name}" class="photo-img">` : 
                `<div class="photo-placeholder">${initials}</div>`
              }
            </div>
            <div class="title">${athlete.name}</div>
            <div class="subtitle">
              <div class="badge">${age} anos</div>
              <div class="badge">Ranking: ${athlete.ranking || 1000}</div>
              <div class="badge">${athlete.gender === 'masculino' ? 'Masculino' : 'Feminino'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados Pessoais</div>
            <div class="data-grid">
              <div class="data-item">
                <div class="data-label">Email</div>
                <div class="data-value">${athlete.email}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Telefone</div>
                <div class="data-value">${athlete.phone || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">CPF</div>
                <div class="data-value">${athlete.cpf || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">RG</div>
                <div class="data-value">${athlete.rg || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Data Nascimento</div>
                <div class="data-value">${new Date(athlete.birthDate).toLocaleDateString('pt-BR')}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Clube</div>
                <div class="data-value">${athlete.club || '-'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Endereço</div>
            <div class="data-grid">
              <div class="data-item">
                <div class="data-label">CEP</div>
                <div class="data-value">${athlete.zipCode}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Rua</div>
                <div class="data-value">${athlete.street || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Bairro</div>
                <div class="data-value">${athlete.neighborhood}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Cidade</div>
                <div class="data-value">${athlete.city}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Estado</div>
                <div class="data-value">${athlete.state}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Complemento</div>
                <div class="data-value">${athlete.complement || '-'}</div>
              </div>
            </div>
          </div>

          ${athlete.observations ? `
          <div class="section">
            <div class="section-title">Observações</div>
            <div class="observations">${athlete.observations}</div>
          </div>
          ` : ''}
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando atletas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Atletas</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerenciar atletas cadastrados no sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                data-testid="cadastrar-atleta-btn"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowAthleteModal(true)}
              >
                + Cadastrar Atleta
              </Button>
              <Button 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={generateSelfRegistrationLink}
                title="Gerar link para auto-cadastro"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Link Cadastro
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md"
          />
        </div>

        {/* Tabs for Athletes by Status */}
        <Tabs defaultValue="approved" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="approved">Aprovados ({filteredApprovedAthletes.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({filteredPendingAthletes.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inativados ({filteredInactiveAthletes.length})</TabsTrigger>
          </TabsList>

          {/* Aba de Atletas Aprovados */}
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Atletas Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredApprovedAthletes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum atleta aprovado corresponde aos critérios de busca." :
                        "Ainda não há atletas aprovados no sistema."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Foto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-20">Idade</TableHead>
                          <TableHead className="w-20">Gênero</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="w-24">Ranking</TableHead>
                          <TableHead className="w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedAthletes.map((athlete) => (
                          <TableRow key={athlete.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={athlete.photoUrl || ""} alt={athlete.name} />
                                <AvatarFallback>
                                  {athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{athlete.name}</TableCell>
                            <TableCell>{calculateAge(athlete.birthDate)} anos</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {athlete.gender === 'masculino' ? 'M' : 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell>{athlete.cpf || '-'}</TableCell>
                            <TableCell>{athlete.city}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{athlete.ranking || 1000}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Visualizar Ficha"
                                  onClick={() => handleView(athlete)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Imprimir"
                                  onClick={() => handlePrint(athlete)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Editar"
                                  onClick={() => handleEdit(athlete)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  title="Inativar"
                                  onClick={() => inactivateAthleteMutation.mutate(athlete.id)}
                                  disabled={inactivateAthleteMutation.isPending}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Atletas Pendentes */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pendentes de Aprovação</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Atletas e associados aguardando aprovação dos administradores
                </p>
              </CardHeader>
              <CardContent>
                {filteredPendingAthletes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum registro pendente corresponde aos critérios de busca." :
                        "Não há registros pendentes de aprovação."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Foto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-20">Gênero</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Data/Hora Cadastro</TableHead>
                          <TableHead className="w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingAthletes.map((athlete) => (
                          <TableRow key={athlete.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={athlete.photoUrl || ""} alt={athlete.name} />
                                <AvatarFallback>
                                  {athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                              {athlete.name}
                              {athlete.type === 'associado' && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Associado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {athlete.gender === 'masculino' ? 'M' : 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell>{athlete.cpf || '-'}</TableCell>
                            <TableCell>{athlete.city}</TableCell>
                            <TableCell className="text-sm">
                              {athlete.createdAt ? formatDateTime(athlete.createdAt.toString()) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Visualizar Dados Completos"
                                  onClick={() => handleView(athlete)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700" 
                                  title="Aprovar"
                                  onClick={() => approveAthleteMutation.mutate(athlete.id)}
                                  disabled={approveAthleteMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  title="Reprovar"
                                  onClick={() => rejectAthleteMutation.mutate(athlete.id)}
                                  disabled={rejectAthleteMutation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Atletas Inativados */}
          <TabsContent value="inactive">
            <Card>
              <CardHeader>
                <CardTitle>Atletas Inativados</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredInactiveAthletes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum atleta inativado corresponde aos critérios de busca." :
                        "Não há atletas inativados."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Foto</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="w-20">Idade</TableHead>
                          <TableHead className="w-20">Gênero</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="w-24">Ranking</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInactiveAthletes.map((athlete) => (
                          <TableRow key={athlete.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={athlete.photoUrl || ""} alt={athlete.name} />
                                <AvatarFallback>
                                  {athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium opacity-60">{athlete.name}</TableCell>
                            <TableCell className="opacity-60">{calculateAge(athlete.birthDate)} anos</TableCell>
                            <TableCell className="opacity-60">
                              <Badge variant="outline" className="text-xs opacity-60">
                                {athlete.gender === 'masculino' ? 'M' : 'F'}
                              </Badge>
                            </TableCell>
                            <TableCell className="opacity-60">{athlete.cpf || '-'}</TableCell>
                            <TableCell className="opacity-60">{athlete.city}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="opacity-60">{athlete.ranking || 1000}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700" 
                                  title="Reativar"
                                  onClick={() => reactivateAthleteMutation.mutate(athlete.id)}
                                  disabled={reactivateAthleteMutation.isPending}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


        {/* Modal de Visualização de Dados Completos */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-center">Ficha do Atleta</DialogTitle>
            </DialogHeader>
            
            {selectedAthlete && (
              <div className="space-y-6">
                {/* Header com Foto e Nome */}
                <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                  <Avatar className="h-32 w-32 border-4 border-gray-200">
                    <AvatarImage 
                      src={selectedAthlete.photoUrl || ""} 
                      alt={selectedAthlete.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-blue-100">
                      {selectedAthlete.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAthlete.name}</h2>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <Badge variant="outline" className="text-sm">
                        {calculateAge(selectedAthlete.birthDate)} anos
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        Ranking: {selectedAthlete.ranking || 1000}
                      </Badge>
                      <Badge variant="default" className="text-sm">
                        {selectedAthlete.gender === 'masculino' ? 'Masculino' : 'Feminino'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{selectedAthlete.email}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Telefone</label>
                      <p className="text-gray-900">{selectedAthlete.phone || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">CPF</label>
                      <p className="text-gray-900">{selectedAthlete.cpf || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">RG</label>
                      <p className="text-gray-900">{selectedAthlete.rg || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
                      <p className="text-gray-900">{new Date(selectedAthlete.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Clube</label>
                      <p className="text-gray-900">{selectedAthlete.club || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">CEP</label>
                      <p className="text-gray-900">{selectedAthlete.zipCode}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Rua</label>
                      <p className="text-gray-900">{selectedAthlete.street || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Bairro</label>
                      <p className="text-gray-900">{selectedAthlete.neighborhood}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Cidade</label>
                      <p className="text-gray-900">{selectedAthlete.city}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Estado</label>
                      <p className="text-gray-900">{selectedAthlete.state}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Complemento</label>
                      <p className="text-gray-900">{selectedAthlete.complement || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedAthlete.observations && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Observações</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedAthlete.observations}</p>
                    </div>
                  </div>
                )}

                {/* Consentimento LGPD */}
                <ConsentSection athleteId={selectedAthlete.id} />

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => handlePrint(selectedAthlete)} className="bg-blue-600 hover:bg-blue-700">
                    Imprimir Ficha
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Cadastro de Atleta */}
        <Dialog open={showAthleteModal} onOpenChange={setShowAthleteModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Atleta</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAthleteSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="athlete-name">Nome Completo *</Label>
                  <Input
                    id="athlete-name"
                    value={athleteFormData.name}
                    onChange={(e) => setAthleteFormData({...athleteFormData, name: e.target.value})}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="athlete-email">Email *</Label>
                  <Input
                    id="athlete-email"
                    type="email"
                    value={athleteFormData.email}
                    onChange={(e) => setAthleteFormData({...athleteFormData, email: e.target.value})}
                    required
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="athlete-phone">Telefone</Label>
                  <Input
                    id="athlete-phone"
                    value={athleteFormData.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setAthleteFormData({...athleteFormData, phone: formatted});
                    }}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <Label htmlFor="athlete-birthDate">Data de Nascimento *</Label>
                  <Input
                    id="athlete-birthDate"
                    type="date"
                    value={athleteFormData.birthDate}
                    onChange={(e) => setAthleteFormData({...athleteFormData, birthDate: e.target.value})}
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="athlete-cpf">CPF</Label>
                  <Input
                    id="athlete-cpf"
                    value={athleteFormData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setAthleteFormData({...athleteFormData, cpf: formatted});
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                {/* RG */}
                <div>
                  <Label htmlFor="athlete-rg">RG</Label>
                  <Input
                    id="athlete-rg"
                    value={athleteFormData.rg}
                    onChange={(e) => setAthleteFormData({...athleteFormData, rg: e.target.value})}
                  />
                </div>

                {/* Gênero */}
                <div>
                  <Label htmlFor="athlete-gender">Gênero *</Label>
                  <Select value={athleteFormData.gender} onValueChange={(value) => setAthleteFormData({...athleteFormData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CEP */}
                <div>
                  <Label htmlFor="athlete-zipCode">CEP *</Label>
                  <Input
                    id="athlete-zipCode"
                    value={athleteFormData.zipCode}
                    onChange={(e) => setAthleteFormData({...athleteFormData, zipCode: e.target.value})}
                    placeholder="00000-000"
                    required
                  />
                </div>

                {/* Rua */}
                <div>
                  <Label htmlFor="athlete-street">Rua</Label>
                  <Input
                    id="athlete-street"
                    value={athleteFormData.street}
                    onChange={(e) => setAthleteFormData({...athleteFormData, street: e.target.value})}
                  />
                </div>

                {/* Bairro */}
                <div>
                  <Label htmlFor="athlete-neighborhood">Bairro *</Label>
                  <Input
                    id="athlete-neighborhood"
                    value={athleteFormData.neighborhood}
                    onChange={(e) => setAthleteFormData({...athleteFormData, neighborhood: e.target.value})}
                    required
                  />
                </div>

                {/* Cidade */}
                <div>
                  <Label htmlFor="athlete-city">Cidade *</Label>
                  <Input
                    id="athlete-city"
                    value={athleteFormData.city}
                    onChange={(e) => setAthleteFormData({...athleteFormData, city: e.target.value})}
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <Label htmlFor="athlete-state">Estado *</Label>
                  <Input
                    id="athlete-state"
                    value={athleteFormData.state}
                    onChange={(e) => setAthleteFormData({...athleteFormData, state: e.target.value})}
                    placeholder="SP"
                    required
                  />
                </div>

                {/* Complemento */}
                <div>
                  <Label htmlFor="athlete-complement">Complemento</Label>
                  <Input
                    id="athlete-complement"
                    value={athleteFormData.complement}
                    onChange={(e) => setAthleteFormData({...athleteFormData, complement: e.target.value})}
                  />
                </div>

                {/* Clube */}
                <div>
                  <Label htmlFor="athlete-club">Clube</Label>
                  <Input
                    id="athlete-club"
                    value={athleteFormData.club}
                    onChange={(e) => setAthleteFormData({...athleteFormData, club: e.target.value})}
                  />
                </div>
              </div>

              {/* Foto do Atleta */}
              <div>
                <div className="max-w-xs">
                  <ImageUpload
                    onImageSelect={(imageUrl) => setAthleteFormData({...athleteFormData, photoUrl: imageUrl})}
                    currentImage={athleteFormData.photoUrl}
                    maxSizeMB={10}
                    aspectRatio="aspect-square"
                    label="Foto de Rosto *"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="athlete-observations">Observações</Label>
                <Textarea
                  id="athlete-observations"
                  value={athleteFormData.observations}
                  onChange={(e) => setAthleteFormData({...athleteFormData, observations: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAthleteModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAthleteMutation.isPending}>
                  {createAthleteMutation.isPending ? "Cadastrando..." : "Cadastrar Atleta"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Atleta */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Atleta</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedAthlete) {
                updateAthleteMutation.mutate({ id: selectedAthlete.id, data: athleteFormData });
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="edit-athlete-name">Nome Completo *</Label>
                  <Input
                    id="edit-athlete-name"
                    value={athleteFormData.name}
                    onChange={(e) => setAthleteFormData({...athleteFormData, name: e.target.value})}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="edit-athlete-email">Email *</Label>
                  <Input
                    id="edit-athlete-email"
                    type="email"
                    value={athleteFormData.email}
                    onChange={(e) => setAthleteFormData({...athleteFormData, email: e.target.value})}
                    required
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="edit-athlete-phone">Telefone</Label>
                  <Input
                    id="edit-athlete-phone"
                    value={athleteFormData.phone}
                    onChange={(e) => setAthleteFormData({...athleteFormData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <Label htmlFor="edit-athlete-birthDate">Data de Nascimento *</Label>
                  <Input
                    id="edit-athlete-birthDate"
                    type="date"
                    value={athleteFormData.birthDate}
                    onChange={(e) => setAthleteFormData({...athleteFormData, birthDate: e.target.value})}
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="edit-athlete-cpf">CPF</Label>
                  <Input
                    id="edit-athlete-cpf"
                    value={athleteFormData.cpf}
                    onChange={(e) => setAthleteFormData({...athleteFormData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* RG */}
                <div>
                  <Label htmlFor="edit-athlete-rg">RG</Label>
                  <Input
                    id="edit-athlete-rg"
                    value={athleteFormData.rg}
                    onChange={(e) => setAthleteFormData({...athleteFormData, rg: e.target.value})}
                  />
                </div>

                {/* Gênero */}
                <div>
                  <Label htmlFor="edit-athlete-gender">Gênero *</Label>
                  <Select value={athleteFormData.gender} onValueChange={(value) => setAthleteFormData({...athleteFormData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CEP */}
                <div>
                  <Label htmlFor="edit-athlete-zipCode">CEP *</Label>
                  <Input
                    id="edit-athlete-zipCode"
                    value={athleteFormData.zipCode}
                    onChange={(e) => setAthleteFormData({...athleteFormData, zipCode: e.target.value})}
                    placeholder="00000-000"
                    required
                  />
                </div>

                {/* Rua */}
                <div>
                  <Label htmlFor="edit-athlete-street">Rua</Label>
                  <Input
                    id="edit-athlete-street"
                    value={athleteFormData.street}
                    onChange={(e) => setAthleteFormData({...athleteFormData, street: e.target.value})}
                  />
                </div>

                {/* Bairro */}
                <div>
                  <Label htmlFor="edit-athlete-neighborhood">Bairro *</Label>
                  <Input
                    id="edit-athlete-neighborhood"
                    value={athleteFormData.neighborhood}
                    onChange={(e) => setAthleteFormData({...athleteFormData, neighborhood: e.target.value})}
                    required
                  />
                </div>

                {/* Cidade */}
                <div>
                  <Label htmlFor="edit-athlete-city">Cidade *</Label>
                  <Input
                    id="edit-athlete-city"
                    value={athleteFormData.city}
                    onChange={(e) => setAthleteFormData({...athleteFormData, city: e.target.value})}
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <Label htmlFor="edit-athlete-state">Estado *</Label>
                  <Input
                    id="edit-athlete-state"
                    value={athleteFormData.state}
                    onChange={(e) => setAthleteFormData({...athleteFormData, state: e.target.value})}
                    placeholder="SP"
                    required
                  />
                </div>

                {/* Complemento */}
                <div>
                  <Label htmlFor="edit-athlete-complement">Complemento</Label>
                  <Input
                    id="edit-athlete-complement"
                    value={athleteFormData.complement}
                    onChange={(e) => setAthleteFormData({...athleteFormData, complement: e.target.value})}
                  />
                </div>

                {/* Clube */}
                <div>
                  <Label htmlFor="edit-athlete-club">Clube</Label>
                  <Input
                    id="edit-athlete-club"
                    value={athleteFormData.club}
                    onChange={(e) => setAthleteFormData({...athleteFormData, club: e.target.value})}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="edit-athlete-observations">Observações</Label>
                <Textarea
                  id="edit-athlete-observations"
                  value={athleteFormData.observations}
                  onChange={(e) => setAthleteFormData({...athleteFormData, observations: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Foto do Atleta */}
              <div>
                <div className="max-w-xs">
                  <ImageUpload
                    onImageSelect={(imageUrl) => setAthleteFormData({...athleteFormData, photoUrl: imageUrl})}
                    currentImage={athleteFormData.photoUrl}
                    maxSizeMB={10}
                    aspectRatio="aspect-square"
                    label="Foto de Rosto"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de QR Code para Auto-Cadastro */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Link de Auto-Cadastro - Atletas</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Compartilhe este link ou QR code para que pessoas possam se cadastrar como atletas.
                Os cadastros irão para "Pendentes de Aprovação".
              </p>
              
              {/* QR Code */}
              {qrCodeDataURL && (
                <div className="flex justify-center">
                  <img src={qrCodeDataURL} alt="QR Code" className="border rounded" />
                </div>
              )}
              
              {/* Link */}
              <div className="bg-gray-50 p-3 rounded border text-sm break-all">
                {import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/self-registration?type=athlete
              </div>
              
              {/* Botões */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={copyLinkToClipboard}
                  className="flex items-center gap-2"
                >
                  <Link className="h-4 w-4" />
                  Copiar Link
                </Button>
                <Button
                  onClick={() => setShowQRModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

// Tipo para dados de consentimento
type ConsentData = {
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

// Componente para mostrar informações de consentimento LGPD
function ConsentSection({ athleteId }: { athleteId: string }) {
  const { data: consent, isLoading } = useQuery<ConsentData>({
    queryKey: [`/api/consents/${athleteId}`],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Consentimento LGPD
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-600">Carregando informações de consentimento...</p>
        </div>
      </div>
    );
  }

  if (!consent) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Consentimento LGPD
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <p className="text-yellow-800">
            ⚠️ Nenhum consentimento registrado para este atleta.
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Este atleta foi cadastrado manualmente e não possui dados de consentimento LGPD.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Consentimento LGPD
      </h3>
      
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            {consent.lgpdConsent ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {consent.lgpdConsent ? "LGPD Aceito" : "LGPD Rejeitado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {consent.imageRightsConsent ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {consent.imageRightsConsent ? "Uso de Imagem Aceito" : "Uso de Imagem Rejeitado"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {consent.termsConsent ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {consent.termsConsent ? "Termos Aceitos" : "Termos Rejeitados"}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Assinado por:</strong> {consent.signerName}</p>
          <p><strong>Data do consentimento:</strong> {new Date(consent.consentTimestamp).toLocaleString('pt-BR')}</p>
          {consent.isMinor && (
            <p><strong>Responsável legal:</strong> {consent.parentName} ({consent.parentRelationship})</p>
          )}
        </div>
      </div>
    </div>
  );
}