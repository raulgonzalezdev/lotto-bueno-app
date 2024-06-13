/* eslint-disable @next/next/no-img-element */

// components/Welcome/WelcomeComponent.tsx
import React from 'react';

interface WelcomeComponentProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  setCurrentPage: (page: "WELCOME" | "ELECTORES" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "RECOLECTORES" | "REGISTER") => void;
}

const WelcomeComponent: React.FC<WelcomeComponentProps> = ({ title, subtitle, imageSrc, setCurrentPage }) => {
  return (
    <div className="welcome-page p-4 flex flex-col items-center">
      <img src={imageSrc} width={80} className="flex" alt="Logo" />
      <h1 className="text-4xl font-bold mb-2 text-center">{title}</h1>
      <h2 className="text-xl mb-6 text-center">{subtitle}</h2>
      <div className="flex justify-center">
        <button 
          onClick={() => setCurrentPage('REGISTER')} 
          className="register-button bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Registrarse
        </button>
      </div>
      <footer className="footer footer-center p-4 mt-8 bg-gray-800 text-white w-full">
        <aside>
          <p>Build with ♥ and Caltion © 2024</p>
        </aside>
      </footer>
    </div>
  );
};

export default WelcomeComponent;
