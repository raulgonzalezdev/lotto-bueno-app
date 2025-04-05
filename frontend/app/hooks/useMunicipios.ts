'use client';

import { useQuery } from '@tanstack/react-query';

interface Municipio {
  codigo_municipio: string; // O number
  municipio: string;
  // Otros campos si existen
}

const fetchMunicipios = async (codigoEstado: string): Promise<Municipio[]> => {
  // No hacer fetch si no hay código de estado
  if (!codigoEstado) {
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

  const endpointPath = `api/municipios/${encodeURIComponent(codigoEstado)}`;
  const fetchUrl = new URL(endpointPath, url.toString()).toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de municipios`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
      return data.sort((a: Municipio, b: Municipio) => 
        a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' })
      );
  }
  return [];
};

// Hook personalizado useMunicipios
export const useMunicipios = (codigoEstado: string) => {
  return useQuery<Municipio[], Error>({
    // La queryKey incluye el codigoEstado para que se refreque cuando cambie
    queryKey: ['municipios', codigoEstado],
    queryFn: () => fetchMunicipios(codigoEstado),
    enabled: !!codigoEstado, // Solo ejecutar la query si codigoEstado tiene valor
  });
}; 