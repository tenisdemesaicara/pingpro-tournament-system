import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/auth-context";
import { Plus, Edit, Trash2, Key, Users, Shield } from "lucide-react";

// Tipos para usuários
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  module: string;
  action: string;
}

interface PermissionOverride {
  id: string;
  permissionId: string;
  permissionName: string;
  permissionDisplayName: string;
  effect: 'grant' | 'deny';
  createdAt: string;
  assignedBy: string;
}

interface UserPermissions {
  userId: string;
  effectivePermissions: string[];
  rolePermissions: string[];
  individualOverrides: PermissionOverride[];
  roles: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
}

// Schemas de validação
const createUserSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"),
  confirmPassword: z.string(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, "Selecione pelo menos uma função"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const editUserSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.string()).min(1, "Selecione pelo menos uma função"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Senhas não coincidem",
  path: ["confirmNewPassword"],
});

export default function AdminUsers() {
  const { toast } = useToast();
  const { hasPermission, user: currentUser } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Queries
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  // Query para buscar todas as permissões disponíveis
  const { data: permissions = [], isLoading: loadingPermissions } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
  });

  // Query para buscar permissões de um usuário específico
  const { data: userPermissions, isLoading: loadingUserPermissions, refetch: refetchUserPermissions } = useQuery<UserPermissions>({
    queryKey: ['/api/users', selectedUser?.id, 'permissions'],
    enabled: !!selectedUser && permissionsDialogOpen,
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/users', data),
    onSuccess: () => {
      toast({ title: "Usuário criado com sucesso!" });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PUT', `/api/users/${id}`, data),
    onSuccess: () => {
      toast({ title: "Usuário atualizado com sucesso!" });
      setEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/users/${id}`),
    onSuccess: () => {
      toast({ title: "Usuário excluído com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('POST', `/api/users/${id}/change-password`, data),
    onSuccess: () => {
      toast({ title: "Senha alterada com sucesso!" });
      setPasswordDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar permissões individuais
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { grants: string[]; denies: string[] } }) => 
      apiRequest('POST', `/api/users/${userId}/permissions`, data),
    onSuccess: () => {
      toast({ title: "Permissões atualizadas com sucesso!" });
      refetchUserPermissions();
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar permissões",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover override de permissão específico
  const removePermissionOverrideMutation = useMutation({
    mutationFn: ({ userId, permissionId }: { userId: string; permissionId: string }) => 
      apiRequest('DELETE', `/api/users/${userId}/permissions/${permissionId}`),
    onSuccess: () => {
      toast({ title: "Override de permissão removido com sucesso!" });
      refetchUserPermissions();
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover override",
        description: error.message || "Erro interno",
        variant: "destructive",
      });
    },
  });

  // Forms
  const createForm = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      isActive: true,
      roleIds: [],
    },
  });

  const editForm = useForm({
    resolver: zodResolver(editUserSchema),
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // Handlers
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      roleIds: user.roles.map(r => r.id),
    });
    setEditDialogOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    passwordForm.reset();
    setPasswordDialogOpen(true);
  };

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user);
    setPermissionsDialogOpen(true);
  };

  const handleRemovePermissionOverride = (permissionId: string) => {
    if (!selectedUser || !userPermissions) return;
    
    // Encontrar o override específico
    const override = userPermissions.individualOverrides.find(o => o.permissionId === permissionId);
    if (!override) return;
    
    // VALIDAÇÃO DE SEGURANÇA: Prevenir auto-lockout
    const isSelfAction = selectedUser.id === currentUser?.id;
    const isCriticalPermission = ['users.manage', 'admin.access'].includes(override.permissionName);
    
    let confirmMessage = `Tem certeza que deseja remover o override "${override.effect === 'grant' ? 'Concessão' : 'Negação'}" da permissão "${override.permissionDisplayName}"?`;
    
    if (isSelfAction && isCriticalPermission && override.effect === 'grant') {
      alert("⚠️ ATENÇÃO: Remover uma concessão individual de permissão crítica para si mesmo pode resultar em perda de acesso ao sistema se você não tiver essa permissão via roles.");
      confirmMessage = `⚠️ RISCO DE AUTO-LOCKOUT: Você está removendo uma concessão individual da permissão crítica "${override.permissionDisplayName}" para si mesmo.\n\nSe você não tiver essa permissão via roles, perderá acesso a funcionalidades importantes.\n\nVERIFIQUE suas permissões via roles antes de continuar.\n\nTem certeza absoluta que deseja continuar?`;
    } else if (isCriticalPermission) {
      confirmMessage = `⚠️ ATENÇÃO: Você está removendo um override de uma permissão crítica (${override.permissionDisplayName}).\n\nIsso pode afetar o acesso do usuário a funcionalidades importantes.\n\nTem certeza que deseja continuar?`;
    }
    
    if (confirm(confirmMessage)) {
      removePermissionOverrideMutation.mutate({
        userId: selectedUser.id,
        permissionId
      });
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${user.username}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const onCreateSubmit = (data: any) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (!selectedUser) return;
    updateUserMutation.mutate({ id: selectedUser.id, data });
  };

  const onPasswordSubmit = (data: any) => {
    if (!selectedUser) return;
    changePasswordMutation.mutate({ id: selectedUser.id, data });
  };

  if (loadingUsers || loadingRoles) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie usuários do sistema, suas funções e permissões
          </p>
        </div>
        
        {hasPermission('users.create') && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-confirmPassword" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="roleIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funções</FormLabel>
                      <div className="space-y-2">
                        {roles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={field.value?.includes(role.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, role.id]);
                                } else {
                                  field.onChange(currentValues.filter((roleId: string) => roleId !== role.id));
                                }
                              }}
                              data-testid={`checkbox-role-${role.name}`}
                            />
                            <Label htmlFor={`role-${role.id}`}>{role.displayName}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Usuário Ativo</FormLabel>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-isActive"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-users">
              {users.filter(u => u.isActive).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-admin-users">
              {users.filter(u => u.roles.some(r => r.name === 'admin')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Funções</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="secondary">
                          {role.displayName}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? 
                      new Date(user.lastLoginAt).toLocaleDateString('pt-BR') : 
                      "Nunca"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {hasPermission('users.update') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          data-testid={`button-edit-${user.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('users.update') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChangePassword(user)}
                          data-testid={`button-password-${user.id}`}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('users.manage') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManagePermissions(user)}
                          data-testid={`button-permissions-${user.id}`}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('users.delete') && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(user)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-firstName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sobrenome</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="roleIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funções</FormLabel>
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-role-${role.id}`}
                            checked={field.value?.includes(role.id)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              if (checked) {
                                field.onChange([...currentValues, role.id]);
                              } else {
                                field.onChange(currentValues.filter((roleId: string) => roleId !== role.id));
                              }
                            }}
                            data-testid={`checkbox-edit-role-${role.name}`}
                          />
                          <Label htmlFor={`edit-role-${role.id}`}>{role.displayName}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Usuário Ativo</FormLabel>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-edit-isActive"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-currentPassword" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-newPassword" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} data-testid="input-confirmNewPassword" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  data-testid="button-submit-password"
                >
                  {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPasswordDialogOpen(false)}
                  data-testid="button-cancel-password"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Permissões - {selectedUser?.firstName} {selectedUser?.lastName} ({selectedUser?.username})
            </DialogTitle>
          </DialogHeader>
          
          {loadingUserPermissions ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Carregando permissões...</div>
            </div>
          ) : userPermissions ? (
            <div className="space-y-6">
              {/* Resumo das Permissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {userPermissions.effectivePermissions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Permissões Efetivas</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {userPermissions.rolePermissions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Via Roles</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {userPermissions.individualOverrides.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Overrides Individuais</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Roles do Usuário */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Roles Atribuídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userPermissions.roles.map((role) => (
                      <Badge key={role.id} variant="secondary">
                        {role.displayName}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Overrides Individuais Atuais */}
              {userPermissions.individualOverrides.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Permissões Individuais Atuais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userPermissions.individualOverrides.map((override) => (
                        <div
                          key={override.id}
                          className="flex items-center justify-between p-2 rounded-md border"
                        >
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={override.effect === 'grant' ? 'default' : 'destructive'}
                            >
                              {override.effect === 'grant' ? '✓ Concedida' : '✗ Negada'}
                            </Badge>
                            <span className="font-medium">{override.permissionDisplayName}</span>
                            <span className="text-sm text-muted-foreground">
                              ({override.permissionName})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePermissionOverride(override.permissionId)}
                            data-testid={`button-remove-override-${override.permissionId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Adicionar Novas Permissões */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Adicionar Permissões Individuais</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Permission Manager Component */}
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Selecione uma permissão e escolha se deseja concedê-la ou negá-la individualmente para este usuário.
                      As permissões negadas sempre têm precedência sobre as concedidas.
                    </div>
                    
                    {permissions.length > 0 ? (
                      <div className="grid gap-3">
                        {permissions
                          .filter(permission => !userPermissions.individualOverrides.find(o => o.permissionId === permission.id))
                          .map((permission) => {
                            const hasFromRole = userPermissions.rolePermissions.includes(permission.name);
                            const isEffective = userPermissions.effectivePermissions.includes(permission.name);
                            
                            return (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{permission.displayName}</span>
                                    <span className="text-sm text-muted-foreground">
                                      ({permission.name})
                                    </span>
                                    {hasFromRole && (
                                      <Badge variant="outline" className="text-xs">
                                        Via Role
                                      </Badge>
                                    )}
                                    {isEffective && (
                                      <Badge variant="secondary" className="text-xs">
                                        Ativa
                                      </Badge>
                                    )}
                                  </div>
                                  {permission.description && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {permission.description}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => {
                                      updatePermissionsMutation.mutate({
                                        userId: selectedUser!.id,
                                        data: { grants: [permission.id], denies: [] }
                                      });
                                    }}
                                    disabled={updatePermissionsMutation.isPending}
                                    data-testid={`button-grant-${permission.id}`}
                                  >
                                    ✓ Conceder
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      // VALIDAÇÃO DE SEGURANÇA: Prevenir auto-lockout e operações perigosas
                                      const isSelfAction = selectedUser!.id === currentUser?.id;
                                      const isCriticalPermission = ['users.manage', 'admin.access'].includes(permission.name);
                                      
                                      let confirmMessage = `Tem certeza que deseja NEGAR a permissão "${permission.displayName}" para ${selectedUser!.firstName} ${selectedUser!.lastName}?`;
                                      
                                      if (isSelfAction && isCriticalPermission) {
                                        alert("⚠️ ATENÇÃO: Você não pode negar permissões críticas para si mesmo, pois isso pode resultar em auto-lockout e perda de acesso ao sistema.");
                                        return;
                                      }
                                      
                                      if (isCriticalPermission) {
                                        confirmMessage = `⚠️ ATENÇÃO: Você está prestes a NEGAR uma permissão crítica (${permission.displayName}) para ${selectedUser!.firstName} ${selectedUser!.lastName}.\n\nIsso pode impedir o usuário de acessar funcionalidades importantes do sistema.\n\nTem certeza que deseja continuar?`;
                                      }
                                      
                                      if (confirm(confirmMessage)) {
                                        updatePermissionsMutation.mutate({
                                          userId: selectedUser!.id,
                                          data: { grants: [], denies: [permission.id] }
                                        });
                                      }
                                    }}
                                    disabled={updatePermissionsMutation.isPending}
                                    data-testid={`button-deny-${permission.id}`}
                                  >
                                    ✗ Negar
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        Carregando permissões disponíveis...
                      </div>
                    )}
                    
                    {permissions.filter(p => !userPermissions.individualOverrides.find(o => o.permissionId === p.id)).length === 0 && 
                     permissions.length > 0 && (
                      <div className="text-center text-muted-foreground p-4">
                        Todas as permissões já possuem overrides individuais configurados.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="text-sm text-muted-foreground">Erro ao carregar permissões</div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              onClick={() => setPermissionsDialogOpen(false)}
              data-testid="button-close-permissions"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}