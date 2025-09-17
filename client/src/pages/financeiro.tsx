import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Payment, InsertPayment, Athlete, Revenue, InsertRevenue, Expense, InsertExpense } from "@shared/schema";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FinanceiroSimples() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cobrancas");
  
  // Função para obter primeiro e último dia do mês atual
  const getCurrentMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };
  
  const currentMonthDates = getCurrentMonthDates();
  
  // States para Cobranças
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAthlete, setFilterAthlete] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState(currentMonthDates.start);
  const [filterEndDate, setFilterEndDate] = useState(currentMonthDates.end);

  // States para Receitas
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [isEditRevenueDialogOpen, setIsEditRevenueDialogOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);
  const [revenueFormData, setRevenueFormData] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "mensalidade",
    paymentMethod: "pix",
    notes: "",
  });
  const [revenueFilterCategory, setRevenueFilterCategory] = useState("all");
  const [revenueFilterPaymentMethod, setRevenueFilterPaymentMethod] = useState("all");
  const [revenueFilterStartDate, setRevenueFilterStartDate] = useState(currentMonthDates.start);
  const [revenueFilterEndDate, setRevenueFilterEndDate] = useState(currentMonthDates.end);

  // States para Despesas
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    category: "material",
    paymentMethod: "pix",
    notes: "",
  });
  const [expenseFilterCategory, setExpenseFilterCategory] = useState("all");
  const [expenseFilterPaymentMethod, setExpenseFilterPaymentMethod] = useState("all");
  const [expenseFilterStartDate, setExpenseFilterStartDate] = useState(currentMonthDates.start);
  const [expenseFilterEndDate, setExpenseFilterEndDate] = useState(currentMonthDates.end);
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "pix",
  });
  const [editFormData, setEditFormData] = useState({
    amount: "",
    dueDate: "",
    reference: "",
    description: "",
  });

  // Form states
  const [formData, setFormData] = useState({
    amount: "",
    dueDate: "",
    reference: "",
    description: "",
  });

  // Queries
  const { data: payments } = useQuery({
    queryKey: ['/api/payments'],
  });

  const { data: athletes } = useQuery({
    queryKey: ['/api/athletes'],
  });

  const { data: revenues } = useQuery({
    queryKey: ['/api/revenues'],
  });

  const { data: expenses } = useQuery({
    queryKey: ['/api/expenses'],
  });

  // Mutation para criar pagamento
  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      const response = await apiRequest('POST', '/api/payments', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsCreateDialogOpen(false);
      setFormData({ amount: "", dueDate: "", reference: "", description: "" });
      setSelectedAthletes([]);
      toast({
        title: "Sucesso!",
        description: "Pagamentos criados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pagamentos.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar receita
  const createRevenueMutation = useMutation({
    mutationFn: async (data: InsertRevenue) => {
      const response = await apiRequest('POST', '/api/revenues', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
      setIsRevenueDialogOpen(false);
      setRevenueFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "mensalidade",
        paymentMethod: "pix",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Receita criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar receita.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar despesa
  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      const response = await apiRequest('POST', '/api/expenses', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      setIsExpenseDialogOpen(false);
      setExpenseFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "material",
        paymentMethod: "pix",
        notes: "",
      });
      toast({
        title: "Sucesso!",
        description: "Despesa criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar despesa.",
        variant: "destructive",
      });
    },
  });

  // Mutation para marcar como pago
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ paymentId, paymentDate, paymentMethod }: { paymentId: string, paymentDate: string, paymentMethod: string }) => {
      const response = await apiRequest('PATCH', `/api/payments/${paymentId}`, { 
        status: "paid",
        paymentDate, 
        paymentMethod 
      });
      const text = await response.text();
      if (text) {
        try {
          return JSON.parse(text);
        } catch {
          return { success: true };
        }
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsPayDialogOpen(false);
      setSelectedPayment(null);
      toast({
        title: "Sucesso!",
        description: "Pagamento marcado como pago.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar pagamento como pago.",
        variant: "destructive",
      });
    },
  });

  // Mutation para editar pagamento
  const editPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, data }: { paymentId: string, data: Partial<InsertPayment> }) => {
      const response = await apiRequest('PUT', `/api/payments/${paymentId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setIsEditDialogOpen(false);
      setSelectedPayment(null);
      toast({
        title: "Sucesso!",
        description: "Pagamento editado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao editar pagamento.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir pagamento
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiRequest('DELETE', `/api/payments/${paymentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Sucesso!",
        description: "Pagamento excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir pagamento.",
        variant: "destructive",
      });
    },
  });

  // Função para criar pagamentos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Formulário enviado!");
    console.log("Dados:", formData);
    console.log("Atletas selecionados:", selectedAthletes);

    // Validações
    if (!formData.amount || !formData.dueDate || !formData.reference) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: valor, data de vencimento e referência.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAthletes.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um atleta ou associado.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar um pagamento para cada atleta selecionado
      for (const athleteId of selectedAthletes) {
        await createPaymentMutation.mutateAsync({
          amount: formData.amount,
          dueDate: formData.dueDate,
          reference: formData.reference,
          description: formData.description || null,
          status: "pending",
          athleteId,
        });
      }
    } catch (error) {
      console.error("Erro ao criar pagamentos:", error);
    }
  };

  // Função para marcar pagamento como pago
  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;

    try {
      await markAsPaidMutation.mutateAsync({
        paymentId: selectedPayment.id,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
      });
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
    }
  };

  const openPayDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsPayDialogOpen(true);
  };

  const openEditDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditFormData({
      amount: payment.amount,
      dueDate: payment.dueDate,
      reference: payment.reference || "",
      description: payment.description || "",
    });
    setIsEditDialogOpen(true);
  };

  // Função para editar pagamento
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;

    // Validações
    if (!editFormData.amount || !editFormData.dueDate || !editFormData.reference) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: valor, data de vencimento e referência.",
        variant: "destructive",
      });
      return;
    }

    try {
      await editPaymentMutation.mutateAsync({
        paymentId: selectedPayment.id,
        data: editFormData,
      });
    } catch (error) {
      console.error("Erro ao editar pagamento:", error);
    }
  };

  // Função para excluir pagamento
  const handleDeletePayment = async (paymentId: string) => {
    if (confirm("Tem certeza que deseja excluir este pagamento?")) {
      try {
        await deletePaymentMutation.mutateAsync(paymentId);
      } catch (error) {
        console.error("Erro ao excluir pagamento:", error);
      }
    }
  };

  // Função para gerar relatório financeiro completo
  const generateReport = async () => {
    if (!payments || !athletes || !revenues || !expenses || 
        !Array.isArray(payments) || !Array.isArray(athletes) || 
        !Array.isArray(revenues) || !Array.isArray(expenses)) {
      toast({
        title: "Erro",
        description: "Dados não carregados ainda.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Importar jsPDF e autoTable dinamicamente
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      let currentY = 20;
    
      // Configurar fonte
      doc.setFont("helvetica");
    
      // Cabeçalho do relatório
      doc.setFontSize(18);
      doc.setTextColor(255, 102, 0); // Cor laranja
      doc.text("PONG PRO - RELATÓRIO FINANCEIRO COMPLETO", 20, currentY);
      currentY += 10;
    
      // Data de geração
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, currentY);
      currentY += 5;
      doc.text(`Contato: contato@tenisdemesa.biz`, 20, currentY);
      currentY += 15;

      // Calcular totais gerais
      const totalReceitas = revenues.reduce((sum: number, r: any) => sum + parseFloat(r.amount.toString()), 0);
      const totalDespesas = expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount.toString()), 0);
      const totalCobrancasPagas = payments.filter((p: any) => p.status === "paid").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      const totalCobrancasPendentes = payments.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      const totalCobrancasVencidas = payments.filter((p: any) => p.status === "overdue").reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
      const saldoLiquido = (totalReceitas + totalCobrancasPagas) - totalDespesas;

      // Resumo Executivo
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("RESUMO EXECUTIVO", 20, currentY);
      currentY += 10;

      doc.setFontSize(10);
      const resumoData = [
        ['RECEITAS TOTAIS', `R$ ${totalReceitas.toFixed(2)}`],
        ['COBRANÇAS PAGAS', `R$ ${totalCobrancasPagas.toFixed(2)}`],
        ['COBRANÇAS PENDENTES', `R$ ${totalCobrancasPendentes.toFixed(2)}`],
        ['COBRANÇAS VENCIDAS', `R$ ${totalCobrancasVencidas.toFixed(2)}`],
        ['DESPESAS TOTAIS', `R$ ${totalDespesas.toFixed(2)}`],
        ['SALDO LÍQUIDO', `R$ ${saldoLiquido.toFixed(2)}`]
      ];

      autoTable(doc, {
        startY: currentY,
        body: resumoData,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 249, 250] },
          1: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Análise por categoria
      doc.setFontSize(12);
      doc.text("ANÁLISE POR CATEGORIA", 20, currentY);
      currentY += 8;

      // Receitas por categoria
      const receitasPorCategoria = revenues.reduce((acc: Record<string, number>, r: any) => {
        const categoria = r.category === 'mensalidades' ? 'Mensalidades' :
                         r.category === 'torneios' ? 'Torneios' :
                         r.category === 'equipamentos' ? 'Equipamentos' : 'Outros';
        acc[categoria] = (acc[categoria] || 0) + parseFloat(r.amount.toString());
        return acc;
      }, {} as Record<string, number>);

      const receitasData = Object.entries(receitasPorCategoria).map(([cat, valor]) => 
        [`Receitas - ${cat}`, `R$ ${(valor as number).toFixed(2)}`]
      );

      // Despesas por categoria  
      const despesasPorCategoria = expenses.reduce((acc: Record<string, number>, e: any) => {
        const categoria = e.category === 'aluguel' ? 'Aluguel' :
                         e.category === 'equipamentos' ? 'Equipamentos' :
                         e.category === 'marketing' ? 'Marketing' : 'Outros';
        acc[categoria] = (acc[categoria] || 0) + parseFloat(e.amount.toString());
        return acc;
      }, {} as Record<string, number>);

      const despesasData = Object.entries(despesasPorCategoria).map(([cat, valor]) => 
        [`Despesas - ${cat}`, `R$ ${(valor as number).toFixed(2)}`]
      );

      autoTable(doc, {
        startY: currentY,
        body: [...receitasData, ...despesasData],
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 2
        },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Nova página para detalhes
      doc.addPage();
      currentY = 20;

      // Seção de Cobranças
      doc.setFontSize(14);
      doc.setTextColor(255, 102, 0);
      doc.text("DETALHAMENTO DE COBRANÇAS", 20, currentY);
      currentY += 10;

      const cobrancasData = payments.map((payment: any) => {
        const athlete = athletes?.find((a: any) => a.id === payment.athleteId);
        return [
          athlete?.name || "N/A",
          athlete?.type || "N/A",
          `R$ ${parseFloat(payment.amount).toFixed(2)}`,
          new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('pt-BR'),
          payment.status === "paid" ? "Pago" : payment.status === "pending" ? "Pendente" : "Vencido",
          payment.reference || ""
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Nome', 'Tipo', 'Valor', 'Vencimento', 'Status', 'Referência']],
        body: cobrancasData,
        theme: 'striped',
        headStyles: {
          fillColor: [255, 102, 0],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Seção de Receitas
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(255, 102, 0);
      doc.text("DETALHAMENTO DE RECEITAS", 20, currentY);
      currentY += 10;

      const receitasTableData = revenues.map((revenue: any) => [
        new Date(revenue.date + 'T00:00:00').toLocaleDateString('pt-BR'),
        `R$ ${parseFloat(revenue.amount.toString()).toFixed(2)}`,
        revenue.description,
        revenue.category === 'mensalidades' ? 'Mensalidades' :
        revenue.category === 'torneios' ? 'Torneios' :
        revenue.category === 'equipamentos' ? 'Equipamentos' : 'Outros',
        revenue.paymentMethod === 'pix' ? 'PIX' :
        revenue.paymentMethod === 'credit_card' ? 'Cartão' :
        revenue.paymentMethod === 'bank_transfer' ? 'Transferência' : 'Dinheiro'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Valor', 'Descrição', 'Categoria', 'Método']],
        body: receitasTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Seção de Despesas
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(255, 102, 0);
      doc.text("DETALHAMENTO DE DESPESAS", 20, currentY);
      currentY += 10;

      const despesasTableData = expenses.map((expense: any) => [
        new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR'),
        `R$ ${parseFloat(expense.amount.toString()).toFixed(2)}`,
        expense.description,
        expense.category === 'aluguel' ? 'Aluguel' :
        expense.category === 'equipamentos' ? 'Equipamentos' :
        expense.category === 'marketing' ? 'Marketing' : 'Outros',
        expense.paymentMethod === 'pix' ? 'PIX' :
        expense.paymentMethod === 'credit_card' ? 'Cartão' :
        expense.paymentMethod === 'bank_transfer' ? 'Transferência' : 'Dinheiro'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Valor', 'Descrição', 'Categoria', 'Método']],
        body: despesasTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        margin: { left: 15, right: 15 }
      });

      // Rodapé profissional
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Pong Pro - Sistema de Gestão de Tênis de Mesa`, 20, doc.internal.pageSize.height - 15);
        doc.text(`contato@tenisdemesa.biz`, 20, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 50, doc.internal.pageSize.height - 10);
      }

      // Nome do arquivo
      const fileName = `relatorio-financeiro-completo-${new Date().toISOString().split('T')[0]}.pdf`;

      // Salvar o PDF
      doc.save(fileName);

      toast({
        title: "Sucesso!",
        description: `Relatório financeiro completo gerado com ${payments?.length || 0} cobranças, ${revenues?.length || 0} receitas e ${expenses?.length || 0} despesas.`,
      });
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Funções de validação
  const isRevenueFormValid = () => {
    return revenueFormData.amount && 
           revenueFormData.date && 
           revenueFormData.description && 
           revenueFormData.category && 
           revenueFormData.paymentMethod;
  };

  const isExpenseFormValid = () => {
    return expenseFormData.amount && 
           expenseFormData.date && 
           expenseFormData.description && 
           expenseFormData.category && 
           expenseFormData.paymentMethod;
  };

  // Funções para criar receita e despesa
  const handleCreateRevenue = () => {
    if (!isRevenueFormValid()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    createRevenueMutation.mutate({
      amount: revenueFormData.amount,
      date: revenueFormData.date,
      description: revenueFormData.description,
      category: revenueFormData.category,
      paymentMethod: revenueFormData.paymentMethod,
      notes: revenueFormData.notes || undefined,
    });
  };

  // Mutations para editar/excluir receitas
  const updateRevenueMutation = useMutation({
    mutationFn: (data: { id: string } & InsertRevenue) =>
      apiRequest("PUT", `/api/revenues/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      setIsEditRevenueDialogOpen(false);
      setSelectedRevenue(null);
      setRevenueFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "mensalidade",
        paymentMethod: "pix",
        notes: "",
      });
      toast({
        title: "Sucesso",
        description: "Receita atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar receita",
        variant: "destructive",
      });
    },
  });

  const deleteRevenueMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/revenues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      toast({
        title: "Sucesso",
        description: "Receita excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir receita",
        variant: "destructive",
      });
    },
  });

  const handleEditRevenue = (revenue: Revenue) => {
    setSelectedRevenue(revenue);
    setRevenueFormData({
      amount: revenue.amount.toString(),
      date: revenue.date,
      description: revenue.description,
      category: revenue.category,
      paymentMethod: revenue.paymentMethod || "pix",
      notes: revenue.notes || "",
    });
    setIsEditRevenueDialogOpen(true);
  };

  const handleUpdateRevenue = () => {
    if (!selectedRevenue) return;
    if (!isRevenueFormValid()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    updateRevenueMutation.mutate({
      id: selectedRevenue.id,
      amount: revenueFormData.amount,
      date: revenueFormData.date,
      description: revenueFormData.description,
      category: revenueFormData.category,
      paymentMethod: revenueFormData.paymentMethod,
      notes: revenueFormData.notes || undefined,
    });
  };

  const handleDeleteRevenue = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta receita?")) {
      deleteRevenueMutation.mutate(id);
    }
  };

  const handleCreateExpense = () => {
    if (!isExpenseFormValid()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    createExpenseMutation.mutate({
      amount: expenseFormData.amount,
      date: expenseFormData.date,
      description: expenseFormData.description,
      category: expenseFormData.category,
      paymentMethod: expenseFormData.paymentMethod,
      notes: expenseFormData.notes || undefined,
    });
  };

  // Mutations para editar/excluir despesas
  const updateExpenseMutation = useMutation({
    mutationFn: (data: { id: string } & InsertExpense) =>
      apiRequest("PUT", `/api/expenses/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setIsEditExpenseDialogOpen(false);
      setSelectedExpense(null);
      setExpenseFormData({
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        category: "material",
        paymentMethod: "pix",
        notes: "",
      });
      toast({
        title: "Sucesso",
        description: "Despesa atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar despesa",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Sucesso",
        description: "Despesa excluída com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir despesa",
        variant: "destructive",
      });
    },
  });

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setExpenseFormData({
      amount: expense.amount.toString(),
      date: expense.date,
      description: expense.description,
      category: expense.category,
      paymentMethod: expense.paymentMethod || "pix",
      notes: expense.notes || "",
    });
    setIsEditExpenseDialogOpen(true);
  };

  const handleUpdateExpense = () => {
    if (!selectedExpense) return;
    if (!isExpenseFormValid()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    updateExpenseMutation.mutate({
      id: selectedExpense.id,
      amount: expenseFormData.amount,
      date: expenseFormData.date,
      description: expenseFormData.description,
      category: expenseFormData.category,
      paymentMethod: expenseFormData.paymentMethod,
      notes: expenseFormData.notes || undefined,
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  // Filtrar pagamentos
  const filteredPayments = payments?.filter(payment => {
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;
    const matchesAthlete = filterAthlete === "all" || payment.athleteId === filterAthlete;
    
    let matchesDateRange = true;
    if (filterStartDate && filterEndDate) {
      const paymentDate = payment.dueDate;
      matchesDateRange = paymentDate >= filterStartDate && paymentDate <= filterEndDate;
    }
    
    return matchesStatus && matchesAthlete && matchesDateRange;
  }) || [];

  // Filtrar receitas
  const filteredRevenues = revenues?.filter(revenue => {
    const matchesCategory = revenueFilterCategory === "all" || revenue.category === revenueFilterCategory;
    const matchesPaymentMethod = revenueFilterPaymentMethod === "all" || revenue.paymentMethod === revenueFilterPaymentMethod;
    
    let matchesDateRange = true;
    if (revenueFilterStartDate && revenueFilterEndDate) {
      const revenueDate = revenue.date;
      matchesDateRange = revenueDate >= revenueFilterStartDate && revenueDate <= revenueFilterEndDate;
    }
    
    return matchesCategory && matchesPaymentMethod && matchesDateRange;
  }) || [];

  // Filtrar despesas
  const filteredExpenses = expenses?.filter(expense => {
    const matchesCategory = expenseFilterCategory === "all" || expense.category === expenseFilterCategory;
    const matchesPaymentMethod = expenseFilterPaymentMethod === "all" || expense.paymentMethod === expenseFilterPaymentMethod;
    
    let matchesDateRange = true;
    if (expenseFilterStartDate && expenseFilterEndDate) {
      const expenseDate = expense.date;
      matchesDateRange = expenseDate >= expenseFilterStartDate && expenseDate <= expenseFilterEndDate;
    }
    
    return matchesCategory && matchesPaymentMethod && matchesDateRange;
  }) || [];

  // Calcular totais
  const totalPendente = filteredPayments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  const totalPago = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalGeral = totalPendente + totalPago;

  const totalReceitas = filteredRevenues.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const totalDespesas = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Módulo Financeiro
          </h1>
          <p className="text-muted-foreground mt-2">
            Controle completo das finanças do clube
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          {/* Tab de Cobranças */}
          <TabsContent value="cobrancas" className="space-y-6 mt-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600">
                    Total Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalPago.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-600">
                    Total Pendente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    R$ {totalPendente.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">
                    Total Geral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {totalGeral.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-payment">
                    Criar Cobrança em Massa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Cobrança em Massa</DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Seleção de Atletas */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Selecionar Atletas/Associados</label>
                      
                      {/* Botões de seleção rápida */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const athleteIds = athletes?.filter(a => a.type === 'atleta').map(a => a.id) || [];
                            setSelectedAthletes(athleteIds);
                          }}
                          data-testid="button-select-athletes-only"
                        >
                          Somente Atletas
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const associateIds = athletes?.filter(a => a.type === 'associado').map(a => a.id) || [];
                            setSelectedAthletes(associateIds);
                          }}
                          data-testid="button-select-associates-only"
                        >
                          Somente Associados
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const allIds = athletes?.map(a => a.id) || [];
                            setSelectedAthletes(allIds);
                          }}
                          data-testid="button-select-all"
                        >
                          Selecionar Todos
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAthletes([]);
                          }}
                          data-testid="button-deselect-all"
                        >
                          Remover Todos
                        </Button>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto border rounded-md p-4 space-y-2">
                        {athletes?.map((athlete) => (
                          <div key={athlete.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={athlete.id}
                              checked={selectedAthletes.includes(athlete.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAthletes([...selectedAthletes, athlete.id]);
                                } else {
                                  setSelectedAthletes(selectedAthletes.filter(id => id !== athlete.id));
                                }
                              }}
                            />
                            <label htmlFor={athlete.id} className="text-sm">
                              {athlete.name} ({athlete.type})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Valor *</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">Data de Vencimento *</label>
                        <Input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Referência *</label>
                      <Input
                        placeholder="Ex: Janeiro/2024 ou Mensalidade"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descrição</label>
                      <Textarea
                        placeholder="Descrição do pagamento"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createPaymentMutation.isPending}>
                        {createPaymentMutation.isPending ? "Criando..." : "Criar Pagamentos"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Button onClick={generateReport} variant="outline" data-testid="button-generate-report">
                Gerar Relatório PDF
              </Button>
            </div>

            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Atleta/Associado</label>
                    <Select value={filterAthlete} onValueChange={setFilterAthlete}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {athletes?.map((athlete) => (
                          <SelectItem key={athlete.id} value={athlete.id}>
                            {athlete.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Pagamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Pagamentos ({filteredPayments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[160px] whitespace-nowrap">Atleta/Associado</TableHead>
                          <TableHead className="w-[70px] whitespace-nowrap">Tipo</TableHead>
                          <TableHead className="w-[90px] whitespace-nowrap">Valor</TableHead>
                          <TableHead className="w-[120px] whitespace-nowrap">Vencimento</TableHead>
                          <TableHead className="w-[90px] whitespace-nowrap">Status</TableHead>
                          <TableHead className="w-[150px] whitespace-nowrap">Referência</TableHead>
                          <TableHead className="w-[200px] whitespace-nowrap">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => {
                          const athlete = athletes?.find(a => a.id === payment.athleteId);
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>{athlete?.name || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant={athlete?.type === 'atleta' ? 'default' : 'secondary'}>
                                  {athlete?.type || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>R$ {parseFloat(payment.amount).toFixed(2)}</TableCell>
                              <TableCell>{new Date(payment.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  payment.status === 'paid' ? 'default' :
                                  payment.status === 'overdue' ? 'destructive' : 'secondary'
                                }>
                                  {payment.status === 'paid' ? 'Pago' : 
                                   payment.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                </Badge>
                              </TableCell>
                              <TableCell>{payment.reference || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {payment.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => openPayDialog(payment)}
                                      disabled={markAsPaidMutation.isPending}
                                    >
                                      Marcar como Pago
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(payment)}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeletePayment(payment.id)}
                                  >
                                    Excluir
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Receitas */}
          <TabsContent value="receitas" className="space-y-6 mt-6">
            {/* Card de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600">
                    Total de Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalReceitas.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">
                    Número de Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredRevenues.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botão para Adicionar Receita */}
            <div className="flex flex-wrap gap-4">
              <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Receita</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Receita</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Valor *</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={revenueFormData.amount}
                        onChange={(e) => setRevenueFormData({ ...revenueFormData, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Data *</label>
                      <Input
                        type="date"
                        value={revenueFormData.date}
                        onChange={(e) => setRevenueFormData({ ...revenueFormData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descrição *</label>
                      <Input
                        placeholder="Descrição da receita"
                        value={revenueFormData.description}
                        onChange={(e) => setRevenueFormData({ ...revenueFormData, description: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Categoria *</label>
                      <Select value={revenueFormData.category} onValueChange={(value) => setRevenueFormData({ ...revenueFormData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensalidade">Mensalidade</SelectItem>
                          <SelectItem value="taxa_inscricao">Taxa de Inscrição</SelectItem>
                          <SelectItem value="patrocinio">Patrocínio</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Método de Pagamento *</label>
                      <Select value={revenueFormData.paymentMethod} onValueChange={(value) => setRevenueFormData({ ...revenueFormData, paymentMethod: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        placeholder="Observações adicionais"
                        value={revenueFormData.notes}
                        onChange={(e) => setRevenueFormData({ ...revenueFormData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsRevenueDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateRevenue} disabled={createRevenueMutation.isPending}>
                        {createRevenueMutation.isPending ? "Criando..." : "Criar Receita"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtros de Receitas */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria</label>
                    <Select value={revenueFilterCategory} onValueChange={setRevenueFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="mensalidade">Mensalidade</SelectItem>
                        <SelectItem value="taxa_inscricao">Taxa de Inscrição</SelectItem>
                        <SelectItem value="patrocinio">Patrocínio</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Método de Pagamento</label>
                    <Select value={revenueFilterPaymentMethod} onValueChange={setRevenueFilterPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <Input
                      type="date"
                      value={revenueFilterStartDate}
                      onChange={(e) => setRevenueFilterStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <Input
                      type="date"
                      value={revenueFilterEndDate}
                      onChange={(e) => setRevenueFilterEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Receitas */}
            <Card>
              <CardHeader>
                <CardTitle>Receitas ({filteredRevenues.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredRevenues.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma receita encontrada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRevenues.map((revenue) => (
                          <TableRow key={revenue.id}>
                            <TableCell>{new Date(revenue.date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>R$ {parseFloat(revenue.amount).toFixed(2)}</TableCell>
                            <TableCell>{revenue.description}</TableCell>
                            <TableCell>
                              <Badge>
                                {revenue.category === 'mensalidade' ? 'Mensalidade' :
                                 revenue.category === 'taxa_inscricao' ? 'Taxa de Inscrição' :
                                 revenue.category === 'patrocinio' ? 'Patrocínio' : 'Outros'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {revenue.paymentMethod === 'pix' ? 'PIX' :
                               revenue.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                               revenue.paymentMethod === 'cartao' ? 'Cartão' : 'Transferência'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRevenue(revenue)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRevenue(revenue.id)}
                                >
                                  Excluir
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

          {/* Tab de Despesas */}
          <TabsContent value="despesas" className="space-y-6 mt-6">
            {/* Card de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-600">
                    Total de Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {totalDespesas.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">
                    Número de Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredExpenses.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botão para Adicionar Despesa */}
            <div className="flex flex-wrap gap-4">
              <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Adicionar Despesa</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Despesa</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Valor *</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseFormData.amount}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Data *</label>
                      <Input
                        type="date"
                        value={expenseFormData.date}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descrição *</label>
                      <Input
                        placeholder="Descrição da despesa"
                        value={expenseFormData.description}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Categoria *</label>
                      <Select value={expenseFormData.category} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="equipamento">Equipamento</SelectItem>
                          <SelectItem value="local">Local</SelectItem>
                          <SelectItem value="alimentacao">Alimentação</SelectItem>
                          <SelectItem value="transporte">Transporte</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Método de Pagamento *</label>
                      <Select value={expenseFormData.paymentMethod} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, paymentMethod: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        placeholder="Observações adicionais"
                        value={expenseFormData.notes}
                        onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending}>
                        {createExpenseMutation.isPending ? "Criando..." : "Criar Despesa"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filtros de Despesas */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria</label>
                    <Select value={expenseFilterCategory} onValueChange={setExpenseFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="equipamento">Equipamento</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="alimentacao">Alimentação</SelectItem>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Método de Pagamento</label>
                    <Select value={expenseFilterPaymentMethod} onValueChange={setExpenseFilterPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início</label>
                    <Input
                      type="date"
                      value={expenseFilterStartDate}
                      onChange={(e) => setExpenseFilterStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim</label>
                    <Input
                      type="date"
                      value={expenseFilterEndDate}
                      onChange={(e) => setExpenseFilterEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Despesas */}
            <Card>
              <CardHeader>
                <CardTitle>Despesas ({filteredExpenses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhuma despesa encontrada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>R$ {parseFloat(expense.amount).toFixed(2)}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {expense.category === 'material' ? 'Material' :
                                 expense.category === 'equipamento' ? 'Equipamento' :
                                 expense.category === 'local' ? 'Local' :
                                 expense.category === 'alimentacao' ? 'Alimentação' :
                                 expense.category === 'transporte' ? 'Transporte' : 'Outros'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {expense.paymentMethod === 'pix' ? 'PIX' :
                               expense.paymentMethod === 'dinheiro' ? 'Dinheiro' :
                               expense.paymentMethod === 'cartao' ? 'Cartão' : 'Transferência'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                >
                                  Excluir
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

          {/* Tab de Relatórios */}
          <TabsContent value="relatorios" className="space-y-6 mt-6">
            {/* Dashboard Geral */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-green-600">
                    Total Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalReceitas.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-red-600">
                    Total Despesas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    R$ {totalDespesas.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-600">
                    Saldo Líquido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {saldoLiquido.toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-600">
                    Pendente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    R$ {totalPendente.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Relatórios Disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Relatório de Cobranças</h4>
                  <p className="text-sm text-muted-foreground">
                    Gera um relatório PDF completo com todas as cobranças filtradas, incluindo resumos financeiros.
                  </p>
                  <Button onClick={generateReport} className="mt-2">
                    Gerar Relatório de Cobranças
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs para Marcar como Pago */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Pagamento como Pago</DialogTitle>
            </DialogHeader>
            
            {selectedPayment && (
              <form onSubmit={handleMarkAsPaid} className="space-y-4">
                <div className="space-y-2">
                  <p><strong>Atleta:</strong> {athletes?.find(a => a.id === selectedPayment.athleteId)?.name}</p>
                  <p><strong>Valor:</strong> R$ {parseFloat(selectedPayment.amount).toFixed(2)}</p>
                  <p><strong>Referência:</strong> {selectedPayment.reference}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Data do Pagamento *</label>
                  <Input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Método de Pagamento *</label>
                  <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={markAsPaidMutation.isPending}>
                    {markAsPaidMutation.isPending ? "Marcando..." : "Marcar como Pago"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para Editar Pagamento */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Pagamento</DialogTitle>
            </DialogHeader>
            
            {selectedPayment && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    <strong>Atleta:</strong> {athletes?.find(a => a.id === selectedPayment.athleteId)?.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Valor *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Data de Vencimento *</label>
                  <Input
                    type="date"
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Referência *</label>
                  <Input
                    value={editFormData.reference}
                    onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={editPaymentMutation.isPending}>
                    {editPaymentMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para Editar Receita */}
        <Dialog open={isEditRevenueDialogOpen} onOpenChange={setIsEditRevenueDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Receita</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={revenueFormData.amount}
                  onChange={(e) => setRevenueFormData({ ...revenueFormData, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={revenueFormData.date}
                  onChange={(e) => setRevenueFormData({ ...revenueFormData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição *</label>
                <Input
                  placeholder="Descrição da receita"
                  value={revenueFormData.description}
                  onChange={(e) => setRevenueFormData({ ...revenueFormData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Categoria *</label>
                <Select value={revenueFormData.category} onValueChange={(value) => setRevenueFormData({ ...revenueFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalidade">Mensalidade</SelectItem>
                    <SelectItem value="taxa_inscricao">Taxa de Inscrição</SelectItem>
                    <SelectItem value="patrocinio">Patrocínio</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Método de Pagamento *</label>
                <Select value={revenueFormData.paymentMethod} onValueChange={(value) => setRevenueFormData({ ...revenueFormData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  placeholder="Observações adicionais"
                  value={revenueFormData.notes}
                  onChange={(e) => setRevenueFormData({ ...revenueFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditRevenueDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateRevenue} disabled={updateRevenueMutation.isPending}>
                  {updateRevenueMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para Editar Despesa */}
        <Dialog open={isEditExpenseDialogOpen} onOpenChange={setIsEditExpenseDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Despesa</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Valor *</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  value={expenseFormData.date}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição *</label>
                <Input
                  placeholder="Descrição da despesa"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Categoria *</label>
                <Select value={expenseFormData.category} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Método de Pagamento *</label>
                <Select value={expenseFormData.paymentMethod} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, paymentMethod: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  placeholder="Observações adicionais"
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditExpenseDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateExpense} disabled={updateExpenseMutation.isPending}>
                  {updateExpenseMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}