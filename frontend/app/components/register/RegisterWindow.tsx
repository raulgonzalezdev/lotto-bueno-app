/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import LoginModal from '../login/Login';
import Toast from '../toast/Toast';
import ConfirmationModal from '../confirmation/ConfirmationModal';

interface RegisterWindowProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  setCurrentPage: React.Dispatch<React.SetStateAction<"WELCOME" | "ELECTORES" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "RECOLECTORES" | "REGISTER">>;
  onAdminLogin: (isAdmin: boolean) => void;
}

const RegisterWindow: React.FC<RegisterWindowProps> = ({ title, subtitle, imageSrc, setCurrentPage, onAdminLogin }) => {
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [referidos, setReferidos] = useState([]);
  const [formData, setFormData] = useState({ cedula: "", telefono: "", referido_id: 1 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);

  const APIHost = 'https://rep.uaenorth.cloudapp.azure.com';

  useEffect(() => {
    fetchReferidos();
  }, []);

  const fetchReferidos = async () => {
    try {
      const response = await fetch(`${APIHost}/recolectores/`);
      const data = await response.json();
      setReferidos(data);
    } catch (error) {
      console.error("Error fetching referidos:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleOpenLoginModal = () => {
    setIsLoginModalVisible(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalVisible(false);
  };

  const handleOpenQRModal = (qr: string) => {
    setQRCode(qr);
    setIsQRModalVisible(true);
  };

  const handleCloseQRModal = () => {
    setIsQRModalVisible(false);
    setQRCode(null);
    setIsConfirmationModalVisible(true);
  };

  const handleConfirmRegisterAnother = () => {
    setFormData({ cedula: "", telefono: "", referido_id: 1 });
    setIsConfirmationModalVisible(false);
  };

  const handleCancelRegisterAnother = () => {
    setIsConfirmationModalVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setToastMessage(null);

    if (!/^58\d{10}$/.test(formData.telefono)) {
      setToastMessage("El número de teléfono debe comenzar con el código de país (58) y tener 10 dígitos adicionales.");
      setToastType('error');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${APIHost}/generate_ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cedula: formData.cedula,
          telefono: formData.telefono,
          referido_id: formData.referido_id || 1
        })
      });

      const data = await response.json();
      if (response.status === 200) {
        if (data.status === "success") {
          if (data.qr_code) {
            handleOpenQRModal(data.qr_code);
          }
          setToastMessage(data.message);
          setToastType('success');
        } else if (data.message.includes('404 Client Error: Not Found')) {
          setToastMessage("La cédula no es válida y debe estar inscrita en el registro electoral.");
          setToastType('info');
        } else {
          setToastMessage(data.message || "Error generando el ticket. Por favor, intenta de nuevo.");
          setToastType('info');
        }
      } else {
        setToastMessage("Error generando el ticket. Por favor, intenta de nuevo.");
        setToastType('error');
      }
    } catch (error) {
      console.error("Error generating ticket:", error);
      setToastMessage("Error generando el ticket. Por favor, intenta de nuevo.");
      setToastType('error');
    }

    setIsLoading(false);
  };

  const filteredReferidos = referidos.filter((referido: any) => 
    `${referido.cedula} ${referido.nombre}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="register-page p-4 flex flex-col items-center">
      <img src={imageSrc} width={80} className="flex" alt="Logo" />
      <h1 className="text-4xl font-bold mb-2 text-center">{title}</h1>
      <h2 className="text-xl mb-6 text-center">{subtitle}</h2>
      <form className="space-y-4 w-full max-w-md" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">Promotor</label>
          <input 
            type="text"
            placeholder="Buscar promotor..."
            className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            name="referido_id"
            className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            onChange={handleInputChange}
            value={formData.referido_id}
          >
            <option value="1">System</option>
            {filteredReferidos.map((referido: any) => (
              <option key={referido.id} value={referido.id}>
                {`${referido.cedula} - ${referido.nombre}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cédula</label>
          <input 
            type="text" 
            name="cedula"
            className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
            value={formData.cedula}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Teléfono</label>
          <input 
            type="text" 
            name="telefono"
            className="inputField mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
            value={formData.telefono}
            onChange={handleInputChange}
          />
        </div>
        <div className="flex justify-center">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : "Registrar"}
          </button>
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
        title={title}
        subtitle={subtitle}
        imageSrc={imageSrc}
        APIHost={APIHost}
      />
      {isQRModalVisible && qrCode && (
        <div className="modal-overlay" onClick={handleCloseQRModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={handleCloseQRModal}>×</button>
            <h2>Ticket Generado</h2>
            <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" />
            <p>El ticket ha sido generado exitosamente.</p>
          </div>
        </div>
      )}
      {toastMessage && (
        <Toast 
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
      {isConfirmationModalVisible && (
        <ConfirmationModal
          message="¿Quieres registrar otro ticket?"
          onConfirm={handleConfirmRegisterAnother}
          onCancel={handleCancelRegisterAnother}
        />
      )}
    </div>
  );
};

export default RegisterWindow;
