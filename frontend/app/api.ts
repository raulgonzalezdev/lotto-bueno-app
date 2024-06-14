
export const detectHost = async (): Promise<string> => {
  // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
  const apiUrl = process.env.NEXT_API_URL || "http://20.233.248.245:8003";
  return apiUrl;
};
