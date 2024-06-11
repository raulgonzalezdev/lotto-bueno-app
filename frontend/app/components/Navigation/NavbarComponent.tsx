/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
// Navbar.tsx

import React, { useState, useEffect } from "react";
import { IoChatbubbleSharp, IoDocumentSharp, IoBuildSharp, IoSettingsSharp, IoPeopleSharp, IoListSharp } from "react-icons/io5";
import { HiOutlineStatusOnline } from "react-icons/hi";
import { IoMdAddCircle } from "react-icons/io";
import { LuMenu } from "react-icons/lu";

import NavbarButton from "./NavButton";

interface NavbarProps {
  imageSrc: string;
  title: string;
  subtitle: string;
  version: string;
  currentPage: string;
  APIHost: string | null;
  production: boolean;
  setCurrentPage: (
    page: "WELCOME" | "CHAT" | "TICKETS" | "STATUS" | "ADD" | "SETTINGS" | "USERS" | "CONVERSATIONS"
  ) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  imageSrc,
  title,
  subtitle,
  APIHost,
  version,
  currentPage,
  setCurrentPage,
  production,
}) => {
  const icon_size = 18;

  return (
    <div className="flex justify-between items-center mb-10">
      <div className="flex flex-row items-center gap-5">
        <img src={imageSrc} width={80} className="flex"></img>
        <div className="flex flex-col lg:flex-row lg:items-end justify-center lg:gap-3">
          <p className="sm:text-2xl md:text-3xl text-text-verba">{title}</p>
          <p className="sm:text-sm text-base text-text-alt-verba font-light">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-row justify-center items-center">
        <div className="hidden sm:h-[3vh] lg:h-[5vh] bg-text-alt-verba w-px sm:mx-2 md:mx-4"></div>

        <div className="lg:flex hidden lg:flex-row items-center lg:gap-3 justify-between">
          <div
            className={` ${production ? "h-[0vh]" : "sm:h-[3vh] lg:h-[5vh] mx-1"} hidden sm:block bg-text-alt-verba w-px`}
          ></div>
          <NavbarButton
            hide={false}
            APIHost={APIHost}
            Icon={IoChatbubbleSharp}
            iconSize={icon_size}
            title="Chat"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="CHAT"
          />
          <NavbarButton
            hide={false}
            APIHost={APIHost}
            Icon={IoDocumentSharp}
            iconSize={icon_size}
            title="Documentos"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="TICKETS"
          />
          <NavbarButton
            hide={false}
            APIHost={APIHost}
            Icon={IoPeopleSharp}
            iconSize={icon_size}
            title="Usuarios"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="USERS"
          />
          <NavbarButton
            hide={false}
            APIHost={APIHost}
            Icon={IoListSharp}
            iconSize={icon_size}
            title="Conversaciones"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="CONVERSATIONS"
          />
          {/* <NavbarButton
            hide={false}
            APIHost={APIHost}
            Icon={HiOutlineStatusOnline}
            iconSize={icon_size}
            title="Descripción general"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="STATUS"
          /> */}
          <div
            className={` ${production ? "h-[0vh]" : "sm:h-[3vh] lg:h-[5vh] mx-1"} hidden sm:block bg-text-alt-verba w-px`}
          ></div>
          <NavbarButton
            hide={production}
            APIHost={APIHost}
            Icon={IoMdAddCircle}
            iconSize={icon_size}
            title="Añadir Documentos"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="ADD"
          />
          <NavbarButton
            hide={production}
            APIHost={APIHost}
            Icon={IoBuildSharp}
            iconSize={icon_size}
            title="RAG"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="RAG"
          />
          <NavbarButton
            hide={production}
            APIHost={APIHost}
            Icon={IoSettingsSharp}
            iconSize={icon_size}
            title="Configuracion"
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            setPage="SETTINGS"
          />
          <div
            className={`sm:h-[3vh] lg:h-[5vh] mx-1 hidden sm:block bg-text-alt-verba w-px`}
          ></div>
        </div>

        <div className="flex flex-row items-center sm:gap-1 lg:gap-5 justify-between">
          <div className="lg:hidden sm:flex md:ml-4 sm:mr-8">
            <ul className="menu md:menu-md sm:menu-sm sm:menu-horizontal bg-base-200 rounded-box bg-bg-alt-verba z-50">
              <li>
                <details>
                  <summary>
                    <LuMenu size={20} />
                  </summary>
                  <ul className="bg-bg-alt-verba">
                    <li onClick={() => setCurrentPage("CHAT")}>
                      <a>Chat</a>
                    </li>
                    <li onClick={() => setCurrentPage("TICKETS")}>
                      <a>Documents</a>
                    </li>
                    <li onClick={() => setCurrentPage("USERS")}>
                      <a>Usuarios</a>
                    </li>
                    <li onClick={() => setCurrentPage("CONVERSATIONS")}>
                      <a>Conversaciones</a>
                    </li>
                   
                      <li onClick={() => setCurrentPage("STATUS")}>
                        <a>Status</a>
                      </li>
                  
                    {!production && (
                      <li onClick={() => setCurrentPage("ADD")}>
                        <a>Add Documents</a>
                      </li>
                    )}
                    {!production && (
                      <li onClick={() => setCurrentPage("RAG")}>
                        <a>RAG</a>
                      </li>
                    )}
                    {!production && (
                      <li onClick={() => setCurrentPage("SETTINGS")}>
                        <a>Settings</a>
                      </li>
                    )}
                  </ul>
                </details>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
