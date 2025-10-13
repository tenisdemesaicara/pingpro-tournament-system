import { useState, useMemo } from "react";
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
  const [filterSearchText, setFilterSearchText] = useState("");
  const [filterStartDate, setFilterStartDate] = useState(currentMonthDates.start);
  const [filterEndDate, setFilterEndDate] = useState(currentMonthDates.end);

  // States para Receitas
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [isEditRevenueDialogOpen, setIsEditRevenueDialogOpen] = useState(false);
  const [isMarkRevenueAsReceivedDialogOpen, setIsMarkRevenueAsReceivedDialogOpen] = useState(false);
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
  const [revenueFilterSearchText, setRevenueFilterSearchText] = useState("");
  const [revenueFilterStartDate, setRevenueFilterStartDate] = useState(currentMonthDates.start);
  const [revenueFilterEndDate, setRevenueFilterEndDate] = useState(currentMonthDates.end);

  // States para Despesas
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isEditExpenseDialogOpen, setIsEditExpenseDialogOpen] = useState(false);
  const [isMarkExpenseAsPaidDialogOpen, setIsMarkExpenseAsPaidDialogOpen] = useState(false);
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
  const [expenseFilterSearchText, setExpenseFilterSearchText] = useState("");
  const [expenseFilterStartDate, setExpenseFilterStartDate] = useState(currentMonthDates.start);
  const [expenseFilterEndDate, setExpenseFilterEndDate] = useState(currentMonthDates.end);
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "pix",
  });
  const [revenuePaymentData, setRevenuePaymentData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "pix",
  });
  const [expensePaymentData, setExpensePaymentData] = useState({
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
      const response = await apiRequest('PATCH', `/api/payments/${paymentId}`, data);
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

  // Mutation para extornar pagamento
  const reversePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const response = await apiRequest('PATCH', `/api/payments/${paymentId}/reverse`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Sucesso!",
        description: "Pagamento extornado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao extornar pagamento.",
        variant: "destructive",
      });
    },
  });

  // Mutations para receitas
  const markRevenueAsPaidMutation = useMutation({
    mutationFn: async ({ revenueId, paymentDate, paymentMethod }: { revenueId: string, paymentDate: string, paymentMethod: string }) => {
      const response = await apiRequest('PATCH', `/api/revenues/${revenueId}/pay`, { 
        paymentDate, 
        paymentMethod 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
      toast({
        title: "Sucesso!",
        description: "Receita marcada como recebida.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar receita como recebida.",
        variant: "destructive",
      });
    },
  });

  const reverseRevenueMutation = useMutation({
    mutationFn: async ({ revenueId, reason }: { revenueId: string; reason: string }) => {
      const response = await apiRequest('PATCH', `/api/revenues/${revenueId}/reverse`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
      toast({
        title: "Sucesso!",
        description: "Receita extornada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao extornar receita.",
        variant: "destructive",
      });
    },
  });

  // Mutations para despesas
  const markExpenseAsPaidMutation = useMutation({
    mutationFn: async ({ expenseId, paymentDate, paymentMethod }: { expenseId: string, paymentDate: string, paymentMethod: string }) => {
      const response = await apiRequest('PATCH', `/api/expenses/${expenseId}/pay`, { 
        paymentDate, 
        paymentMethod 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Sucesso!",
        description: "Despesa marcada como paga.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar despesa como paga.",
        variant: "destructive",
      });
    },
  });

  const reverseExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, reason }: { expenseId: string; reason: string }) => {
      const response = await apiRequest('PATCH', `/api/expenses/${expenseId}/reverse`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Sucesso!",
        description: "Despesa extornada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao extornar despesa.",
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

    // Validações corretas para paymentData
    if (!paymentData.paymentDate || !paymentData.paymentMethod) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: data do pagamento e método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      await markAsPaidMutation.mutateAsync({
        paymentId: selectedPayment.id,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
      });
    } catch (error) {
      console.error("Erro ao marcar pagamento como pago:", error);
    }
  };

  // Funções para extornar e marcar como pago
  const handleReversePayment = async (payment: Payment) => {
    const reason = prompt("Motivo do estorno:");
    if (!reason) return;

    try {
      await reversePaymentMutation.mutateAsync({
        paymentId: payment.id,
        reason,
      });
    } catch (error) {
      console.error("Erro ao extornar pagamento:", error);
    }
  };

  const openMarkRevenueAsReceivedDialog = (revenue: Revenue) => {
    setSelectedRevenue(revenue);
    setIsMarkRevenueAsReceivedDialogOpen(true);
  };

  const handleMarkRevenueAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRevenue) return;

    // Validações corretas para revenuePaymentData
    if (!revenuePaymentData.paymentDate || !revenuePaymentData.paymentMethod) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: data do recebimento e método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      await markRevenueAsPaidMutation.mutateAsync({
        revenueId: selectedRevenue.id,
        paymentDate: revenuePaymentData.paymentDate,
        paymentMethod: revenuePaymentData.paymentMethod,
      });
      setIsMarkRevenueAsReceivedDialogOpen(false);
    } catch (error) {
      console.error("Erro ao marcar receita como recebida:", error);
    }
  };

  const handleReverseRevenue = async (revenue: Revenue) => {
    const reason = prompt("Motivo do estorno:");
    if (!reason) return;

    try {
      await reverseRevenueMutation.mutateAsync({
        revenueId: revenue.id,
        reason,
      });
    } catch (error) {
      console.error("Erro ao extornar receita:", error);
    }
  };

  const openMarkExpenseAsPaidDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsMarkExpenseAsPaidDialogOpen(true);
  };

  const handleMarkExpenseAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExpense) return;

    // Validações corretas para expensePaymentData
    if (!expensePaymentData.paymentDate || !expensePaymentData.paymentMethod) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios: data do pagamento e método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      await markExpenseAsPaidMutation.mutateAsync({
        expenseId: selectedExpense.id,
        paymentDate: expensePaymentData.paymentDate,
        paymentMethod: expensePaymentData.paymentMethod,
      });
      setIsMarkExpenseAsPaidDialogOpen(false);
    } catch (error) {
      console.error("Erro ao marcar despesa como paga:", error);
    }
  };

  const handleReverseExpense = async (expense: Expense) => {
    const reason = prompt("Motivo do estorno:");
    if (!reason) return;

    try {
      await reverseExpenseMutation.mutateAsync({
        expenseId: expense.id,
        reason,
      });
    } catch (error) {
      console.error("Erro ao extornar despesa:", error);
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
        revenue.paymentMethod === 'dinheiro' ? 'Dinheiro' :
        revenue.paymentMethod === 'cartao' ? 'Cartão' :
        revenue.paymentMethod === 'transferencia' ? 'Transferência' : (revenue.paymentMethod || '-'),
        revenue.status === 'received' ? 
          (revenue.paymentDate ? new Date(revenue.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Recebida') :
          'Pendente'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Valor', 'Descrição', 'Categoria', 'Método', 'Status']],
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
        expense.category === 'material' ? 'Material' :
        expense.category === 'equipamento' ? 'Equipamento' :
        expense.category === 'local' ? 'Local' :
        expense.category === 'alimentacao' ? 'Alimentação' :
        expense.category === 'transporte' ? 'Transporte' : 'Outros',
        expense.paymentMethod === 'pix' ? 'PIX' :
        expense.paymentMethod === 'dinheiro' ? 'Dinheiro' :
        expense.paymentMethod === 'cartao' ? 'Cartão' :
        expense.paymentMethod === 'transferencia' ? 'Transferência' : (expense.paymentMethod || '-'),
        expense.status === 'paid' ? 
          (expense.paymentDate ? new Date(expense.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Paga') :
          'Pendente'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Valor', 'Descrição', 'Categoria', 'Método', 'Status']],
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

  // Função para normalizar texto (remove acentos e converte para lowercase)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  };

  // Criar mapa de atletas para acesso rápido (otimização de performance)
  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    athletes?.forEach(athlete => {
      map.set(athlete.id, athlete);
    });
    return map;
  }, [athletes]);

  // Filtrar pagamentos
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(payment => {
      // Filtro de status
      const matchesStatus = filterStatus === "all" || payment.status === filterStatus;
      
      // Filtro de data
      let matchesDateRange = true;
      if (filterStartDate && filterEndDate) {
        const paymentDate = payment.dueDate;
        matchesDateRange = paymentDate >= filterStartDate && paymentDate <= filterEndDate;
      }
      
      // Filtro de busca textual (insensível a acentos e maiúsculas)
      let matchesSearch = true;
      if (filterSearchText.trim()) {
        const searchNormalized = normalizeText(filterSearchText);
        const athlete = athleteMap.get(payment.athleteId);
        const athleteName = athlete ? normalizeText(`${athlete.firstName} ${athlete.lastName}`) : '';
        const amount = payment.amount.toString();
        const description = normalizeText(payment.description || '');
        const reference = normalizeText(payment.reference || '');
        
        matchesSearch = 
          athleteName.includes(searchNormalized) ||
          amount.includes(searchNormalized) ||
          description.includes(searchNormalized) ||
          reference.includes(searchNormalized);
      }
      
      // Filtro de atleta específico (apenas se não houver busca textual)
      const matchesAthlete = filterSearchText.trim() 
        ? true // Ignora filtro de atleta quando há busca textual
        : (filterAthlete === "all" || payment.athleteId === filterAthlete);
      
      return matchesStatus && matchesAthlete && matchesDateRange && matchesSearch;
    });
  }, [payments, athleteMap, filterSearchText, filterStatus, filterAthlete, filterStartDate, filterEndDate]);

  // Filtrar receitas
  const filteredRevenues = useMemo(() => {
    return revenues?.filter(revenue => {
      const matchesCategory = revenueFilterCategory === "all" || revenue.category === revenueFilterCategory;
      const matchesPaymentMethod = revenueFilterPaymentMethod === "all" || revenue.paymentMethod === revenueFilterPaymentMethod;
      
      let matchesDateRange = true;
      if (revenueFilterStartDate && revenueFilterEndDate) {
        const revenueDate = revenue.date;
        matchesDateRange = revenueDate >= revenueFilterStartDate && revenueDate <= revenueFilterEndDate;
      }
      
      // Filtro de busca textual (insensível a acentos e maiúsculas)
      let matchesSearch = true;
      if (revenueFilterSearchText.trim()) {
        const searchNormalized = normalizeText(revenueFilterSearchText);
        const amount = revenue.amount.toString();
        const description = normalizeText(revenue.description || '');
        const category = normalizeText(revenue.category || '');
        
        matchesSearch = 
          amount.includes(searchNormalized) ||
          description.includes(searchNormalized) ||
          category.includes(searchNormalized);
      }
      
      return matchesCategory && matchesPaymentMethod && matchesDateRange && matchesSearch;
    }) || [];
  }, [revenues, revenueFilterSearchText, revenueFilterCategory, revenueFilterPaymentMethod, revenueFilterStartDate, revenueFilterEndDate]);

  // Filtrar despesas
  const filteredExpenses = useMemo(() => {
    return expenses?.filter(expense => {
      const matchesCategory = expenseFilterCategory === "all" || expense.category === expenseFilterCategory;
      const matchesPaymentMethod = expenseFilterPaymentMethod === "all" || expense.paymentMethod === expenseFilterPaymentMethod;
      
      let matchesDateRange = true;
      if (expenseFilterStartDate && expenseFilterEndDate) {
        const expenseDate = expense.date;
        matchesDateRange = expenseDate >= expenseFilterStartDate && expenseDate <= expenseFilterEndDate;
      }
      
      // Filtro de busca textual (insensível a acentos e maiúsculas)
      let matchesSearch = true;
      if (expenseFilterSearchText.trim()) {
        const searchNormalized = normalizeText(expenseFilterSearchText);
        const amount = expense.amount.toString();
        const description = normalizeText(expense.description || '');
        const category = normalizeText(expense.category || '');
        
        matchesSearch = 
          amount.includes(searchNormalized) ||
          description.includes(searchNormalized) ||
          category.includes(searchNormalized);
      }
      
      return matchesCategory && matchesPaymentMethod && matchesDateRange && matchesSearch;
    }) || [];
  }, [expenses, expenseFilterSearchText, expenseFilterCategory, expenseFilterPaymentMethod, expenseFilterStartDate, expenseFilterEndDate]);

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
                <div className="space-y-4">
                  {/* Campo de busca textual */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buscar</label>
                    <Input
                      placeholder="Pesquisar por nome, valor, descrição ou referência..."
                      value={filterSearchText}
                      onChange={(e) => setFilterSearchText(e.target.value)}
                      data-testid="input-search-filter"
                    />
                  </div>

                  {/* Filtros de status, atleta e data */}
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
                </div>
              </CardContent>
            </Card>

            {/* Lista de Pagamentos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Pagamentos ({filteredPayments.length})
                  {filteredPayments.length > 30 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (mostrando os 30 primeiros)
                    </span>
                  )}
                </CardTitle>
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
                        {filteredPayments.slice(0, 30).map((payment) => {
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
                                  {payment.status !== 'paid' && (
                                    <Button
                                      size="sm"
                                      onClick={() => openPayDialog(payment)}
                                      disabled={markAsPaidMutation.isPending}
                                      data-testid="button-marcar-pago"
                                    >
                                      Marcar como Pago
                                    </Button>
                                  )}
                                  {payment.status === 'paid' && !payment.isReversed && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleReversePayment(payment)}
                                      disabled={reversePaymentMutation.isPending}
                                      data-testid="button-extornar-cobranca"
                                    >
                                      Extornar
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(payment)}
                                    data-testid="button-editar-cobranca"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    data-testid="button-excluir-cobranca"
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
                <div className="space-y-4">
                  {/* Campo de busca textual */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buscar</label>
                    <Input
                      placeholder="Pesquisar por valor, descrição ou categoria..."
                      value={revenueFilterSearchText}
                      onChange={(e) => setRevenueFilterSearchText(e.target.value)}
                      data-testid="input-search-revenue-filter"
                    />
                  </div>
                  
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
                </div>
              </CardContent>
            </Card>

            {/* Lista de Receitas */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Receitas ({filteredRevenues.length})
                  {filteredRevenues.length > 30 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (mostrando as 30 primeiras)
                    </span>
                  )}
                </CardTitle>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRevenues.slice(0, 30).map((revenue) => (
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
                               revenue.paymentMethod === 'cartao' ? 'Cartão' :
                               revenue.paymentMethod === 'transferencia' ? 'Transferência' : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                revenue.status === 'received' ? 'default' :
                                revenue.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {revenue.status === 'received' ? 'Recebida' : 
                                 revenue.status === 'pending' ? 'Pendente' : 'Cancelada'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {revenue.status !== 'received' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openMarkRevenueAsReceivedDialog(revenue)}
                                    disabled={markRevenueAsPaidMutation.isPending}
                                    data-testid="button-marcar-receita-paga"
                                  >
                                    Marcar como Recebida
                                  </Button>
                                )}
                                {revenue.status === 'received' && !revenue.isReversed && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleReverseRevenue(revenue)}
                                    disabled={reverseRevenueMutation.isPending}
                                    data-testid="button-extornar-receita"
                                  >
                                    Extornar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRevenue(revenue)}
                                  data-testid="button-editar-receita"
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteRevenue(revenue.id)}
                                  data-testid="button-excluir-receita"
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
                <div className="space-y-4">
                  {/* Campo de busca textual */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Buscar</label>
                    <Input
                      placeholder="Pesquisar por valor, descrição ou categoria..."
                      value={expenseFilterSearchText}
                      onChange={(e) => setExpenseFilterSearchText(e.target.value)}
                      data-testid="input-search-expense-filter"
                    />
                  </div>
                  
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
                </div>
              </CardContent>
            </Card>

            {/* Lista de Despesas */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Despesas ({filteredExpenses.length})
                  {filteredExpenses.length > 30 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (mostrando as 30 primeiras)
                    </span>
                  )}
                </CardTitle>
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
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.slice(0, 30).map((expense) => (
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
                               expense.paymentMethod === 'cartao' ? 'Cartão' :
                               expense.paymentMethod === 'transferencia' ? 'Transferência' : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                expense.status === 'paid' ? 'default' :
                                expense.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {expense.status === 'paid' ? 'Paga' : 
                                 expense.status === 'pending' ? 'Pendente' : 'Cancelada'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {expense.status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => openMarkExpenseAsPaidDialog(expense)}
                                    disabled={markExpenseAsPaidMutation.isPending}
                                    data-testid="button-marcar-despesa-paga"
                                  >
                                    Marcar como Paga
                                  </Button>
                                )}
                                {expense.status === 'paid' && !expense.isReversed && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleReverseExpense(expense)}
                                    disabled={reverseExpenseMutation.isPending}
                                    data-testid="button-extornar-despesa"
                                  >
                                    Extornar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditExpense(expense)}
                                  data-testid="button-editar-despesa"
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  data-testid="button-excluir-despesa"
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

        {/* Dialog para Marcar Receita como Recebida */}
        <Dialog open={isMarkRevenueAsReceivedDialogOpen} onOpenChange={setIsMarkRevenueAsReceivedDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Receita como Recebida</DialogTitle>
            </DialogHeader>
            
            {selectedRevenue && (
              <form onSubmit={handleMarkRevenueAsPaid} className="space-y-4">
                <div className="space-y-2">
                  <p><strong>Descrição:</strong> {selectedRevenue.description}</p>
                  <p><strong>Valor:</strong> R$ {parseFloat(selectedRevenue.amount).toFixed(2)}</p>
                  <p><strong>Data:</strong> {new Date(selectedRevenue.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Data do Recebimento *</label>
                  <Input
                    type="date"
                    value={revenuePaymentData.paymentDate}
                    onChange={(e) => setRevenuePaymentData({ ...revenuePaymentData, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Método de Recebimento *</label>
                  <Select value={revenuePaymentData.paymentMethod} onValueChange={(value) => setRevenuePaymentData({ ...revenuePaymentData, paymentMethod: value })}>
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
                  <Button type="button" variant="outline" onClick={() => setIsMarkRevenueAsReceivedDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={markRevenueAsPaidMutation.isPending}>
                    {markRevenueAsPaidMutation.isPending ? "Marcando..." : "Marcar como Recebida"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para Marcar Despesa como Paga */}
        <Dialog open={isMarkExpenseAsPaidDialogOpen} onOpenChange={setIsMarkExpenseAsPaidDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Despesa como Paga</DialogTitle>
            </DialogHeader>
            
            {selectedExpense && (
              <form onSubmit={handleMarkExpenseAsPaid} className="space-y-4">
                <div className="space-y-2">
                  <p><strong>Descrição:</strong> {selectedExpense.description}</p>
                  <p><strong>Valor:</strong> R$ {parseFloat(selectedExpense.amount).toFixed(2)}</p>
                  <p><strong>Data:</strong> {new Date(selectedExpense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Data do Pagamento *</label>
                  <Input
                    type="date"
                    value={expensePaymentData.paymentDate}
                    onChange={(e) => setExpensePaymentData({ ...expensePaymentData, paymentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Método de Pagamento *</label>
                  <Select value={expensePaymentData.paymentMethod} onValueChange={(value) => setExpensePaymentData({ ...expensePaymentData, paymentMethod: value })}>
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
                  <Button type="button" variant="outline" onClick={() => setIsMarkExpenseAsPaidDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={markExpenseAsPaidMutation.isPending}>
                    {markExpenseAsPaidMutation.isPending ? "Marcando..." : "Marcar como Paga"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}