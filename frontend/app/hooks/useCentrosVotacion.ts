'use client';

import { useQuery } from '@tanstack/react-query';

interface CentroVotacion {
  codificacion_nueva_cv: string; // O number
  nombre_cv: string;
  // Otros campos según tu schema CentroVotacionList
}

const fetchCentrosVotacion = async (codigoEstado: string, codigoMunicipio: string, codigoParroquia: string): Promise<CentroVotacion[]> => {
  if (!codigoEstado || !codigoMunicipio || !codigoParroquia) {
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

  const endpointPath = `api/centros_votacion/${encodeURIComponent(codigoEstado)}/${encodeURIComponent(codigoMunicipio)}/${encodeURIComponent(codigoParroquia)}`;
  const fetchUrl = new URL(endpointPath, url.toString()).toString();

  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de centros de votación`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
      return data.sort((a: CentroVotacion, b: CentroVotacion) => 
        a.nombre_cv.localeCompare(b.nombre_cv, 'es', { sensitivity: 'base' })
      );
  }
  return [];
};

// Hook personalizado useCentrosVotacion
export const useCentrosVotacion = (codigoEstado: string, codigoMunicipio: string, codigoParroquia: string) => {
  return useQuery<CentroVotacion[], Error>({
    queryKey: ['centrosVotacion', codigoEstado, codigoMunicipio, codigoParroquia],
    queryFn: () => fetchCentrosVotacion(codigoEstado, codigoMunicipio, codigoParroquia),
    enabled: !!codigoEstado && !!codigoMunicipio && !!codigoParroquia, // Ejecutar solo si los tres códigos están presentes
  });
}; 