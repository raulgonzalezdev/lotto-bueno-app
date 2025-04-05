'use client';

import { useMutation } from '@tanstack/react-query';

// Interfaz para los datos de entrada del login
interface LoginPayload {
  username: string;
  password: string;
}

// Interfaz para la respuesta esperada de la API de login
// Asegúrate que coincida con lo que devuelve tu endpoint /api/login
export interface LoginResponse {
  access_token: string;
  token_type: string;
  isAdmin: boolean;
  // Añade otros campos si la API devuelve más datos
}

// Función que realiza la petición POST para el login
const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  const endpointPath = 'api/login';
  const loginUrl = new URL(endpointPath, baseUrl).toString();

  console.log('Attempting login to:', loginUrl);

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: LoginResponse & { detail?: string } = await response.json(); // Incluir detail para errores

  if (!response.ok) {
    // Lanza un error con el mensaje de la API (detail) si está disponible
    throw new Error(data.detail || `Error ${response.status}: No se pudo iniciar sesión`);
  }

  // Asumimos que si response.ok es true, el login fue exitoso
  // y data contiene LoginResponse
  return data;
};

// Hook personalizado useLogin
export const useLogin = () => {
  // No necesitamos queryClient aquí normalmente, a menos que el login
  // deba invalidar/actualizar otros datos cacheados.

  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // Lógica de éxito (ej. guardar token, redirigir) se manejará
      // en el componente usando la callback onSuccess de mutate().
      console.log('Login exitoso:', data);
    },
    onError: (error) => {
      // Lógica de error (ej. mostrar toast) se manejará en el componente.
      console.error('Error en el login:', error);
    },
  });
}; 