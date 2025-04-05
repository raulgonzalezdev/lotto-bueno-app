'use client';

import { useQuery } from '@tanstack/react-query';

interface Parroquia {
  codigo_parroquia: string; // O number
  parroquia: string;
  // Otros campos si existen
}

const fetchParroquias = async (codigoEstado: string, codigoMunicipio: string): Promise<Parroquia[]> => {
  if (!codigoEstado || !codigoMunicipio) {
    return [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL no está definida.');
  }

  const url = new URL(baseUrl);
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    url.protocol = 'https:';
  }

  const endpointPath = `api/parroquias/${encodeURIComponent(codigoEstado)}/${encodeURIComponent(codigoMunicipio)}`;
  const fetchUrl = new URL(endpointPath, url.toString()).toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de parroquias`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
      return data.sort((a: Parroquia, b: Parroquia) => 
        a.parroquia.localeCompare(b.parroquia, 'es', { sensitivity: 'base' })
      );
  }
  return [];
};

// Hook personalizado useParroquias
export const useParroquias = (codigoEstado: string, codigoMunicipio: string) => {
  return useQuery<Parroquia[], Error>({
    queryKey: ['parroquias', codigoEstado, codigoMunicipio],
    queryFn: () => fetchParroquias(codigoEstado, codigoMunicipio),
    enabled: !!codigoEstado && !!codigoMunicipio, // Ejecutar solo si ambos códigos están presentes
  });
}; 