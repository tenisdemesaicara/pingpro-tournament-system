import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  Download, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { type Asset } from "@shared/schema";
import { format } from "date-fns";
import { saveAs } from "file-saver";

interface AssetSummary {
  totalAssets: number;
  totalValue: number;
  activeAssets: number;
  categoriesCount: number;
  averageAge: number;
  mostExpensiveAsset: Asset | null;
}

export default function Relatorios() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [situationFilter, setSituationFilter] = useState("");

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  // Calcular estatísticas dos assets
  const assetSummary: AssetSummary = {
    totalAssets: assets.length,
    totalValue: assets.reduce((sum, asset) => sum + (parseFloat(asset.acquisitionValue) || 0), 0),
    activeAssets: assets.filter(asset => asset.isActive).length,
    categoriesCount: new Set(assets.map(asset => asset.category)).size,
    averageAge: assets.length > 0 ? 
      assets.reduce((sum, asset) => {
        const acquisitionDate = new Date(asset.acquisitionDate);
        const ageInYears = (Date.now() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return sum + ageInYears;
      }, 0) / assets.length : 0,
    mostExpensiveAsset: assets.reduce((prev, current) => 
      (parseFloat(current.acquisitionValue) || 0) > (parseFloat(prev?.acquisitionValue || '0')) ? current : prev
    , null as Asset | null)
  };

  // Filtrar assets baseado nos filtros
  const filteredAssets = assets.filter(asset => {
    const matchesDateFrom = !dateFrom || new Date(asset.acquisitionDate) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(asset.acquisitionDate) <= new Date(dateTo);
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesSituation = !situationFilter || situationFilter === 'all' || asset.situation === situationFilter;
    
    return matchesDateFrom && matchesDateTo && matchesCategory && matchesSituation;
  });

  // Dados para gráficos
  const categoryStats = assets.reduce((acc, asset) => {
    const category = asset.category;
    const value = parseFloat(asset.acquisitionValue) || 0;
    
    if (!acc[category]) {
      acc[category] = { count: 0, value: 0 };
    }
    acc[category].count += 1;
    acc[category].value += value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const situationStats = assets.reduce((acc, asset) => {
    const situation = asset.situation;
    if (!acc[situation]) {
      acc[situation] = 0;
    }
    acc[situation] += 1;
    return acc;
  }, {} as Record<string, number>);

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
    const printContent = `
      <html>
        <head>
          <title>Relatório Patrimonial</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
            .summary-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Patrimonial</h1>
            <p>Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h3>${assetSummary.totalAssets}</h3>
              <p>Total de Bens</p>
            </div>
            <div class="summary-card">
              <h3>${assetSummary.totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</h3>
              <p>Valor Total</p>
            </div>
            <div class="summary-card">
              <h3>${assetSummary.categoriesCount}</h3>
              <p>Categorias</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Situação</th>
                <th>Data Aquisição</th>
                <th>Valor</th>
                <th>Localização</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssets.map(asset => `
                <tr>
                  <td>${asset.assetCode}</td>
                  <td>${asset.name}</td>
                  <td>${getCategoryLabel(asset.category)}</td>
                  <td>${getSituationLabel(asset.situation)}</td>
                  <td>${format(new Date(asset.acquisitionDate), 'dd/MM/yyyy')}</td>
                  <td>${parseFloat(asset.acquisitionValue).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                  <td>${asset.location}</td>
                  <td>${asset.responsible}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Relatório gerado pelo Sistema de Gestão Patrimonial</p>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([printContent], { type: 'text/html' });
    saveAs(blob, `relatorio-patrimonial-${format(new Date(), 'yyyy-MM-dd')}.html`);
  };

  const exportToExcel = () => {
    const csvContent = [
      // Cabeçalho
      ['Código', 'Nome', 'Categoria', 'Situação', 'Data Aquisição', 'Valor', 'Localização', 'Responsável'].join(','),
      // Dados
      ...filteredAssets.map(asset => [
        asset.assetCode,
        `"${asset.name}"`,
        `"${getCategoryLabel(asset.category)}"`,
        `"${getSituationLabel(asset.situation)}"`,
        format(new Date(asset.acquisitionDate), 'dd/MM/yyyy'),
        parseFloat(asset.acquisitionValue).toFixed(2),
        `"${asset.location}"`,
        `"${asset.responsible}"`
      ].join(','))
    ].join('\n');
    
    // Adicionar BOM para UTF-8 no Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `relatorio-patrimonial-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Carregando relatórios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-reports">Relatórios Patrimoniais</h1>
          <p className="text-muted-foreground">
            Análise completa do patrimônio da organização
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportToPDF}
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button 
            variant="outline"
            onClick={exportToExcel}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-assets">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetSummary.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {assetSummary.activeAssets} ativos
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-value">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetSummary.totalValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor de aquisição total
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-categories">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetSummary.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">
              Tipos diferentes
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-average-age">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idade Média</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetSummary.averageAge.toFixed(1)} anos
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo médio desde aquisição
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date-from">Data Inicial</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            
            <div>
              <Label htmlFor="date-to">Data Final</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
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
                <SelectTrigger data-testid="select-situation-filter">
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

      {/* Estatísticas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([category, stats]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getCategoryLabel(category)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {stats.count} itens
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    {stats.value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Situação dos Bens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(situationStats).map(([situation, count]) => (
                <div key={situation} className="flex items-center justify-between">
                  <Badge variant="outline">{getSituationLabel(situation)}</Badge>
                  <div className="text-sm font-medium">
                    {count} ({((count / assets.length) * 100).toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Listagem Detalhada ({filteredAssets.length} itens)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="table-detailed-report">
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
                  <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                    <TableCell className="font-mono text-sm">
                      {asset.assetCode}
                    </TableCell>
                    <TableCell className="font-medium">
                      {asset.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(asset.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getSituationLabel(asset.situation)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(asset.acquisitionDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {parseFloat(asset.acquisitionValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.responsible}</TableCell>
                  </TableRow>
                ))}
                {filteredAssets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      Nenhum item encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Final */}
      {filteredAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredAssets.length}
                </div>
                <p className="text-sm text-muted-foreground">Itens filtrados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredAssets
                    .reduce((sum, asset) => sum + (parseFloat(asset.acquisitionValue) || 0), 0)
                    .toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                </div>
                <p className="text-sm text-muted-foreground">Valor total filtrado</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredAssets.filter(asset => asset.isActive).length}
                </div>
                <p className="text-sm text-muted-foreground">Ativos no período</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}