'use client';

import { useQuery } from '@tanstack/react-query';

// --- Interfaces --- //
// Asegúrate de que estas interfaces coincidan con tu schema de FastAPI
interface Elector {
    id: number;
    letra_cedula: string;
    numero_cedula: number;
    p_nombre: string;
    s_nombre?: string;
    p_apellido: string;
    s_apellido?: string;
    fecha_nacimiento: string; // O Date
    sexo?: string;
    codigo_estado: number;
    codigo_municipio: number;
    codigo_parroquia: number;
    codigo_centro_votacion: string;
}

interface Geografico {
    estado: string;
    municipio: string;
    parroquia: string;
    // ... otros campos geográficos si existen
}

interface CentroVotacion {
    nombre_cv: string;
    direccion_cv: string;
     // ... otros campos del centro si existen
}

interface ElectorDetail {
    elector: Elector;
    centro_votacion: CentroVotacion;
    geografico: Geografico;
}

interface ElectoresResponse {
    // Asumiendo que el endpoint /api/electores/ devuelve directamente un array
    // Si devuelve un objeto con { items: [], total: number }, ajusta esto
    items: Elector[]; 
    // Si necesitas el total aquí, la API debería devolverlo
}

interface FetchElectoresParams {
  currentPage: number;
  electoresPerPage: number;
  codigoEstado?: string;
  codigoMunicipio?: string;
  codigoParroquia?: string;
  codigoCentroVotacion?: string;
  // searchTerm?: string; // Si tu API soporta búsqueda general de electores
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

const fetchElectores = async ({ currentPage, electoresPerPage, ...filters }: FetchElectoresParams): Promise<Elector[]> => {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    skip: ((currentPage - 1) * electoresPerPage).toString(),
    limit: electoresPerPage.toString(),
  });

  // Añadir filtros a los parámetros
  if (filters.codigoEstado) queryParams.append('codigo_estado', filters.codigoEstado);
  if (filters.codigoMunicipio) queryParams.append('codigo_municipio', filters.codigoMunicipio);
  if (filters.codigoParroquia) queryParams.append('codigo_parroquia', filters.codigoParroquia);
  if (filters.codigoCentroVotacion) queryParams.append('codigo_centro_votacion', filters.codigoCentroVotacion);
  // if (filters.searchTerm) queryParams.append('search', filters.searchTerm);

  const fetchUrl = `${baseUrl}/api/electores/?${queryParams.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener la lista de electores`);
  }
  // Asumiendo que la API devuelve directamente un array de electores
  const data = await response.json();
  return Array.isArray(data) ? data : []; 
};

const fetchTotalElectores = async (filters: Omit<FetchElectoresParams, 'currentPage' | 'electoresPerPage'>): Promise<number> => {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams();

  if (filters.codigoEstado) queryParams.append('codigo_estado', filters.codigoEstado);
  if (filters.codigoMunicipio) queryParams.append('codigo_municipio', filters.codigoMunicipio);
  if (filters.codigoParroquia) queryParams.append('codigo_parroquia', filters.codigoParroquia);
  if (filters.codigoCentroVotacion) queryParams.append('codigo_centro_votacion', filters.codigoCentroVotacion);

  const fetchUrl = `${baseUrl}/api/total/electores?${queryParams.toString()}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener el total de electores`);
  }
  return response.json();
};

const fetchElectorDetail = async (numeroCedula: string): Promise<ElectorDetail | null> => {
  if (!numeroCedula) {
    return null;
  }
  const baseUrl = getApiBaseUrl();
  const fetchUrl = `${baseUrl}/api/electores/cedula/${encodeURIComponent(numeroCedula)}`;
  const response = await fetch(fetchUrl);

  if (response.status === 404) {
    return null; // Considerar 404 como no encontrado, no un error de fetch
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener el detalle del elector`);
  }
  return response.json();
};

// --- Hooks --- //

export const useElectores = (params: FetchElectoresParams) => {
  return useQuery<Elector[], Error>({
    queryKey: ['electores', params],
    queryFn: () => fetchElectores(params),
    placeholderData: (oldData) => oldData,
  });
};

export const useTotalElectores = (filters: Omit<FetchElectoresParams, 'currentPage' | 'electoresPerPage'>) => {
    // Clonar filtros para evitar problemas de mutabilidad en la queryKey
    const stableFilters = { ...filters }; 
    return useQuery<number, Error>({
        queryKey: ['totalElectores', stableFilters],
        queryFn: () => fetchTotalElectores(stableFilters),
    });
};

export const useElectorDetail = (numeroCedula: string) => {
  return useQuery<ElectorDetail | null, Error>({
    queryKey: ['electorDetail', numeroCedula],
    queryFn: () => fetchElectorDetail(numeroCedula),
    enabled: !!numeroCedula, // Solo ejecutar si hay cédula
  });
}; 