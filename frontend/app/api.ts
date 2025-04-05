export const detectHost = async (): Promise<string> => {
  // Forzar HTTPS y asegurar el formato correcto de la URL
  const apiUrl = process.env.HOST || "https://applottobueno.com";
  const url = apiUrl.startsWith('https://') ? apiUrl : `https://${apiUrl}`;
  // Eliminar cualquier barra diagonal al final de la URL
  return url.replace(/\/+$/, '');
};

// Cliente API genérico para usarse con React Query
export const apiClient = {
  // Método GET genérico
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }

    let url = new URL(endpoint, baseUrl);
    
    // Agregar parámetros de consulta si existen
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: No se pudo obtener los datos`);
    }

    return response.json();
  },

  // Método POST genérico
  async post<T>(endpoint: string, data: any): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }

    const url = new URL(endpoint, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: No se pudo procesar la solicitud`);
    }

    return response.json();
  },

  // Método PUT genérico
  async put<T>(endpoint: string, data: any): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }

    const url = new URL(endpoint, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: No se pudo procesar la solicitud`);
    }

    return response.json();
  },

  // Método PATCH genérico
  async patch<T>(endpoint: string, data: any): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }

    const url = new URL(endpoint, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: No se pudo procesar la solicitud`);
    }

    return response.json();
  },

  // Método DELETE genérico
  async delete<T>(endpoint: string): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_API_URL no está definida.');
    }

    const url = new URL(endpoint, baseUrl);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}: No se pudo eliminar el recurso`);
    }

    // Algunos endpoints DELETE pueden devolver una respuesta vacía
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return response.json();
  }
};

