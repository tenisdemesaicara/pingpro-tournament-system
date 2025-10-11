import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Preparar headers
  const headers: Record<string, string> = {};
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Adicionar JWT token se disponível
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // CORREÇÃO CRÍTICA: Garantir HTTPS em produção para evitar perda de headers
  let finalUrl = url;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('/')) {
    finalUrl = window.location.origin + url;
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Manter para development
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Preparar headers com JWT token se disponível
    const headers: Record<string, string> = {};
    const token = localStorage.getItem('authToken');
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // CORREÇÃO CRÍTICA: Garantir HTTPS em produção para evitar perda de headers
    let url = queryKey.join("/") as string;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('/')) {
      url = window.location.origin + url;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include", // Manter para development
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
