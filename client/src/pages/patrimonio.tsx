import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Edit, Trash2, Plus, Filter, Package, CheckCircle, XCircle, AlertCircle, FileText, Download, TrendingUp, PieChart, Activity } from "lucide-react";
import { format } from "date-fns";
import { saveAs } from "file-saver";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Asset } from "@shared/schema";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAssetSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { z } from "zod";

type AssetFormData = z.infer<typeof insertAssetSchema>;

interface AssetSummary {
  totalAssets: number;
  totalValue: number;
  activeAssets: number;
  categoriesCount: number;
  averageAge: number;
  mostExpensiveAsset: Asset | null;
}

// Componente de Relatórios integrado
function ReportsSection({ assets }: { assets: Asset[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [situationFilter, setSituationFilter] = useState("");

  // Calcular estatísticas dos assets
  const assetSummary: AssetSummary = {
    totalAssets: assets.length,
    totalValue: assets.reduce((sum, asset) => sum + ((asset.quantity || 1) * parseFloat(asset.acquisitionValue) || 0), 0),
    activeAssets: assets.filter(asset => asset.isActive).length,
    categoriesCount: new Set(assets.map(asset => asset.category)).size,
    averageAge: assets.length > 0 ? 
      assets.reduce((sum, asset) => {
        const acquisitionDate = new Date(asset.acquisitionDate);
        const ageInYears = (Date.now() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return sum + ageInYears;
      }, 0) / assets.length : 0,
    mostExpensiveAsset: assets.reduce((prev, current) => {
      const currentTotal = ((current.quantity || 1) * parseFloat(current.acquisitionValue)) || 0;
      const prevTotal = prev ? ((prev.quantity || 1) * parseFloat(prev.acquisitionValue)) || 0 : 0;
      return currentTotal > prevTotal ? current : prev;
    }, null as Asset | null)
  };

  // Filtrar assets baseado nos filtros
  const filteredAssets = assets.filter(asset => {
    const matchesDateFrom = !dateFrom || new Date(asset.acquisitionDate) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(asset.acquisitionDate) <= new Date(dateTo);
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesSituation = !situationFilter || situationFilter === 'all' || asset.situation === situationFilter;
    
    return matchesDateFrom && matchesDateTo && matchesCategory && matchesSituation;
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      movel: "Móvel",
      imovel: "Imóvel", 
      eletronico: "Eletrônico",
      material_esportivo: "Material Esportivo",
      equipamento_mesa: "Equipamento de Mesa",
      material_escritorio: "Material de Escritório",
      veiculo: "Veículo",
      outros: "Outros"
    };
    return labels[category] || category;
  };

  const getSituationLabel = (situation: string) => {
    const labels: Record<string, string> = {
      in_use: "Em Uso",
      loaned: "Emprestado", 
      stored: "Armazenado",
      maintenance: "Manutenção",
      disposed: "Descartado"
    };
    return labels[situation] || situation;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Título centralizado
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const titleText = 'Relatório Patrimonial';
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - titleWidth) / 2, 25);
    
    // Data de geração centralizada
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateText = `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 35);
    
    // Cards de Resumo com bordas
    const cardWidth = 50;
    const cardHeight = 25;
    const cardSpacing = 10;
    const startX = (pageWidth - (3 * cardWidth + 2 * cardSpacing)) / 2;
    let yPosition = 50;
    
    // Card 1 - Total de Bens
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(startX, yPosition, cardWidth, cardHeight);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const totalAssetsText = assetSummary.totalAssets.toString();
    const totalAssetsWidth = doc.getTextWidth(totalAssetsText);
    doc.text(totalAssetsText, startX + (cardWidth - totalAssetsWidth) / 2, yPosition + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const totalAssetsLabel = 'Total de Bens';
    const totalAssetsLabelWidth = doc.getTextWidth(totalAssetsLabel);
    doc.text(totalAssetsLabel, startX + (cardWidth - totalAssetsLabelWidth) / 2, yPosition + 20);
    
    // Card 2 - Valor Total
    const card2X = startX + cardWidth + cardSpacing;
    doc.rect(card2X, yPosition, cardWidth, cardHeight);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const totalValueText = assetSummary.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    const totalValueWidth = doc.getTextWidth(totalValueText);
    doc.text(totalValueText, card2X + (cardWidth - totalValueWidth) / 2, yPosition + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const totalValueLabel = 'Valor Total';
    const totalValueLabelWidth = doc.getTextWidth(totalValueLabel);
    doc.text(totalValueLabel, card2X + (cardWidth - totalValueLabelWidth) / 2, yPosition + 20);
    
    // Card 3 - Categorias
    const card3X = card2X + cardWidth + cardSpacing;
    doc.rect(card3X, yPosition, cardWidth, cardHeight);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const categoriesText = assetSummary.categoriesCount.toString();
    const categoriesWidth = doc.getTextWidth(categoriesText);
    doc.text(categoriesText, card3X + (cardWidth - categoriesWidth) / 2, yPosition + 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const categoriesLabel = 'Categorias';
    const categoriesLabelWidth = doc.getTextWidth(categoriesLabel);
    doc.text(categoriesLabel, card3X + (cardWidth - categoriesLabelWidth) / 2, yPosition + 20);
    
    // Espaçamento antes da tabela
    yPosition += cardHeight + 20;
    
    // Tabela com dados
    const tableData = filteredAssets.map(asset => [
      asset.assetCode,
      asset.name.length > 25 ? asset.name.substring(0, 25) + '...' : asset.name,
      getCategoryLabel(asset.category).length > 15 ? getCategoryLabel(asset.category).substring(0, 15) + '...' : getCategoryLabel(asset.category),
      getSituationLabel(asset.situation),
      asset.quantity || 1,
      parseFloat(asset.acquisitionValue).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
      ((asset.quantity || 1) * parseFloat(asset.acquisitionValue)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}),
      asset.location.length > 18 ? asset.location.substring(0, 18) + '...' : asset.location
    ]);
    
    // Calcular largura disponível para a tabela
    const marginLeft = 5;
    const marginRight = 5;
    const availableWidth = pageWidth - marginLeft - marginRight;
    
    autoTable(doc, {
      head: [['Código', 'Nome', 'Categoria', 'Situação', 'Qtd', 'Valor Unit.', 'Valor Total', 'Localização']],
      body: tableData,
      startY: yPosition,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { cellWidth: 18 },  // Código
        1: { cellWidth: 35 },  // Nome
        2: { cellWidth: 22 },  // Categoria
        3: { cellWidth: 20 },  // Situação
        4: { cellWidth: 12, halign: 'center' },  // Quantidade
        5: { cellWidth: 24 },  // Valor Unitário
        6: { cellWidth: 26 },  // Valor Total
        7: { cellWidth: 25 }   // Localização
      },
      margin: { left: marginLeft, right: marginRight },
      tableWidth: availableWidth,
      theme: 'plain'
    });
    
    // Rodapé elegante
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Linha separadora no rodapé
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Relatório gerado pelo Sistema de Gestão Patrimonial', 20, pageHeight - 12);
      
      // Número da página
      const pageText = `Página ${i} de ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - pageTextWidth - 20, pageHeight - 12);
    }
    
    // Salvar
    doc.save(`relatorio-patrimonial-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };


  return (
    <div className="space-y-6">
      {/* Header dos Relatórios */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios Patrimoniais</h2>
          <p className="text-gray-600 dark:text-gray-400">Análises e exportações detalhadas</p>
        </div>
        <Button variant="outline" onClick={exportToPDF} data-testid="button-export-pdf">
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-assets">{assetSummary.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {assetSummary.activeAssets} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-value">
              {assetSummary.totalValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Em bens patrimoniais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-categories">{assetSummary.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">
              Tipos diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idade Média</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-average-age">
              {assetSummary.averageAge.toFixed(1)} anos
            </div>
            <p className="text-xs text-muted-foreground">
              Desde aquisição
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom">Data Inicial</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Data Final</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div>
              <Label htmlFor="categoryFilterReport">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-report">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="movel">Móvel</SelectItem>
                  <SelectItem value="imovel">Imóvel</SelectItem>
                  <SelectItem value="eletronico">Eletrônico</SelectItem>
                  <SelectItem value="material_esportivo">Material Esportivo</SelectItem>
                  <SelectItem value="equipamento_mesa">Equipamento de Mesa</SelectItem>
                  <SelectItem value="material_escritorio">Material de Escritório</SelectItem>
                  <SelectItem value="veiculo">Veículo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="situationFilterReport">Situação</Label>
              <Select value={situationFilter} onValueChange={setSituationFilter}>
                <SelectTrigger data-testid="select-situation-report">
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="in_use">Em Uso</SelectItem>
                  <SelectItem value="loaned">Emprestado</SelectItem>
                  <SelectItem value="stored">Armazenado</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="disposed">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Detalhamento Patrimonial ({filteredAssets.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Data Aquisição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id} data-testid={`report-row-${asset.id}`}>
                    <TableCell className="font-mono text-sm">{asset.assetCode}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCategoryLabel(asset.category)}</Badge>
                    </TableCell>
                    <TableCell>{getSituationLabel(asset.situation)}</TableCell>
                    <TableCell>{format(new Date(asset.acquisitionDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseFloat(asset.acquisitionValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.responsible}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Patrimonio() {
  const [currentTab, setCurrentTab] = useState("assets");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [situationFilter, setSituationFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(insertAssetSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "outros",
      brand: "",
      model: "",
      serialNumber: "",
      acquisitionDate: "",
      supplier: "",
      invoiceNumber: "",
      quantity: 1,
      acquisitionValue: "0",
      acquisitionMethod: "compra",
      location: "",
      responsible: "",
      situation: "in_use",
      condition: "good",
      notes: "",
      photoUrls: [],
    },
  });

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const createAssetMutation = useMutation({
    mutationFn: (data: AssetFormData) => apiRequest('POST', '/api/assets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Sucesso!",
        description: "Bem patrimonial cadastrado com sucesso.",
      });
      setShowCreateModal(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar bem patrimonial.",
        variant: "destructive",
      });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssetFormData> }) => 
      apiRequest('PUT', `/api/assets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Sucesso!",
        description: "Bem patrimonial atualizado com sucesso.",
      });
      setShowEditModal(false);
      setSelectedAsset(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar bem patrimonial.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/assets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Sucesso!",
        description: "Bem patrimonial excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir bem patrimonial.",
        variant: "destructive",
      });
    },
  });

  const toggleAssetStatusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => 
      apiRequest('PUT', `/api/assets/${id}/${active ? 'activate' : 'inactivate'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      toast({
        title: "Sucesso!",
        description: "Status atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit: SubmitHandler<AssetFormData> = (data) => {
    if (selectedAsset && showEditModal) {
      updateAssetMutation.mutate({ id: selectedAsset.id, data });
    } else {
      createAssetMutation.mutate(data);
    }
  };

  const openEditModal = (asset: Asset) => {
    setSelectedAsset(asset);
    form.reset({
      name: asset.name,
      description: asset.description || "",
      category: asset.category as any,
      brand: asset.brand || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      acquisitionDate: asset.acquisitionDate,
      supplier: asset.supplier || "",
      invoiceNumber: asset.invoiceNumber || "",
      quantity: asset.quantity || 1,
      acquisitionValue: asset.acquisitionValue.toString(),
      acquisitionMethod: asset.acquisitionMethod as any,
      location: asset.location,
      responsible: asset.responsible,
      situation: asset.situation as any,
      condition: asset.condition as any,
      notes: asset.notes || "",
    });
    setShowEditModal(true);
  };

  const openViewModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowViewModal(true);
  };

  const filteredAssets = assets?.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesSituation = !situationFilter || situationFilter === 'all' || asset.situation === situationFilter;
    
    return matchesSearch && matchesCategory && matchesSituation;
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      movel: "Móvel",
      imovel: "Imóvel", 
      eletronico: "Eletrônico",
      material_esportivo: "Material Esportivo",
      equipamento_mesa: "Equipamento de Mesa",
      material_escritorio: "Material de Escritório",
      veiculo: "Veículo",
      outros: "Outros"
    };
    return labels[category] || category;
  };

  const getSituationLabel = (situation: string) => {
    const labels: Record<string, string> = {
      in_use: "Em Uso",
      loaned: "Emprestado",
      stored: "Armazenado", 
      maintenance: "Manutenção",
      disposed: "Descartado"
    };
    return labels[situation] || situation;
  };

  const getSituationIcon = (situation: string, isActive: boolean) => {
    if (!isActive) return <XCircle className="h-4 w-4 text-red-500" />;
    
    switch (situation) {
      case 'in_use':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'maintenance':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'stored':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Controle Patrimonial</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie todos os bens do clube</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            data-testid="button-create-asset"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Bem
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assets" data-testid="tab-assets">Bens Patrimoniais</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">Relatórios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="assets" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Nome, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="movel">Móvel</SelectItem>
                    <SelectItem value="imovel">Imóvel</SelectItem>
                    <SelectItem value="eletronico">Eletrônico</SelectItem>
                    <SelectItem value="material_esportivo">Material Esportivo</SelectItem>
                    <SelectItem value="equipamento_mesa">Equipamento de Mesa</SelectItem>
                    <SelectItem value="material_escritorio">Material de Escritório</SelectItem>
                    <SelectItem value="veiculo">Veículo</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="situation">Situação</Label>
                <Select value={situationFilter} onValueChange={setSituationFilter}>
                  <SelectTrigger data-testid="select-situation">
                    <SelectValue placeholder="Todas as situações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    <SelectItem value="in_use">Em Uso</SelectItem>
                    <SelectItem value="loaned">Emprestado</SelectItem>
                    <SelectItem value="stored">Armazenado</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="disposed">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Bens Patrimoniais ({filteredAssets?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Valor Unit.</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets?.map((asset) => (
                    <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                      <TableCell className="font-mono text-sm">{asset.assetCode}</TableCell>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryLabel(asset.category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSituationIcon(asset.situation, asset.isActive || false)}
                          <span className="text-sm">{getSituationLabel(asset.situation)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getConditionColor(asset.condition)}>
                          {asset.condition === 'new' && 'Novo'}
                          {asset.condition === 'good' && 'Bom'}
                          {asset.condition === 'fair' && 'Regular'}
                          {asset.condition === 'poor' && 'Ruim'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {asset.quantity || 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCurrency(asset.acquisitionValue)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {formatCurrency(((asset.quantity || 1) * parseFloat(asset.acquisitionValue)).toString())}
                      </TableCell>
                      <TableCell className="text-sm">{asset.location}</TableCell>
                      <TableCell>
                        <Badge variant={(asset.isActive || false) ? "default" : "destructive"}>
                          {(asset.isActive || false) ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(asset)}
                            data-testid={`button-view-${asset.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(asset)}
                            data-testid={`button-edit-${asset.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAssetStatusMutation.mutate({ 
                              id: asset.id, 
                              active: !(asset.isActive || false)
                            })}
                            data-testid={`button-toggle-${asset.id}`}
                          >
                            {(asset.isActive || false) ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAssetMutation.mutate(asset.id)}
                            data-testid={`button-delete-${asset.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-6">
            <ReportsSection assets={assets || []} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedAsset(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showEditModal ? "Editar Bem Patrimonial" : "Novo Bem Patrimonial"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="acquisition">Aquisição</TabsTrigger>
                  <TabsTrigger value="management">Gestão</TabsTrigger>
                  <TabsTrigger value="photos">Fotos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do bem" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category-form">
                                <SelectValue placeholder="Selecione a categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="movel">Móvel</SelectItem>
                              <SelectItem value="imovel">Imóvel</SelectItem>
                              <SelectItem value="eletronico">Eletrônico</SelectItem>
                              <SelectItem value="material_esportivo">Material Esportivo</SelectItem>
                              <SelectItem value="equipamento_mesa">Equipamento de Mesa</SelectItem>
                              <SelectItem value="material_escritorio">Material de Escritório</SelectItem>
                              <SelectItem value="veiculo">Veículo</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrição detalhada do bem" 
                            {...field} 
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Marca" {...field} data-testid="input-brand" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input placeholder="Modelo" {...field} data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série</FormLabel>
                          <FormControl>
                            <Input placeholder="Número de série" {...field} data-testid="input-serial" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="acquisition" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="acquisitionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Aquisição *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-acquisition-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="acquisitionMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Aquisição *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-acquisition-method">
                                <SelectValue placeholder="Como foi adquirido" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="compra">Compra</SelectItem>
                              <SelectItem value="doacao">Doação</SelectItem>
                              <SelectItem value="patrocinio">Patrocínio</SelectItem>
                              <SelectItem value="transferencia">Transferência</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fornecedor</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do fornecedor" {...field} data-testid="input-supplier" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número da Nota</FormLabel>
                          <FormControl>
                            <Input placeholder="Número da nota fiscal" {...field} data-testid="input-invoice" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              step="1" 
                              placeholder="1" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="acquisitionValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Unitário *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid="input-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col justify-end">
                      <FormLabel>Valor Total</FormLabel>
                      <div className="h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-center font-mono text-sm">
                        {(() => {
                          const quantity = form.watch("quantity") || 1;
                          const unitValue = parseFloat(form.watch("acquisitionValue") || "0");
                          const totalValue = quantity * unitValue;
                          return totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        })()}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização *</FormLabel>
                          <FormControl>
                            <Input placeholder="Onde está localizado" {...field} data-testid="input-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="responsible"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável *</FormLabel>
                          <FormControl>
                            <Input placeholder="Quem é o responsável" {...field} data-testid="input-responsible" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="situation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Situação *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-situation-form">
                                <SelectValue placeholder="Situação atual" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in_use">Em Uso</SelectItem>
                              <SelectItem value="loaned">Emprestado</SelectItem>
                              <SelectItem value="stored">Armazenado</SelectItem>
                              <SelectItem value="maintenance">Manutenção</SelectItem>
                              <SelectItem value="disposed">Descartado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado de Conservação *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-condition">
                                <SelectValue placeholder="Estado do bem" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new">Novo</SelectItem>
                              <SelectItem value="good">Bom</SelectItem>
                              <SelectItem value="fair">Regular</SelectItem>
                              <SelectItem value="poor">Ruim</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observações adicionais" 
                            {...field} 
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="photos" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Fotos do Item</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Adicione fotos do item patrimonial para facilitar a identificação. 
                      {navigator.mediaDevices ? "Você pode tirar fotos diretamente com a câmera do dispositivo." : ""}
                    </p>
                    
                    <FormField
                      control={form.control}
                      name="photoUrls"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <ImageUpload
                              images={field.value || []}
                              onImagesChange={field.onChange}
                              maxImages={5}
                              disabled={false}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedAsset(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                  data-testid="button-save"
                >
                  {(createAssetMutation.isPending || updateAssetMutation.isPending) ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={() => {
        setShowViewModal(false);
        setSelectedAsset(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Bem Patrimonial</DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Código</Label>
                  <p className="font-mono text-lg">{selectedAsset.assetCode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={(selectedAsset.isActive || false) ? "default" : "destructive"}>
                    {(selectedAsset.isActive || false) ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-lg font-semibold">{selectedAsset.name}</p>
              </div>

              {selectedAsset.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Descrição</Label>
                  <p>{selectedAsset.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                  <p>{getCategoryLabel(selectedAsset.category)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Situação</Label>
                  <div className="flex items-center gap-2">
                    {getSituationIcon(selectedAsset.situation, selectedAsset.isActive || false)}
                    <span>{getSituationLabel(selectedAsset.situation)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Marca</Label>
                  <p>{selectedAsset.brand || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Modelo</Label>
                  <p>{selectedAsset.model || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Série</Label>
                  <p className="font-mono text-sm">{selectedAsset.serialNumber || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Quantidade</Label>
                  <p className="font-semibold text-lg">{selectedAsset.quantity || 1}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Valor Unitário</Label>
                  <p className="font-semibold text-lg">{formatCurrency(selectedAsset.acquisitionValue)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Valor Total</Label>
                  <p className="font-semibold text-lg text-blue-600">
                    {formatCurrency(((selectedAsset.quantity || 1) * parseFloat(selectedAsset.acquisitionValue)).toString())}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Data de Aquisição</Label>
                <p>{new Date(selectedAsset.acquisitionDate).toLocaleDateString('pt-BR')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Localização</Label>
                  <p>{selectedAsset.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Responsável</Label>
                  <p>{selectedAsset.responsible}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Estado de Conservação</Label>
                <Badge className={getConditionColor(selectedAsset.condition)}>
                  {selectedAsset.condition === 'new' && 'Novo'}
                  {selectedAsset.condition === 'good' && 'Bom'}
                  {selectedAsset.condition === 'fair' && 'Regular'}
                  {selectedAsset.condition === 'poor' && 'Ruim'}
                </Badge>
              </div>

              {selectedAsset.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Observações</Label>
                  <p>{selectedAsset.notes}</p>
                </div>
              )}
              
              {/* Seção de Fotos */}
              {selectedAsset.photoUrls && selectedAsset.photoUrls.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Fotos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {selectedAsset.photoUrls.map((url, index) => (
                      <div key={index} className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={url} 
                          alt={`Foto ${index + 1} de ${selectedAsset.name}`}
                          className="w-full h-full object-contain rounded-lg border hover:scale-105 transition-transform duration-200"
                          data-testid={`view-image-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}