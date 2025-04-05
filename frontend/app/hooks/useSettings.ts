'use client';

import { useQuery } from '@tanstack/react-query';

// TODO: Definir o importar una interfaz más específica para Settings si está disponible.
type SettingsResponse = Record<string, any> & { currentTemplate?: string };

// Función para obtener la configuración de la API
const fetchSettings = async (): Promise<SettingsResponse> => {
  // Determinar la URL base según el entorno
  const productionApiUrl = process.env.NEXT_PUBLIC_API_URL; // Ej: https://applottobueno.com/
  const developmentApiUrl = 'http://localhost:8000/'; // URL directa al backend en desarrollo

  const isDevelopment = process.env.NODE_ENV === 'development';
  let baseUrl = isDevelopment ? developmentApiUrl : productionApiUrl;

  // Asegurarse de que la URL base termine con una barra
  if (baseUrl && !baseUrl.endsWith('/')) {
    baseUrl += '/';
  }
  
  if (!baseUrl) {
    throw new Error('La URL base de la API no está definida.');
  }

  const endpointPath = 'api/settings'; // Endpoint de configuración
  const fetchUrl = new URL(endpointPath, baseUrl).toString();

  console.log('Fetching settings from:', fetchUrl);
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    // Intentar obtener detalles del error si la respuesta no es OK
    const errorText = await response.text(); // Obtener texto plano por si no es JSON
    console.error("Raw error response:", errorText);
    let errorDetail = `Error ${response.status}: No se pudo obtener la configuración`;
    try {
      const errorData = JSON.parse(errorText);
      errorDetail = errorData.detail || errorDetail;
    } catch (e) {
      // Ignorar error de parseo si no es JSON
    }
     // Lanzar error incluyendo el status code si es posible
    throw new Error(`${errorDetail} (Status: ${response.status})`);
  }

  // Si la respuesta es OK, intentar parsear como JSON
  try {
    return await response.json();
  } catch (error) {
    console.error("Error parsing settings JSON:", error);
    throw new Error("Error al procesar la respuesta de configuración del servidor.");
  }
};

// Hook personalizado useSettings
export const useSettings = () => {
  return useQuery<SettingsResponse, Error>({
    queryKey: ['settings'], // Clave única para la query de configuración
    queryFn: fetchSettings,
    // Opciones: Podrías querer que los settings no se refresquen tan a menudo
    // staleTime: Infinity, // Considerar los settings siempre frescos hasta invalidación manual
    // cacheTime: Infinity, // Mantener en caché indefinidamente
    // refetchOnWindowFocus: false,
  });
}; 