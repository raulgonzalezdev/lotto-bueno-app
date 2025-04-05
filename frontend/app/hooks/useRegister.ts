'use client';

import { useMutation } from '@tanstack/react-query';

// Interfaz para los datos de entrada del registro
interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  isAdmin?: boolean;
}

// Interfaz para la respuesta esperada de la API de registro
export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  // Añade otros campos si la API devuelve más datos
}

// Función que realiza la petición POST para el registro
const registerUser = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  const endpointPath = 'api/register';
  const registerUrl = new URL(endpointPath, baseUrl).toString();

  const response = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: RegisterResponse & { detail?: string } = await response.json();

  if (!response.ok) {
    // Lanza un error con el mensaje de la API (detail) si está disponible
    throw new Error(data.detail || `Error ${response.status}: No se pudo completar el registro`);
  }

  return data;
};

// Hook personalizado useRegister
export const useRegister = () => {
  return useMutation<RegisterResponse, Error, RegisterPayload>({
    mutationFn: registerUser,
    onSuccess: (data) => {
      console.log('Registro exitoso:', data);
    },
    onError: (error) => {
      console.error('Error en el registro:', error);
    },
  });
}; 