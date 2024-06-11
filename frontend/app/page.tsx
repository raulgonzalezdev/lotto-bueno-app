"use client";

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navigation/NavbarComponent";
import SettingsComponent from "./components/Settings/SettingsComponent";
import ChatComponent from "./components/Chat/ChatComponent";
import ChatWindow from "./components/Chat/ChatWindow";
import WelcomeComponent from "./components/Welcome/WelcomeComponent";
import RegisterWindow from "./components/register/RegisterWindow";
import UserControl from "./components/login/UserControl";
import TicketControl from "./components/ticket/TicketControl";
import Conversations from "./components/Conversations/Conversations";
import DocumentViewerComponent from "./components/Document/DocumentViewerComponent";
import StatusComponent from "./components/Status/StatusComponent";
import FloatingChatButton from "./components/FloatingChatButton";
import { Settings, BaseSettings } from "./components/Settings/types";
import RAGComponent from "./components/RAG/RAGComponent";
import { HealthPayload } from "./components/Status/types";
import { RAGConfig, RAGResponse } from "./components/RAG/types";
import { detectHost } from "./api";
import { GoogleAnalytics } from "@next/third-parties/google";
import { fonts, FontKey } from "./info";
import PulseLoader from "react-spinners/PulseLoader";


const Home = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState<
    "WELCOME" | "CHAT" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "CONVERSATIONS" | "REGISTER"
  >("WELCOME");
  const [production, setProduction] = useState(false);
  const [gtag, setGtag] = useState("");
  const [settingTemplate, setSettingTemplate] = useState<string>("Default");
  const [baseSetting, setBaseSetting] = useState<Settings | null>(null);
  const [RAGConfig, setRAGConfig] = useState<RAGConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fontKey = baseSetting ? (baseSetting[settingTemplate]?.Customization.settings.font.value as FontKey) : null;
  const fontClassName = fontKey ? fonts[fontKey]?.className || "" : "";

  const [APIHost, setAPIHost] = useState<string | null>(null);

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // setIsChatVisible(false);
    }
  };

  const toggleAdmin = (adminKey: string): void => {
    if (adminKey === "1234") {
      setIsAdmin(!isAdmin);
    }
  };

  const handleAdminChange = (value: string | boolean): void => {
    if (typeof value === "string" && value === "1234") {
      setIsAdmin(!isAdmin);
    } else if (typeof value === "boolean") {
      setIsAdmin(value);
    }
  };

  const fetchCurrentSettings = async (apiHost: string) => {
    try {
      const response = await fetch(`${apiHost}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        //console.log("Fetched settings data:", data); // Agregar console.log para verificar los datos
        setBaseSetting(data);
        setSettingTemplate(data.currentTemplate);
      } else {
        console.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHost = async () => {
    try {
      const host = await detectHost();
      setAPIHost(host);
      await fetchCurrentSettings(host); // Fetch the current settings using the new endpoint
    } catch (error) {
      console.error("Error detecting host:", error);
      setAPIHost(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHost();
  }, []);

  useEffect(() => {
    if (baseSetting) {
      document.documentElement.style.setProperty(
        "--primary-verba",
        baseSetting[settingTemplate]?.Customization.settings.primary_color.color
      );
      document.documentElement.style.setProperty(
        "--secondary-verba",
        baseSetting[settingTemplate]?.Customization.settings.secondary_color.color
      );
      document.documentElement.style.setProperty(
        "--warning-verba",
        baseSetting[settingTemplate]?.Customization.settings.warning_color.color
      );
      document.documentElement.style.setProperty(
        "--bg-verba",
        baseSetting[settingTemplate]?.Customization.settings.bg_color.color
      );
      document.documentElement.style.setProperty(
        "--bg-alt-verba",
        baseSetting[settingTemplate]?.Customization.settings.bg_alt_color.color
      );
      document.documentElement.style.setProperty(
        "--text-verba",
        baseSetting[settingTemplate]?.Customization.settings.text_color.color
      );
      document.documentElement.style.setProperty(
        "--text-alt-verba",
        baseSetting[settingTemplate]?.Customization.settings.text_alt_color.color
      );
      document.documentElement.style.setProperty(
        "--button-verba",
        baseSetting[settingTemplate]?.Customization.settings.button_color.color
      );
      document.documentElement.style.setProperty(
        "--button-hover-verba",
        baseSetting[settingTemplate]?.Customization.settings.button_hover_color.color
      );
      document.documentElement.style.setProperty(
        "--bg-console-verba",
        baseSetting[settingTemplate]?.Customization.settings.bg_console.color
      );
      document.documentElement.style.setProperty(
        "--text-console-verba",
        baseSetting[settingTemplate]?.Customization.settings.text_console.color
      );
    }
  }, [baseSetting, settingTemplate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen gap-2">
        <PulseLoader loading={true} size={12} speedMultiplier={0.75} />
        <p>Cargando Lotto Bueno</p>
      </div>
    );
  }

  if (!baseSetting) {
    return (
      <div className="flex items-center justify-center h-screen gap-2">
        <p>Error cargando la configuración.</p>
      </div>
    );
  }

  return (
    <div onClick={handleOutsideClick}>
      <main
        className={
          isAdmin
            ? `min-h-screen p-5 bg-bg-verba text-text-verba ${fontClassName}`
            : `fixed inset-0 overflow-y-auto bg-white bg-opacity-75 ${fontClassName}`
        }
        data-theme={
          baseSetting
            ? baseSetting[settingTemplate]?.Customization.settings.theme
            : "light"
        }
      >
        {gtag !== "" && <GoogleAnalytics gaId={gtag} />}

        <div>

        {currentPage === "WELCOME" && (
            <WelcomeComponent 
              title={baseSetting[settingTemplate]?.Customization.settings.title.text} 
              subtitle={baseSetting[settingTemplate]?.Customization.settings.subtitle.text}
              imageSrc={baseSetting[settingTemplate]?.Customization.settings.image.src}
              setCurrentPage={setCurrentPage}
            />
          )}

        {currentPage === "REGISTER" && (
            <RegisterWindow 
              title={baseSetting[settingTemplate]?.Customization.settings.title.text} 
              subtitle={baseSetting[settingTemplate]?.Customization.settings.subtitle.text}
              imageSrc={baseSetting[settingTemplate]?.Customization.settings.image.src}
              setCurrentPage={setCurrentPage} // Pasamos setCurrentPage como prop
              onAdminLogin={handleAdminChange} // Pasamos handleAdminChange como prop
            />
          )}
          

          {isAdmin && (
            <Navbar
              APIHost={APIHost}
              production={production}
              title={baseSetting[settingTemplate]?.Customization.settings.title.text}
              subtitle={baseSetting[settingTemplate]?.Customization.settings.subtitle.text}
              imageSrc={baseSetting[settingTemplate]?.Customization.settings.image.src}
              version="v1.0.1"
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
          {isAdmin && currentPage === "CHAT" && (
               <ChatComponent
               production={production}
               settingConfig={baseSetting[settingTemplate]}
               APIHost={APIHost}
               RAGConfig={RAGConfig}
               setCurrentPage={setCurrentPage}
               isAdmin={isAdmin}
               toggleAdmin={handleAdminChange}
               title={baseSetting[settingTemplate]?.Customization.settings.title.text}
               subtitle={baseSetting[settingTemplate]?.Customization.settings.subtitle.text}
               imageSrc={baseSetting[settingTemplate]?.Customization.settings.image.src}
             />
            )}

          {isAdmin && currentPage === "STATUS" && (
            <StatusComponent
              fetchHost={fetchHost}
              settingConfig={baseSetting[settingTemplate]}
              APIHost={APIHost}
            />
          )}

          {isAdmin && currentPage === "SETTINGS" && !production && (
            <SettingsComponent
              settingTemplate={settingTemplate}
              setSettingTemplate={setSettingTemplate}
              baseSetting={baseSetting}
              setBaseSetting={setBaseSetting}
            />
          )}
          {isAdmin && currentPage === "USERS" && !production && (
            <UserControl />
          )}
           {isAdmin && currentPage === "TICKETS" && !production && (
            <TicketControl />
          )}
          {isAdmin && currentPage === "CONVERSATIONS" && ! production && (
            <Conversations />
          )}
          {/* {isAdmin && (
            <footer className="footer footer-center p-4 mt-8 bg-bg-verba text-text-alt-verba">
              <aside>
                <p>Build with ♥ and Caltion © 2024</p>
              </aside>
            </footer>
          )} */}
        </div>
      </main>
     
    </div>
  );
};

export default Home;
