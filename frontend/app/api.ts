export const detectHost = async (): Promise<string> => {
  // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
  const apiUrl = process.env.HOST || "http://localhost:8000";
  return apiUrl;
};

