export const detectHost = async (): Promise<string> => {
  // Forzar HTTPS y asegurar el formato correcto de la URL
  const apiUrl = process.env.HOST || "https://applottobueno.com";
  const url = apiUrl.startsWith('https://') ? apiUrl : `https://${apiUrl}`;
  // Eliminar cualquier barra diagonal al final de la URL
  return url.replace(/\/+$/, '');
};

