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
import ImageUpload from "@/components/image-upload";
import { formatCPF, unformatCPF, formatPhone, unformatPhone } from "@/lib/format-utils";
import QRCode from 'qrcode';

export default function Associates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState("");
  const [selectedAssociate, setSelectedAssociate] = useState<Athlete | null>(null);
  const { toast } = useToast();

  // Form states for associate registration
  const [associateFormData, setAssociateFormData] = useState({
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
    type: "associado"
  });

  // Query to fetch all data
  const { data: allAthletes, isLoading } = useQuery<Athlete[]>({
    queryKey: ['/api/athletes'],
  });

  // Separar associados por status
  const approvedAssociates = allAthletes?.filter(athlete => athlete.type === "associado" && athlete.status === "approved") || [];
  const pendingAssociates = allAthletes?.filter(athlete => athlete.type === "associado" && athlete.status === "pending") || [];
  const inactiveAssociates = allAthletes?.filter(athlete => athlete.type === "associado" && athlete.status === "inactive") || [];

  // Aplicar filtro de busca
  const filteredApprovedAssociates = approvedAssociates.filter(associate => 
    associate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingAssociates = pendingAssociates.filter(associate => 
    associate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInactiveAssociates = inactiveAssociates.filter(associate => 
    associate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteAssociateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/athletes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir associado.",
        variant: "destructive",
      });
    },
  });

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

  // Mutations para aprovar/reprovar associados
  const approveAssociateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado aprovado com sucesso.",
      });
    },
  });

  const rejectAssociateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado reprovado.",
      });
    },
  });

  const inactivateAssociateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado inativado.",
      });
    },
  });

  const reactivateAssociateMutation = useMutation({
    mutationFn: (id: string) => apiRequest('PATCH', `/api/athletes/${id}`, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado reativado.",
      });
    },
  });

  // Create associate mutation
  const createAssociateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/athletes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/athletes'] });
      toast({
        title: "Sucesso!",
        description: "Associado cadastrado com sucesso!",
      });
      setShowAssociateModal(false);
      setAssociateFormData({
        name: "", email: "", phone: "", birthDate: "", cpf: "", rg: "",
        street: "", neighborhood: "", zipCode: "", city: "", state: "",
        complement: "", club: "", gender: "", observations: "", photoUrl: "", type: "associado"
      });
    },
    onError: (error: any) => {
      // Show friendly error messages for unique field violations
      let title = "Não foi possível cadastrar o associado";
      let message = error.message;
      
      if (error.message.includes('CPF já cadastrado')) {
        title = "CPF já cadastrado";
      } else if (error.message.includes('RG já cadastrado')) {
        title = "RG já cadastrado";
      } else if (error.message.includes('Email já cadastrado')) {
        title = "Email já em uso";
      } else {
        message = "Ocorreu um erro inesperado ao cadastrar o associado.";
      }
      
      toast({
        title: title,
        description: message,
        variant: "destructive",
      });
    },
  });

  // Função para visualizar dados completos
  const handleView = (associate: Athlete) => {
    setSelectedAssociate(associate);
    setShowViewModal(true);
  };

  // Função para gerar link de auto-cadastro
  const generateSelfRegistrationLink = async () => {
    const currentUrl = import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin;
    const selfRegisterUrl = `${currentUrl}/consent/associate`;
    
    try {
      const qrDataURL = await QRCode.toDataURL(selfRegisterUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#15803d',
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
    const selfRegisterUrl = `${currentUrl}/consent/associate`;
    navigator.clipboard.writeText(selfRegisterUrl);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para a área de transferência"
    });
  };

  // Função para editar
  const handleEdit = (associate: Athlete) => {
    setSelectedAssociate(associate);
    setAssociateFormData({
      name: associate.name,
      email: associate.email,
      phone: associate.phone || "",
      birthDate: associate.birthDate,
      cpf: associate.cpf || "",
      rg: associate.rg || "",
      street: associate.street || "",
      neighborhood: associate.neighborhood,
      zipCode: associate.zipCode,
      city: associate.city,
      state: associate.state,
      complement: associate.complement || "",
      club: associate.club || "",
      gender: associate.gender,
      observations: associate.observations || "",
      photoUrl: associate.photoUrl || "",
      type: "associado"
    });
    setShowEditModal(true);
  };

  // Função para imprimir ficha
  const handlePrint = (associate: Athlete) => {
    const initials = associate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const age = calculateAge(associate.birthDate);
    
    const printContent = `
      <html>
        <head>
          <title>Ficha do Associado - ${associate.name}</title>
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
            }
            .photo-placeholder {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              background: #dcfce7;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: bold;
              color: #15803d;
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
              ${associate.photoUrl ? 
                `<img src="${associate.photoUrl}" alt="${associate.name}" class="photo-img">` : 
                `<div class="photo-placeholder">${initials}</div>`
              }
            </div>
            <div class="title">${associate.name}</div>
            <div class="subtitle">
              <div class="badge">${age} anos</div>
              <div class="badge">Ranking: ${associate.ranking || 1000}</div>
              <div class="badge">${associate.gender === 'masculino' ? 'Masculino' : 'Feminino'}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dados Pessoais</div>
            <div class="data-grid">
              <div class="data-item">
                <div class="data-label">Email</div>
                <div class="data-value">${associate.email}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Telefone</div>
                <div class="data-value">${associate.phone || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">CPF</div>
                <div class="data-value">${associate.cpf || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">RG</div>
                <div class="data-value">${associate.rg || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Data Nascimento</div>
                <div class="data-value">${new Date(associate.birthDate).toLocaleDateString('pt-BR')}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Clube</div>
                <div class="data-value">${associate.club || '-'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Endereço</div>
            <div class="data-grid">
              <div class="data-item">
                <div class="data-label">CEP</div>
                <div class="data-value">${associate.zipCode}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Rua</div>
                <div class="data-value">${associate.street || '-'}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Bairro</div>
                <div class="data-value">${associate.neighborhood}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Cidade</div>
                <div class="data-value">${associate.city}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Estado</div>
                <div class="data-value">${associate.state}</div>
              </div>
              <div class="data-item">
                <div class="data-label">Complemento</div>
                <div class="data-value">${associate.complement || '-'}</div>
              </div>
            </div>
          </div>

          ${associate.observations ? `
          <div class="section">
            <div class="section-title">Observações</div>
            <div class="observations">${associate.observations}</div>
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

  // Handle form submissions
  const handleAssociateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se a foto foi adicionada
    if (!associateFormData.photoUrl) {
      toast({
        title: "Foto obrigatória",
        description: "Por favor, adicione uma foto do associado.",
        variant: "destructive"
      });
      return;
    }
    
    createAssociateMutation.mutate(associateFormData);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando associados...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Associados</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerenciar associados cadastrados no sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                data-testid="cadastrar-associado-btn"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowAssociateModal(true)}
              >
                + Cadastrar Associado
              </Button>
              <Button 
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
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
            placeholder="Buscar associados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md"
          />
        </div>

        {/* Tabs for Associates by Status */}
        <Tabs defaultValue="approved" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="approved">Aprovados ({filteredApprovedAssociates.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({filteredPendingAssociates.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inativados ({filteredInactiveAssociates.length})</TabsTrigger>
          </TabsList>

          {/* Aba de Associados Aprovados */}
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Associados Aprovados</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredApprovedAssociates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum associado aprovado corresponde aos critérios de busca." :
                        "Ainda não há associados aprovados no sistema."
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
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="w-24">Ranking</TableHead>
                          <TableHead className="w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedAssociates.map((associate) => (
                          <TableRow key={associate.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={associate.photoUrl || ""} alt={associate.name} />
                                <AvatarFallback>
                                  {associate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{associate.name}</TableCell>
                            <TableCell>{calculateAge(associate.birthDate)} anos</TableCell>
                            <TableCell>{associate.cpf || '-'}</TableCell>
                            <TableCell>{associate.city}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{associate.ranking || 1000}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Visualizar Ficha"
                                  onClick={() => handleView(associate)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Imprimir"
                                  onClick={() => handlePrint(associate)}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Editar"
                                  onClick={() => handleEdit(associate)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  title="Inativar"
                                  onClick={() => inactivateAssociateMutation.mutate(associate.id)}
                                  disabled={inactivateAssociateMutation.isPending}
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

          {/* Aba de Associados Pendentes */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Associados Pendentes de Aprovação</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPendingAssociates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum associado pendente corresponde aos critérios de busca." :
                        "Não há associados pendentes de aprovação."
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
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead>Data/Hora Cadastro</TableHead>
                          <TableHead className="w-48">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingAssociates.map((associate) => (
                          <TableRow key={associate.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={associate.photoUrl || ""} alt={associate.name} />
                                <AvatarFallback>
                                  {associate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{associate.name}</TableCell>
                            <TableCell>{associate.cpf || '-'}</TableCell>
                            <TableCell>{associate.city}</TableCell>
                            <TableCell className="text-sm">
                              {associate.createdAt ? formatDateTime(associate.createdAt.toString()) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title="Visualizar Dados Completos"
                                  onClick={() => handleView(associate)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700" 
                                  title="Aprovar"
                                  onClick={() => approveAssociateMutation.mutate(associate.id)}
                                  disabled={approveAssociateMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  title="Reprovar"
                                  onClick={() => rejectAssociateMutation.mutate(associate.id)}
                                  disabled={rejectAssociateMutation.isPending}
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

          {/* Aba de Associados Inativados */}
          <TabsContent value="inactive">
            <Card>
              <CardHeader>
                <CardTitle>Associados Inativados</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredInactiveAssociates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 
                        "Nenhum associado inativado corresponde aos critérios de busca." :
                        "Não há associados inativados."
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
                          <TableHead>CPF</TableHead>
                          <TableHead>Cidade</TableHead>
                          <TableHead className="w-24">Ranking</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInactiveAssociates.map((associate) => (
                          <TableRow key={associate.id}>
                            <TableCell>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={associate.photoUrl || ""} alt={associate.name} />
                                <AvatarFallback>
                                  {associate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </TableCell>
                            <TableCell className="font-medium opacity-60">{associate.name}</TableCell>
                            <TableCell className="opacity-60">{calculateAge(associate.birthDate)} anos</TableCell>
                            <TableCell className="opacity-60">{associate.cpf || '-'}</TableCell>
                            <TableCell className="opacity-60">{associate.city}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="opacity-60">{associate.ranking || 1000}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700" 
                                  title="Reativar"
                                  onClick={() => reactivateAssociateMutation.mutate(associate.id)}
                                  disabled={reactivateAssociateMutation.isPending}
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
              <DialogTitle className="text-center">Ficha do Associado</DialogTitle>
            </DialogHeader>
            
            {selectedAssociate && (
              <div className="space-y-6">
                {/* Header com Foto e Nome */}
                <div className="flex flex-col items-center space-y-4 pb-6 border-b">
                  <Avatar className="h-32 w-32 border-4 border-gray-200">
                    <AvatarImage 
                      src={selectedAssociate.photoUrl || ""} 
                      alt={selectedAssociate.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-green-100">
                      {selectedAssociate.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedAssociate.name}</h2>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <Badge variant="outline" className="text-sm">
                        {calculateAge(selectedAssociate.birthDate)} anos
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        Ranking: {selectedAssociate.ranking || 1000}
                      </Badge>
                      <Badge variant="default" className="text-sm">
                        {selectedAssociate.gender === 'masculino' ? 'Masculino' : 'Feminino'}
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
                      <p className="text-gray-900">{selectedAssociate.email}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Telefone</label>
                      <p className="text-gray-900">{selectedAssociate.phone || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">CPF</label>
                      <p className="text-gray-900">{selectedAssociate.cpf || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">RG</label>
                      <p className="text-gray-900">{selectedAssociate.rg || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Data de Nascimento</label>
                      <p className="text-gray-900">{new Date(selectedAssociate.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Clube</label>
                      <p className="text-gray-900">{selectedAssociate.club || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">CEP</label>
                      <p className="text-gray-900">{selectedAssociate.zipCode}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Rua</label>
                      <p className="text-gray-900">{selectedAssociate.street || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Bairro</label>
                      <p className="text-gray-900">{selectedAssociate.neighborhood}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Cidade</label>
                      <p className="text-gray-900">{selectedAssociate.city}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Estado</label>
                      <p className="text-gray-900">{selectedAssociate.state}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">Complemento</label>
                      <p className="text-gray-900">{selectedAssociate.complement || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedAssociate.observations && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Observações</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedAssociate.observations}</p>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button variant="outline" onClick={() => setShowViewModal(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => handlePrint(selectedAssociate)} className="bg-green-600 hover:bg-green-700">
                    Imprimir Ficha
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Cadastro de Associado */}
        <Dialog open={showAssociateModal} onOpenChange={setShowAssociateModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Associado</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAssociateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="associate-name">Nome Completo *</Label>
                  <Input
                    id="associate-name"
                    value={associateFormData.name}
                    onChange={(e) => setAssociateFormData({...associateFormData, name: e.target.value})}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="associate-email">Email *</Label>
                  <Input
                    id="associate-email"
                    type="email"
                    value={associateFormData.email}
                    onChange={(e) => setAssociateFormData({...associateFormData, email: e.target.value})}
                    required
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="associate-phone">Telefone</Label>
                  <Input
                    id="associate-phone"
                    value={associateFormData.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setAssociateFormData({...associateFormData, phone: formatted});
                    }}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <Label htmlFor="associate-birthDate">Data de Nascimento *</Label>
                  <Input
                    id="associate-birthDate"
                    type="date"
                    value={associateFormData.birthDate}
                    onChange={(e) => setAssociateFormData({...associateFormData, birthDate: e.target.value})}
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="associate-cpf">CPF</Label>
                  <Input
                    id="associate-cpf"
                    value={associateFormData.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      setAssociateFormData({...associateFormData, cpf: formatted});
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                {/* RG */}
                <div>
                  <Label htmlFor="associate-rg">RG</Label>
                  <Input
                    id="associate-rg"
                    value={associateFormData.rg}
                    onChange={(e) => setAssociateFormData({...associateFormData, rg: e.target.value})}
                  />
                </div>

                {/* Gênero */}
                <div>
                  <Label htmlFor="associate-gender">Gênero *</Label>
                  <Select value={associateFormData.gender} onValueChange={(value) => setAssociateFormData({...associateFormData, gender: value})}>
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
                  <Label htmlFor="associate-zipCode">CEP *</Label>
                  <Input
                    id="associate-zipCode"
                    value={associateFormData.zipCode}
                    onChange={(e) => setAssociateFormData({...associateFormData, zipCode: e.target.value})}
                    placeholder="00000-000"
                    required
                  />
                </div>

                {/* Rua */}
                <div>
                  <Label htmlFor="associate-street">Rua</Label>
                  <Input
                    id="associate-street"
                    value={associateFormData.street}
                    onChange={(e) => setAssociateFormData({...associateFormData, street: e.target.value})}
                  />
                </div>

                {/* Bairro */}
                <div>
                  <Label htmlFor="associate-neighborhood">Bairro *</Label>
                  <Input
                    id="associate-neighborhood"
                    value={associateFormData.neighborhood}
                    onChange={(e) => setAssociateFormData({...associateFormData, neighborhood: e.target.value})}
                    required
                  />
                </div>

                {/* Cidade */}
                <div>
                  <Label htmlFor="associate-city">Cidade *</Label>
                  <Input
                    id="associate-city"
                    value={associateFormData.city}
                    onChange={(e) => setAssociateFormData({...associateFormData, city: e.target.value})}
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <Label htmlFor="associate-state">Estado *</Label>
                  <Input
                    id="associate-state"
                    value={associateFormData.state}
                    onChange={(e) => setAssociateFormData({...associateFormData, state: e.target.value})}
                    placeholder="SP"
                    required
                  />
                </div>

                {/* Complemento */}
                <div>
                  <Label htmlFor="associate-complement">Complemento</Label>
                  <Input
                    id="associate-complement"
                    value={associateFormData.complement}
                    onChange={(e) => setAssociateFormData({...associateFormData, complement: e.target.value})}
                  />
                </div>

                {/* Clube */}
                <div>
                  <Label htmlFor="associate-club">Clube</Label>
                  <Input
                    id="associate-club"
                    value={associateFormData.club}
                    onChange={(e) => setAssociateFormData({...associateFormData, club: e.target.value})}
                  />
                </div>
              </div>

              {/* Foto do Associado */}
              <div>
                <div className="max-w-xs">
                  <ImageUpload
                    onImageSelect={(imageUrl) => setAssociateFormData({...associateFormData, photoUrl: imageUrl})}
                    currentImage={associateFormData.photoUrl}
                    maxSizeMB={5}
                    aspectRatio="aspect-square"
                    label="Foto do Associado *"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="associate-observations">Observações</Label>
                <Textarea
                  id="associate-observations"
                  value={associateFormData.observations}
                  onChange={(e) => setAssociateFormData({...associateFormData, observations: e.target.value})}
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAssociateModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createAssociateMutation.isPending}>
                  {createAssociateMutation.isPending ? "Cadastrando..." : "Cadastrar Associado"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Associado */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Associado</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedAssociate) {
                // Update mutation - será implementada
                console.log('Update:', associateFormData);
                setShowEditModal(false);
              }
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="edit-associate-name">Nome Completo *</Label>
                  <Input
                    id="edit-associate-name"
                    value={associateFormData.name}
                    onChange={(e) => setAssociateFormData({...associateFormData, name: e.target.value})}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="edit-associate-email">Email *</Label>
                  <Input
                    id="edit-associate-email"
                    type="email"
                    value={associateFormData.email}
                    onChange={(e) => setAssociateFormData({...associateFormData, email: e.target.value})}
                    required
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="edit-associate-phone">Telefone</Label>
                  <Input
                    id="edit-associate-phone"
                    value={associateFormData.phone}
                    onChange={(e) => setAssociateFormData({...associateFormData, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* Data de Nascimento */}
                <div>
                  <Label htmlFor="edit-associate-birthDate">Data de Nascimento *</Label>
                  <Input
                    id="edit-associate-birthDate"
                    type="date"
                    value={associateFormData.birthDate}
                    onChange={(e) => setAssociateFormData({...associateFormData, birthDate: e.target.value})}
                    required
                  />
                </div>

                {/* CPF */}
                <div>
                  <Label htmlFor="edit-associate-cpf">CPF</Label>
                  <Input
                    id="edit-associate-cpf"
                    value={associateFormData.cpf}
                    onChange={(e) => setAssociateFormData({...associateFormData, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                  />
                </div>

                {/* RG */}
                <div>
                  <Label htmlFor="edit-associate-rg">RG</Label>
                  <Input
                    id="edit-associate-rg"
                    value={associateFormData.rg}
                    onChange={(e) => setAssociateFormData({...associateFormData, rg: e.target.value})}
                  />
                </div>

                {/* Gênero */}
                <div>
                  <Label htmlFor="edit-associate-gender">Gênero *</Label>
                  <Select value={associateFormData.gender} onValueChange={(value) => setAssociateFormData({...associateFormData, gender: value})}>
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
                  <Label htmlFor="edit-associate-zipCode">CEP *</Label>
                  <Input
                    id="edit-associate-zipCode"
                    value={associateFormData.zipCode}
                    onChange={(e) => setAssociateFormData({...associateFormData, zipCode: e.target.value})}
                    placeholder="00000-000"
                    required
                  />
                </div>

                {/* Rua */}
                <div>
                  <Label htmlFor="edit-associate-street">Rua</Label>
                  <Input
                    id="edit-associate-street"
                    value={associateFormData.street}
                    onChange={(e) => setAssociateFormData({...associateFormData, street: e.target.value})}
                  />
                </div>

                {/* Bairro */}
                <div>
                  <Label htmlFor="edit-associate-neighborhood">Bairro *</Label>
                  <Input
                    id="edit-associate-neighborhood"
                    value={associateFormData.neighborhood}
                    onChange={(e) => setAssociateFormData({...associateFormData, neighborhood: e.target.value})}
                    required
                  />
                </div>

                {/* Cidade */}
                <div>
                  <Label htmlFor="edit-associate-city">Cidade *</Label>
                  <Input
                    id="edit-associate-city"
                    value={associateFormData.city}
                    onChange={(e) => setAssociateFormData({...associateFormData, city: e.target.value})}
                    required
                  />
                </div>

                {/* Estado */}
                <div>
                  <Label htmlFor="edit-associate-state">Estado *</Label>
                  <Input
                    id="edit-associate-state"
                    value={associateFormData.state}
                    onChange={(e) => setAssociateFormData({...associateFormData, state: e.target.value})}
                    placeholder="SP"
                    required
                  />
                </div>

                {/* Complemento */}
                <div>
                  <Label htmlFor="edit-associate-complement">Complemento</Label>
                  <Input
                    id="edit-associate-complement"
                    value={associateFormData.complement}
                    onChange={(e) => setAssociateFormData({...associateFormData, complement: e.target.value})}
                  />
                </div>

                {/* Clube */}
                <div>
                  <Label htmlFor="edit-associate-club">Clube</Label>
                  <Input
                    id="edit-associate-club"
                    value={associateFormData.club}
                    onChange={(e) => setAssociateFormData({...associateFormData, club: e.target.value})}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="edit-associate-observations">Observações</Label>
                <Textarea
                  id="edit-associate-observations"
                  value={associateFormData.observations}
                  onChange={(e) => setAssociateFormData({...associateFormData, observations: e.target.value})}
                  rows={3}
                />
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
              <DialogTitle className="text-center">Link de Auto-Cadastro - Associados</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 text-center">
              <p className="text-muted-foreground">
                Compartilhe este link ou QR code para que pessoas possam se cadastrar como associados.
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
                {import.meta.env.VITE_PRODUCTION_BASE_URL || window.location.origin}/self-registration?type=associate
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