
 export const detectHost = async (): Promise<string> => {
   // Utiliza la URL desde el archivo .env, o usa un valor predeterminado si no está disponible
   //const apiUrl = "https://sas.uaenorth.cloudapp.azure.com";
   const apiUrl = "https://sas.uaenorth.cloudapp.azure.com";
   return apiUrl;
 };

