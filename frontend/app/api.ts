
 export const detectHost = async (): Promise<string> => {
   // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
   //const apiUrl = "http://applottobueno.com:8000";
   const apiUrl = "https://applottobueno.com";
   return apiUrl;
 };

