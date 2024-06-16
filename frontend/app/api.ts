
 export const detectHost = async (): Promise<string> => {
   // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
   //const apiUrl = "http://localhost:8000";
   const apiUrl = "http://localhost:8000";
   return apiUrl;
 };

