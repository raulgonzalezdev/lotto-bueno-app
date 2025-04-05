'use client';

import { useQuery } from '@tanstack/react-query';

// Interfaz para un Estado según la API
interface Estado {
  codigo_estado: string; // O number si es el caso
  estado: string;
  // Otros campos si existen
}

// Función asíncrona para obtener los estados
const fetchEstados = async (): Promise<Estado[]> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  // Asegurar que la URL base use HTTPS si aplica
  const url = new URL(baseUrl);
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    url.protocol = 'https:';
  }

  const endpointPath = 'api/estados'; // Endpoint específico
  const fetchUrl = new URL(endpointPath, url.toString()).toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de estados`);
  }

  const data = await response.json();
  // Ordenar alfabéticamente aquí si se desea
  if (Array.isArray(data)) {
      return data.sort((a: Estado, b: Estado) => 
        a.estado.localeCompare(b.estado, 'es', { sensitivity: 'base' })
      );
  }
  return []; // Devolver array vacío si la data no es un array
};

// Hook personalizado useEstados
export const useEstados = () => {
  return useQuery<Estado[], Error>({
    queryKey: ['estados'], // Clave única para la query
    queryFn: fetchEstados, // Función fetch
  });
}; 