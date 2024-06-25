/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React, { useState } from 'react';
import Toast from '../toast/Toast'; // Asegúrate de importar tu componente Toast

interface LoginModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAdminLogin: (isAdmin: boolean) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<"WELCOME" | "ELECTORES" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "RECOLECTORES" | "REGISTER">>;
  title: string;
  subtitle: string;
  imageSrc: string;
  APIHost: string | null;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isVisible,
  onClose,
  onAdminLogin,
  setCurrentPage,
  title,
  subtitle,
  imageSrc,
  APIHost,
}) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const handleLogin = async () => {
    const apiHost = APIHost || 'http://localhost:8000';
    try {
      const response = await fetch(`${apiHost}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
        }),
      });
      const data = await response.json();
      if (response.ok && data.isAdmin) {
        onAdminLogin(true);
        setCurrentPage('ELECTORES'); // Cambia la página a CHAT después de iniciar sesión
        setToastMessage("Inicio de sesión exitoso");
        setToastType("success");
        onClose();
      } else {
        setToastMessage("Inicio de sesión fallido: " + (data.detail || "No autorizado"));
        setToastType("error");
        onAdminLogin(false);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setToastMessage("Error al iniciar sesión. Por favor, inténtelo de nuevo.");
      setToastType("error");
    }
    setUsername('');
    setPassword('');
  };

  const handleRegister = async () => {
    const apiHost = APIHost || 'http://localhost:8000';
    try {
      const response = await fetch(`${apiHost}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          isAdmin: false,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setToastMessage("Registro exitoso. Ahora puedes iniciar sesión.");
        setToastType("success");
        setIsLoginMode(true);
      } else {
        setToastMessage("Registro fallido: " + data.detail);
        setToastType("error");
      }
    } catch (error) {
      console.error("Error al registrarse:", error);
      setToastMessage("Error al registrarse. Por favor, inténtelo de nuevo.");
      setToastType("error");
    }
    setUsername('');
    setEmail('');
    setPassword('');
  };

  if (!isVisible) return null;  // No renderizar el modal si no es visible

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Logo, Título, Subtítulo */}
        <div className="flex flex-row items-center gap-5 mb-4">
          <img src={imageSrc} width={381} height={162}  className="flex"></img>
          <div className="flex flex-col lg:flex-row lg:items-end justify-center lg:gap-3">
            <p className="sm:text-2xl md:text-3xl text-text-verba">{title}</p>
            <p className="sm:text-sm text-base text-text-alt-verba font-light">
              {subtitle}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">{isLoginMode ? "Inicio de Sesión Admin" : "Registro"}</h2>
        <div className="mb-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nombre de usuario"
            className="input input-bordered w-full mb-2"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="input input-bordered w-full mb-2"
          />
          {!isLoginMode && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="input input-bordered w-full mb-2"
            />
          )}
        </div>
        <div className="flex justify-between items-center">
          <button onClick={isLoginMode ? handleLogin : handleRegister} className="btn btn-primary">
            {isLoginMode ? "Iniciar Sesión" : "Registrarse"}
          </button>
          <button onClick={onClose} className="btn">Cancelar</button>
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-blue-500 hover:underline">
            {isLoginMode ? "¿No tienes una cuenta? Regístrate" : "¿Ya tienes una cuenta? Inicia sesión"}
          </button>
        </div>
        {toastMessage && (
          <Toast 
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default LoginModal;
