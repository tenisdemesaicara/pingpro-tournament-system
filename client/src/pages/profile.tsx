import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, Camera, User, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Schema for profile update - must match backend exactly
const updateProfileSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  email: z.string().email("Email inválido"),
  firstName: z.string().min(1, "Primeiro nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
});

// Schema for password change
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
  confirmNewPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Senhas não coincidem",
  path: ["confirmNewPassword"],
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch current user profile
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/users/profile'],
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileFormData) => apiRequest('PUT', '/api/users/profile', data),
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordFormData) => 
      apiRequest('POST', '/api/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      }),
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Forms
  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  // Update form defaults when data loads
  if (userProfile && !profileForm.getValues().username) {
    profileForm.reset({
      username: (userProfile as any).username || '',
      email: (userProfile as any).email || '',
      firstName: (userProfile as any).firstName || '',
      lastName: (userProfile as any).lastName || '',
    });
  }

  const onProfileSubmit = (data: UpdateProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="title-profile">
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="w-4 h-4 mr-2" />
              Informações Pessoais
            </TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">
              <Key className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações básicas do perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de usuário</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Digite seu nome de usuário" 
                                {...field} 
                                data-testid="input-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Digite seu email" 
                                {...field} 
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primeiro nome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Digite seu primeiro nome" 
                              {...field} 
                              data-testid="input-firstname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sobrenome</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Digite seu sobrenome" 
                              {...field} 
                              data-testid="input-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Salvar alterações
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha atual</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Digite sua senha atual" 
                              {...field} 
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova senha</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Digite sua nova senha" 
                                {...field} 
                                data-testid="input-new-password"
                              />
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
                            <FormLabel>Confirmar nova senha</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirme sua nova senha" 
                                {...field} 
                                data-testid="input-confirm-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={changePasswordMutation.isPending}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Alterar senha
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}