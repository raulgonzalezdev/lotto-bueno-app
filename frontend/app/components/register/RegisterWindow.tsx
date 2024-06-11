import React, { useState } from 'react';
import LoginModal from '../login/Login';

interface RegisterWindowProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  setCurrentPage: React.Dispatch<React.SetStateAction<"WELCOME" | "CHAT" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "CONVERSATIONS" | "REGISTER">>;
  onAdminLogin: (isAdmin: boolean) => void;
}

const RegisterWindow: React.FC<RegisterWindowProps> = ({ title, subtitle, imageSrc, setCurrentPage, onAdminLogin }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

  const handleOpenLoginModal = () => {
    setIsLoginModalVisible(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalVisible(false);
  };

  return (
    <div className="register-page p-4 flex flex-col items-center">
      <img src={imageSrc} width={80} className="flex" alt="Logo" />
      <h1 className="text-4xl font-bold mb-2 text-center">{title}</h1>
      <h2 className="text-xl mb-6 text-center">{subtitle}</h2>
      <form className="space-y-4 w-full max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cédula</label>
          <input type="text" className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input type="text" className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Promotor</label>
          <select className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="">Seleccione un promotor</option>
            <option value="Promotor1">Promotor 1</option>
            <option value="Promotor2">Promotor 2</option>
            {/* Añadir más opciones según sea necesario */}
          </select>
        </div>
        <div className="flex justify-center">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700">Registrar</button>
        </div>
      </form>
      <div className="mt-4 text-center">
        <button onClick={handleOpenLoginModal} className="text-blue-500 hover:underline">
          Ir al Dashboard
        </button>
      </div>
      <LoginModal
        isVisible={isLoginModalVisible}
        onClose={handleCloseLoginModal}
        onAdminLogin={onAdminLogin}
        setCurrentPage={setCurrentPage}
        title="Dashboard"
        subtitle="Acceso a Administradores"
        imageSrc={imageSrc}
      />
    </div>
  );
};

export default RegisterWindow;
