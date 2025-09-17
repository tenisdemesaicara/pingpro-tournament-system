import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import RankingTable from "@/components/ranking-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AthleteWithStats, type Category } from "@shared/schema";
import { FileDown } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Ranking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeason, setSelectedSeason] = useState<string>(new Date().getFullYear().toString());

  const { data: athletes, isLoading } = useQuery<AthleteWithStats[]>({
    queryKey: ['/api/athletes/ranking', selectedCategory, selectedSeason],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedSeason) {
        params.append('season', selectedSeason);
      }
      const response = await fetch(`/api/athletes/ranking?${params}`);
      if (!response.ok) throw new Error('Failed to fetch athletes');
      return response.json();
    },
    enabled: !!selectedCategory && selectedCategory !== 'all',
    select: (data) => data || [],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: seasons = [] } = useQuery<number[]>({
    queryKey: ['/api/seasons'],
  });

  // Função para gerar relatório PDF
  const generateReport = () => {
    if (!filteredAthletes?.length || selectedCategory === "all") {
      return;
    }

    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Relatório de Ranking - Tênis de Mesa', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Categoria: ${selectedCategory}`, 14, 35);
    doc.text(`Temporada: ${selectedSeason}`, 14, 45);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 55);
    
    // Preparar dados para tabela
    const tableData = filteredAthletes.map((athlete, index) => [
      index + 1, // Posição
      athlete.name,
      athlete.club || '-',
      athlete.gender === 'masculino' ? 'Masculino' : 'Feminino',
      athlete.points?.toString() || '0',
      athlete.totalMatches?.toString() || '0',
      athlete.wins?.toString() || '0',
      athlete.losses?.toString() || '0',
      athlete.winRate ? (parseFloat(athlete.winRate.toString()) * 100).toFixed(1) + '%' : '0%'
    ]);
    
    // Criar tabela
    autoTable(doc, {
      head: [['Pos.', 'Nome', 'Clube', 'Gênero', 'Pontos', 'Jogos', 'Vitórias', 'Derrotas', 'Aproveitamento']],
      body: tableData,
      startY: 65,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [255, 165, 0] }, // Laranja
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        'contato@tenisdemesa.biz',
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'right' }
      );
    }
    
    // Download do PDF
    const fileName = `ranking_${selectedCategory.replace(/\s+/g, '_')}_${selectedSeason}.pdf`;
    doc.save(fileName);
  };


  const filteredAthletes = athletes?.filter(athlete => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         athlete.club?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = selectedGender === "all" || athlete.gender === selectedGender;
    return matchesSearch && matchesGender;
  }) || [];



  // Não precisamos mais do array hardcoded - usamos as categorias do banco
  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4 w-48"></div>
            <div className="h-4 bg-muted rounded mb-8 w-96"></div>
            <Card>
              <CardContent className="p-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                    <div className="flex space-x-6">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="text-center">
                          <div className="h-4 bg-muted rounded mb-1 w-8"></div>
                          <div className="h-3 bg-muted rounded w-12"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4" data-testid="page-title">
              Ranking Tênis de Mesa
            </h1>
            <p className="text-lg text-muted-foreground">
              Acompanhe o ranking completo por categoria
            </p>
          </div>
        </div>

        {/* FILTRO PRINCIPAL DE CATEGORIA */}
        <Card className="mb-8 gradient-orange-soft">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* TEMPORADA - FILTRO PRINCIPAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-lg font-semibold text-foreground mb-3 block">
                    Temporada
                  </label>
                  <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                    <SelectTrigger data-testid="select-season" className="h-12 text-lg">
                      <SelectValue placeholder="Selecione uma temporada" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((season) => (
                        <SelectItem key={season} value={season.toString()}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-lg font-semibold text-foreground mb-3 block">
                    Categoria
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-category" className="h-12 text-lg">
                      <SelectValue placeholder="Selecione uma categoria para ver o ranking" />
                    </SelectTrigger>
                  <SelectContent>
                    {categories
                      .slice()
                      .sort((a, b) => {
                        // Função para extrair idade das categorias
                        const extractAge = (name: string) => {
                          // Caso especial para Adulto (22-29 anos)
                          if (name.toLowerCase().includes('adulto')) {
                            return 22;
                          }
                          
                          const match = name.match(/(\d+)/);
                          return match ? parseInt(match[1]) : 999;
                        };
                        
                        // Verifica se é absoluto
                        const isAbsolutoA = a.name.toLowerCase().includes('absoluto');
                        const isAbsolutoB = b.name.toLowerCase().includes('absoluto');
                        
                        // Se ambos são absolutos, ordena alfabeticamente (A até D)
                        if (isAbsolutoA && isAbsolutoB) {
                          return a.name.localeCompare(b.name);
                        }
                        
                        // Absolutos vão para o final
                        if (isAbsolutoA) return 1;
                        if (isAbsolutoB) return -1;
                        
                        // Para categorias por idade, ordena por idade
                        const ageA = extractAge(a.name);
                        const ageB = extractAge(b.name);
                        
                        return ageA - ageB;
                      })
                      .map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                </div>
              </div>

              {/* BOTÃO DE RELATÓRIO */}
              {selectedCategory && selectedCategory !== "all" && (
                <div className="flex justify-end">
                  <Button
                    onClick={generateReport}
                    disabled={!filteredAthletes?.length}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="button-generate-report"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Gerar Relatório PDF
                  </Button>
                </div>
              )}

              {/* FILTROS SECUNDÁRIOS - SÓ APARECEM DEPOIS DE ESCOLHER CATEGORIA */}
              {selectedCategory && (
                <>
                  <hr className="my-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Buscar
                      </label>
                      <Input
                        id="search"
                        data-testid="input-search"
                        type="text"
                        placeholder="Nome ou clube..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Gênero
                      </label>
                      <Select value={selectedGender} onValueChange={setSelectedGender}>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>


        {/* SÓ MOSTRA O CONTEÚDO SE UMA CATEGORIA FOI ESCOLHIDA */}
        {selectedCategory ? (
          <>
            {/* TOP 3 ATLETAS - DISCRETO E MENOR ALTURA */}
            {filteredAthletes.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-foreground mb-4 text-center">
                  Top 3 Atletas - {selectedCategory}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filteredAthletes.slice(0, 3).map((athlete, index) => (
                    <Card 
                      key={athlete.id}
                      className={`material-elevation-1 ${index === 0 ? 'ring-1 ring-primary' : ''}`}
                      data-testid={`top-athlete-${index + 1}`}
                    >
                      <CardContent className="p-4 text-center">
                        <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-primary' : index === 1 ? 'bg-secondary' : 'bg-muted'
                        }`}>
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-primary-foreground' : index === 1 ? 'text-secondary-foreground' : 'text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1" data-testid={`top-athlete-name-${index + 1}`}>
                          {athlete.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-3" data-testid={`top-athlete-club-${index + 1}`}>
                          {athlete.club} - {athlete.city}, {athlete.state}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-foreground" data-testid={`top-athlete-points-${index + 1}`}>
                              {athlete.points || 0}
                            </div>
                            <div className="text-muted-foreground">Pontos</div>
                          </div>
                          <div>
                            <div className="font-semibold text-primary" data-testid={`top-athlete-wins-${index + 1}`}>
                              {athlete.wins || 0}
                            </div>
                            <div className="text-muted-foreground">Vitórias</div>
                          </div>
                          <div>
                            <div className="font-semibold text-secondary" data-testid={`top-athlete-winrate-${index + 1}`}>
                              {athlete.winRate ? athlete.winRate.toFixed(1) : '0.0'}%
                            </div>
                            <div className="text-muted-foreground">Taxa</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* RANKING COMPLETO */}
            <div className="mt-6">
              {filteredAthletes.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <span className="material-icons text-6xl text-muted-foreground mb-4 block">
                      emoji_events
                    </span>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhum atleta encontrado
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Não encontramos atletas com os filtros selecionados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <RankingTable 
                  athletes={filteredAthletes} 
                  title={`Ranking ${selectedCategory}`}
                  showHeader={true}
                />
              )}
            </div>
          </>
        ) : (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="pt-8 pb-12 text-center">
              <div className="mb-6">
                <span className="material-icons text-6xl text-muted-foreground mb-4 block">
                  emoji_events
                </span>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Selecione uma Categoria
                </h2>
                <p className="text-muted-foreground text-lg">
                  Escolha uma categoria acima para visualizar o ranking dos atletas
                </p>
              </div>
            </CardContent>
          </Card>
        )}


      </div>
    </div>
  );
}
