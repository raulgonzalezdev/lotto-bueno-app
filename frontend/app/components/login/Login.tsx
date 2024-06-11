/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
import React, { useState } from 'react';

interface LoginModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAdminLogin: (isAdmin: boolean) => void;
  setCurrentPage: React.Dispatch<React.SetStateAction<"WELCOME" | "CHAT" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "CONVERSATIONS" | "REGISTER">>;
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

  const handleLogin = async () => {
    const apiHost = APIHost || 'http://localhost:8001';
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
      if (response.ok) {
        onAdminLogin(true);
        setCurrentPage('CHAT'); // Cambia la página a CHAT después de iniciar sesión
        onClose();
      } else {
        alert("Inicio de sesión fallido: " + data.detail);
        onAdminLogin(false);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Error al iniciar sesión. Por favor, inténtelo de nuevo.");
    }
    setUsername('');
    setPassword('');
  };

  if (!isVisible) return null;  // No renderizar el modal si no es visible

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Logo, Título, Subtítulo */}
        <div className="flex flex-row items-center gap-5 mb-4">
          <img src={imageSrc} width={80} className="flex"></img>
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
      </div>
    </div>
  );
};

export default LoginModal;
