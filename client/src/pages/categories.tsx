import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema } from "@shared/schema";
import type { Category, InsertCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CategoriesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Formulário para criar/editar categoria
  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      minAge: undefined,
      maxAge: undefined,
      gender: "masculino",
      isActive: true,
    },
  });

  // Mutação para criar categoria
  const createMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Categoria criada!",
        description: "A categoria foi criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    },
  });

  // Mutação para editar categoria
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCategory> }) => {
      const response = await apiRequest("PUT", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setEditingCategory(null);
      form.reset();
      toast({
        title: "Categoria atualizada!",
        description: "A categoria foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a categoria.",
        variant: "destructive",
      });
    },
  });

  // Mutação para deletar categoria
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria excluída!",
        description: "A categoria foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a categoria.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCategory) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      minAge: category.minAge || undefined,
      maxAge: category.maxAge || undefined,
      gender: category.gender || "masculino",
      isActive: category.isActive || true,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingCategory(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8" data-testid="loading-categories">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-accent rounded w-1/4"></div>
          <div className="h-4 bg-accent rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-accent rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
            Gerenciar Categorias
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="page-description">
            Cadastre, edite e gerencie as categorias de competição dos atletas
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="material-elevation-1"
              data-testid="button-create-category"
              onClick={() => {
                setEditingCategory(null);
                form.reset();
              }}
            >
              <span className="material-icons mr-2">add</span>
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle data-testid="dialog-title">
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription data-testid="dialog-description">
                {editingCategory 
                  ? "Edite as informações da categoria selecionada."
                  : "Preencha os dados para criar uma nova categoria de competição."
                }
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                console.log("Erros de validação:", errors);
                toast({
                  title: "Erro de validação",
                  description: "Verifique os campos obrigatórios",
                  variant: "destructive",
                });
              })} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Categoria</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: A, B, C, Juvenil, Veteranos..."
                          data-testid="input-category-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o nível ou características desta categoria..."
                          className="min-h-[80px]"
                          data-testid="textarea-category-description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category-gender">
                            <SelectValue placeholder="Selecione o gênero" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade Mínima</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Ex: 18"
                            data-testid="input-min-age"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade Máxima</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Ex: 40"
                            data-testid="input-max-age"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Categoria Ativa</FormLabel>
                        <FormDescription className="text-sm text-muted-foreground">
                          Categorias inativas não aparecem nos formulários de cadastro
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                          data-testid="switch-category-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCloseDialog}
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-category"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <span className="material-icons animate-spin mr-2">refresh</span>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2">save</span>
                        {editingCategory ? "Atualizar" : "Criar"} Categoria
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Categorias */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="material-elevation-1" data-testid={`category-card-${category.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-foreground" data-testid={`category-name-${category.id}`}>
                  {category.name}
                </CardTitle>
                <div className="flex items-center space-x-1">
                  {category.isActive ? (
                    <Badge variant="default" data-testid={`category-status-${category.id}`}>
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" data-testid={`category-status-${category.id}`}>
                      Inativa
                    </Badge>
                  )}
                </div>
              </div>
              {category.description && (
                <CardDescription data-testid={`category-description-${category.id}`}>
                  {category.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Faixa etária */}
              {(category.minAge || category.maxAge) && (
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-muted-foreground">calendar_today</span>
                  <span className="text-sm text-muted-foreground" data-testid={`category-age-range-${category.id}`}>
                    Idade: {category.minAge || "Sem limite"} - {category.maxAge || "Sem limite"} anos
                  </span>
                </div>
              )}

              {/* Data de criação */}
              <div className="flex items-center space-x-2">
                <span className="material-icons text-muted-foreground">schedule</span>
                <span className="text-xs text-muted-foreground" data-testid={`category-created-${category.id}`}>
                  Criada em {new Date(category.createdAt || 0).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {/* Ações */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                  data-testid={`button-edit-category-${category.id}`}
                >
                  <span className="material-icons mr-1">edit</span>
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-category-${category.id}`}
                >
                  <span className="material-icons mr-1">delete</span>
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vazio */}
      {categories.length === 0 && (
        <div className="text-center py-12" data-testid="empty-state">
          <span className="material-icons text-6xl text-muted-foreground mb-4">category</span>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma categoria cadastrada
          </h3>
          <p className="text-muted-foreground mb-6">
            Comece criando sua primeira categoria de competição.
          </p>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="material-elevation-1"
                data-testid="button-create-first-category"
                onClick={() => {
                  setEditingCategory(null);
                  form.reset();
                }}
              >
                <span className="material-icons mr-2">add</span>
                Criar Primeira Categoria
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}
    </div>
  );
}