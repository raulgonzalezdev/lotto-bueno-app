
export const detectHost = async (): Promise<string> => {
  // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
  const apiUrl = process.env.NEXT_API_URL || "http://localhost:8003";
  return apiUrl;
};
