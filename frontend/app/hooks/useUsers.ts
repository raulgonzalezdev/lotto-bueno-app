'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Interfaces --- //
interface User {
  id: number;
  username: string;
  email: string;
  hashed_password?: string;
  created_at: string;
  updated_at: string;
  isAdmin: boolean;
}

interface UsersResponse {
  total: number;
  items: User[];
}

interface FetchUsersParams {
  currentPage: number;
  usersPerPage: number;
  searchTerm?: string;
}

interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  isAdmin?: boolean;
}

// --- Funciones Utilitarias y Fetch --- //
const getApiBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }
  const url = new URL(baseUrl);
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    url.protocol = 'https:';
  }
  return url.toString().replace(/\/$/, '');
};

const fetchUsers = async ({ currentPage, usersPerPage, searchTerm }: FetchUsersParams): Promise<UsersResponse> => {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    skip: ((currentPage - 1) * usersPerPage).toString(),
    limit: usersPerPage.toString(),
  });
  
  if (searchTerm) queryParams.append('search', searchTerm);

  const fetchUrl = `${baseUrl}/api/users/?${queryParams.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de usuarios`);
  }
  
  const data = await response.json();
  
  // Manejar diferentes formatos de respuesta
  if (Array.isArray(data.items)) {
    return data;
  } else if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length
    };
  }
  
  return {
    items: [],
    total: 0
  };
};

const createUser = async (payload: CreateUserPayload): Promise<User> => {
  const baseUrl = getApiBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/`;
  const response = await fetch(fetchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo crear el usuario`);
  }
  
  return response.json();
};

const updateUser = async ({ userId, payload }: { userId: number; payload: UpdateUserPayload }): Promise<User> => {
  const baseUrl = getApiBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/${userId}`;
  const response = await fetch(fetchUrl, {
    method: "PUT", // O PATCH según la API
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo actualizar el usuario`);
  }
  
  return response.json();
};

const deleteUser = async (userId: number): Promise<void> => {
  const baseUrl = getApiBaseUrl();
  const fetchUrl = `${baseUrl}/api/users/${userId}`;
  const response = await fetch(fetchUrl, { method: "DELETE" });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo eliminar el usuario`);
  }
};

// --- Hooks --- //

// Hook para obtener usuarios paginados y filtrados
export const useUsers = (params: FetchUsersParams) => {
  return useQuery<UsersResponse, Error>({
    queryKey: ['users', params],
    queryFn: () => fetchUsers(params),
    placeholderData: (oldData) => oldData, // Usar datos anteriores mientras carga
  });
};

// Hook para la mutación de crear usuario
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, CreateUserPayload>({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Hook para la mutación de actualizar usuario
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { userId: number; payload: UpdateUserPayload }>({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Hook para la mutación de eliminar usuario
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}; 