/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect } from "react";
import { detectHost } from "../../api";
import { useTickets, useUpdateTicket } from "../../hooks/useTickets";
import { useEstados } from "../../hooks/useEstados";
import { useRecolectores } from "../../hooks/useRecolectores";
import ConfirmationModal from '../confirmation/ConfirmationModal';
import MessagingModal from '../messaging/MessagingModal';

// Componente para mostrar mensajes
const MessageModal: React.FC<{
  isOpen: boolean;
  message: string;
  type: 'info' | 'error' | 'success';
  onClose: () => void;
}> = ({ isOpen, message, type, onClose }) => {
  if (!isOpen) return null;
  
  const bgColor = {
    info: 'bg-blue-100 border-blue-500',
    error: 'bg-red-100 border-red-500',
    success: 'bg-green-100 border-green-500'
  }[type];
  
  const textColor = {
    info: 'text-blue-800',
    error: 'text-red-800',
    success: 'text-green-800'
  }[type];
  
  const icon = {
    info: (
      <svg className="w-6 h-6 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    error: (
      <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    ),
    success: (
      <svg className="w-6 h-6 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    )
  }[type];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg shadow-xl p-6 max-w-md border-l-4 ${bgColor}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-3">
            <h3 className={`text-lg font-medium ${textColor}`}>
              {type === 'info' ? 'Información' : type === 'error' ? 'Error' : 'Éxito'}
            </h3>
            <div className={`mt-2 text-sm ${textColor}`}>
              <p>{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md ${textColor} bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

interface Ticket {
  id: number;
  numero_ticket: string;
  qr_ticket: string;
  cedula: string;
  nombre: string;
  telefono: string;
  estado: string;
  municipio: string;
  parroquia: string;
  referido_id: number | null;
  validado: boolean;
  ganador: boolean;
  created_at: string;
}

const TicketControl: React.FC = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [APIHost, setAPIHost] = useState<string>('https://applottobueno.com');
  const [updatedTicket, setUpdatedTicket] = useState({ validado: false, ganador: false });
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [recolectorFiltro, setRecolectorFiltro] = useState<string>("");

  // Estados para descargas
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [totalParts, setTotalParts] = useState(0);
  const [currentPart, setCurrentPart] = useState(0);
  
  // Estados para modales de confirmación y mensajes
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<() => void>(() => {});
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  
  // Nuevos estados para la funcionalidad de mensajería
  const [showMessagingModal, setShowMessagingModal] = useState(false);
  const [selectedTicketsForMessaging, setSelectedTicketsForMessaging] = useState<string[]>([]);

  // Usando React Query Hooks
  const { data: ticketsResponse, isLoading: ticketsLoading } = useTickets({
    currentPage,
    ticketsPerPage,
    searchTerm,
    estadoFiltro,
    recolectorFiltro
  });

  const { data: estados = [], isLoading: estadosLoading } = useEstados();
  const { data: recolectoresData, isLoading: recolectoresLoading } = useRecolectores();

  // Mutación para actualizar tickets
  const updateTicketMutation = useUpdateTicket();

  // Extraer la lista de tickets y total de la respuesta
  const tickets = ticketsResponse?.items || [];
  
  useEffect(() => {
    if (ticketsResponse) {
      setTotalPages(Math.ceil(ticketsResponse.total / ticketsPerPage));
    }
  }, [ticketsResponse, ticketsPerPage]);

  useEffect(() => {
    fetchHost();
  }, []);

  const fetchHost = async () => {
    try {
      const host = await detectHost();
      setAPIHost(host);
    } catch (error) {
      console.error("Error detecting host:", error);
      setAPIHost(process.env.NEXT_PUBLIC_API_URL || 'https://applottobueno.com');
    }
  };

  const openModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalIsOpen(true);
  };

  const openEditModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setUpdatedTicket({ validado: ticket.validado, ganador: ticket.ganador });
    setEditModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedTicket(null);
  };

  const closeEditModal = () => {
    setEditModalIsOpen(false);
    setSelectedTicket(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1) {
      setCurrentPage(1);
    } else if (pageNumber > totalPages) {
      setCurrentPage(totalPages);
    } else {
      setCurrentPage(pageNumber);
    }
  };

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setUpdatedTicket((prevState) => ({ ...prevState, [name]: checked }));
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      await updateTicketMutation.mutateAsync({
        ticketId: selectedTicket.id,
        payload: updatedTicket
      });
      closeEditModal();
    } catch (error) {
      console.error("Error updating ticket:", error);
    }
  };

  // Función para mostrar mensajes (reemplaza alert)
  const showMessage = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setMessageText(message);
    setMessageType(type);
    setShowMessageModal(true);
  };

  // Función para mostrar confirmaciones (reemplaza confirm)
  const showConfirmation = (message: string, onConfirm: () => void) => {
    setConfirmationMessage(message);
    setConfirmationAction(() => onConfirm);
    setShowConfirmationModal(true);
  };

  // Función mejorada para descargar blobs como archivos
  const downloadBlobAsFile = async (blob: Blob, filename: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        
        // Agregar evento de finalización para saber cuándo se completa la descarga
        link.onload = () => {
          console.log(`Archivo ${filename} cargado correctamente`);
        };
        
        link.onclick = () => {
          // Dar tiempo para que se inicie la descarga antes de limpiar
          setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
            resolve();
          }, 150);
        };
        
        link.onerror = (err) => {
          console.error(`Error en la descarga de ${filename}:`, err);
          window.URL.revokeObjectURL(downloadUrl);
          reject(err);
        };
        
        document.body.appendChild(link);
        link.click();
        
        // Si no se activó el evento onclick (algunos navegadores), resolver después de un tiempo
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
          resolve();
        }, 3000);
      } catch (err) {
        console.error(`Error preparando la descarga de ${filename}:`, err);
        reject(err);
      }
    });
  };

  // Método de descarga mejorado
  const handleDownload = async (type: string, format: string) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setCurrentPart(0);
      
      const query = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(estadoFiltro && { codigo_estado: estadoFiltro }),
        ...(recolectorFiltro && { referido_id: recolectorFiltro }),
      }).toString();

      let url = '';
      if (type === 'tickets') {
        url = format === 'excel' ? `/api/download/excel/tickets` : `/api/download/txt/tickets`;
      }

      // Obtener información sobre cuántas partes hay
      const infoResponse = await fetch(`${APIHost}${url}/info?${query}`);
      if (!infoResponse.ok) {
        throw new Error(`Error obteniendo información de descarga: ${infoResponse.statusText}`);
      }
      
      const info = await infoResponse.json();
      setTotalParts(info.total_parts);
      
      console.log(`Iniciando descarga de ${info.total_parts} partes`);
      
      // Descargar cada parte
      for (let part = 1; part <= info.total_parts; part++) {
        setCurrentPart(part);
        setDownloadProgress(((part - 1) / info.total_parts) * 100);
        
        console.log(`Descargando parte ${part} de ${info.total_parts}`);
        
        const downloadUrl = `${APIHost}${url}?${query}&part=${part}`;
        const response = await fetch(downloadUrl);
        
        if (!response.ok) {
          throw new Error(`Error descargando parte ${part}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/["']/g, '') || 
                        `${type}_parte_${part}.${format}`;
        
        await downloadBlobAsFile(blob, filename);
        
        // Actualizar progreso
        setDownloadProgress((part / info.total_parts) * 100);
        
        // Hacer una pausa entre descargas
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setDownloadProgress(100);
      showMessage('Descarga completada exitosamente', 'success');
      
      // Ocultar progreso después de un tiempo
      setTimeout(() => {
        setIsDownloading(false);
        setCurrentPart(0);
        setDownloadProgress(0);
      }, 3000);
      
    } catch (error) {
      console.error('Error en la descarga:', error);
      showMessage(`Error en la descarga: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
      setIsDownloading(false);
    }
  };

  // Obtener recolectores de la respuesta
  const recolectores = recolectoresData?.items || [];

  // Actualizar la función para abrir el modal de mensajería
  const openMessagingModal = () => {
    setShowMessagingModal(true);
  };

  // Actualizar la función ticketsToContacts para incluir datos adicionales para personalización
  const ticketsToContacts = () => {
    return tickets
      .filter(ticket => selectedTicketsForMessaging.length === 0 || selectedTicketsForMessaging.includes(ticket.id.toString()))
      .map(ticket => ({
        id: ticket.id.toString(),
        name: ticket.nombre || `Usuario ${ticket.cedula}`,
        phone: ticket.telefono,
        lastMessage: undefined,
        lastMessageTime: undefined,
        // Campos adicionales para personalización
        cedula: ticket.cedula,
        estado: ticket.estado,
        municipio: ticket.municipio,
        numero_ticket: ticket.numero_ticket
      }));
  };

  // Función para manejar la selección de tickets para mensajería
  const handleTicketSelection = (ticketId: string) => {
    setSelectedTicketsForMessaging(prev => {
      if (prev.includes(ticketId)) {
        return prev.filter(id => id !== ticketId);
      } else {
        return [...prev, ticketId];
      }
    });
  };

  // Función para manejar la selección/deselección de todos los tickets
  const handleSelectAllTickets = () => {
    if (selectedTicketsForMessaging.length === tickets.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedTicketsForMessaging([]);
    } else {
      // Si no todos están seleccionados, seleccionar todos
      setSelectedTicketsForMessaging(tickets.map(ticket => ticket.id.toString()));
    }
  };

  // Agregar estados y funciones para plantillas de mensajes
  const [messageTemplate, setMessageTemplate] = useState("");
  const messageTemplates = [
    "Hola {nombre}, gracias por participar en Lotto Bueno. Tu ticket #{ticket} ha sido registrado.",
    "Estimado/a {nombre}, te recordamos que tu ticket #{ticket} participa en nuestro próximo sorteo.",
    "Importante: {nombre}, verifica tu ticket #{ticket} en nuestra página web."
  ];

  // Función para exportar tickets seleccionados a Excel para uso con API de mensajería
  const exportTicketsForSMS = () => {
    if (tickets.length === 0) {
      showMessage("No hay tickets para exportar", "error");
      return;
    }

    // Filtrar los tickets seleccionados o usar todos si no hay selección
    const ticketsToExport = tickets.filter(ticket => 
      selectedTicketsForMessaging.length === 0 || 
      selectedTicketsForMessaging.includes(ticket.id.toString())
    );

    if (ticketsToExport.length === 0) {
      showMessage("No hay tickets seleccionados para exportar", "error");
      return;
    }

    // Crear los datos para el archivo Excel
    const headers = ["phone", "message", "nombre", "cedula", "ticket", "estado"];
    
    // Generar filas con datos y mensaje vacío para que el usuario lo complete
    const rows = ticketsToExport.map(ticket => ({
      phone: ticket.telefono,
      message: "", // El usuario completará este campo
      nombre: ticket.nombre,
      cedula: ticket.cedula,
      ticket: ticket.numero_ticket,
      estado: ticket.estado
    }));

    // Convertir a CSV
    let csvContent = headers.join(",") + "\n";
    csvContent += rows.map(row => 
      headers.map(header => `"${row[header as keyof typeof row] || ""}"`).join(",")
    ).join("\n");

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `tickets_para_sms_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
    window.URL.revokeObjectURL(url);

    showMessage(`Se exportaron ${ticketsToExport.length} tickets para envío SMS`, "success");
  };

  return (
    <div className="p-4">
      <h2>Control de Tickets</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="input input-bordered"
        />
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
          className="select select-bordered"
          disabled={estadosLoading}
        >
          <option value="">Todos los estados</option>
          {estados.map(estado => (
            <option key={estado.codigo_estado} value={estado.codigo_estado}>
              {estado.estado}
            </option>
          ))}
        </select>
        <select
          value={recolectorFiltro}
          onChange={(e) => setRecolectorFiltro(e.target.value)}
          className="select select-bordered"
          disabled={recolectoresLoading}
        >
          <option value="">Todos los recolectores</option>
          {recolectores.map(recolector => (
            <option key={recolector.id} value={recolector.id.toString()}>
              {recolector.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button 
          onClick={() => handleDownload('tickets', 'excel')} 
          className="btn btn-secondary mr-2"
          disabled={isDownloading}
        >
          {isDownloading ? (
            <span className="flex items-center">
              <span className="mr-2">Descargando...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
          ) : (
            'Descargar Tickets Excel'
          )}
        </button>
        <button 
          onClick={() => handleDownload('tickets', 'txt')} 
          className="btn btn-secondary mr-2"
          disabled={isDownloading}
        >
          {isDownloading ? (
            <span className="flex items-center">
              <span className="mr-2">Descargando...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </span>
          ) : (
            'Descargar Tickets TXT'
          )}
        </button>
        
        {/* Botón para enviar mensajes */}
        <button 
          onClick={openMessagingModal} 
          className="btn bg-blue-600 text-white hover:bg-blue-700 mr-2"
          disabled={tickets.length === 0}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          Enviar Mensajes
        </button>
        
        {/* Nuevo botón para exportar datos para SMS */}
        <button 
          onClick={exportTicketsForSMS} 
          className="btn bg-green-600 text-white hover:bg-green-700"
          disabled={tickets.length === 0}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Exportar para SMS
        </button>
      </div>
      
      {/* Plantilla de mensaje */}
      {tickets.length > 0 && selectedTicketsForMessaging.length > 0 && (
        <div className="mb-4">
          <label htmlFor="message-template" className="block text-sm font-medium mb-1">
            Plantilla de mensaje para envío:
          </label>
          <div className="flex gap-2">
            <select
              id="message-template"
              className="select select-bordered flex-grow"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
            >
              <option value="">Seleccionar plantilla</option>
              {messageTemplates.map((template, index) => (
                <option key={index} value={template}>
                  {template.length > 50 ? `${template.substring(0, 50)}...` : template}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 self-center">
              Seleccionados: {selectedTicketsForMessaging.length}
            </span>
          </div>
        </div>
      )}
      
      <div className="pagination mb-4 flex justify-center">
        <button onClick={() => paginate(1)} className="btn btn-primary mr-1">{"<<"}</button>
        <button onClick={() => paginate(currentPage - 1)} className="btn btn-primary mr-1">{"<"}</button>
        <span className="btn btn-disabled mr-1">Página {currentPage} de {totalPages}</span>
        <button onClick={() => paginate(currentPage + 1)} className="btn btn-primary mr-1">{">"}</button>
        <button onClick={() => paginate(totalPages)} className="btn btn-primary">{">>"}</button>
      </div>
      {ticketsLoading ? (
        <div className="text-center">Cargando tickets...</div>
      ) : (
        <>
          {/* Selector para mensajería masiva */}
          {tickets.length > 0 && (
            <div className="mb-4 flex items-center">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="select-all"
                  className="mr-2"
                  checked={selectedTicketsForMessaging.length === tickets.length && tickets.length > 0}
                  onChange={handleSelectAllTickets}
                />
                <label htmlFor="select-all">Seleccionar todos para mensajería</label>
              </div>
              {selectedTicketsForMessaging.length > 0 && (
                <span className="ml-4 text-sm text-gray-600">
                  {selectedTicketsForMessaging.length} ticket(s) seleccionado(s)
                </span>
              )}
            </div>
          )}
          
          <table className="table-auto w-full mb-4">
            <thead>
              <tr>
                {tickets.length > 0 && (
                  <th className="px-2 py-2 w-10">
                    <input type="checkbox" onChange={handleSelectAllTickets} checked={selectedTicketsForMessaging.length === tickets.length && tickets.length > 0} />
                  </th>
                )}
                <th>ID</th>
                <th>Número Ticket</th>
                <th>Cédula</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th>Municipio</th>
                <th>Parroquia</th>
                <th>Referido ID</th>
                <th>Validado</th>
                <th>Ganador</th>
                <th>Creado en</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length > 0 ? tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTicketsForMessaging.includes(ticket.id.toString())}
                      onChange={() => handleTicketSelection(ticket.id.toString())}
                    />
                  </td>
                  <td>{ticket.id}</td>
                  <td>{ticket.numero_ticket}</td>
                  <td>{ticket.cedula}</td>
                  <td>{ticket.nombre}</td>
                  <td>{ticket.telefono}</td>
                  <td>{ticket.estado}</td>
                  <td>{ticket.municipio}</td>
                  <td>{ticket.parroquia}</td>
                  <td>{ticket.referido_id}</td>
                  <td>{ticket.validado ? "Sí" : "No"}</td>
                  <td>{ticket.ganador ? "Sí" : "No"}</td>
                  <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-primary mr-2" onClick={() => openModal(ticket)}>
                      Ver Detalles
                    </button>
                    <button className="btn btn-secondary" onClick={() => openEditModal(ticket)}>
                      Editar
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={14} className="text-center">No hay tickets disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
      
      {/* Resto de modales existentes */}
      {modalIsOpen && selectedTicket && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeModal}>×</button>
            <h2>Detalles del Ticket</h2>
            <div>
              <p><strong>ID:</strong> {selectedTicket.id}</p>
              <p><strong>Número Ticket:</strong> {selectedTicket.numero_ticket}</p>
              <p><strong>Cédula:</strong> {selectedTicket.cedula}</p>
              <p><strong>Nombre:</strong> {selectedTicket.nombre}</p>
              <p><strong>Teléfono:</strong> {selectedTicket.telefono}</p>
              <p><strong>Estado:</strong> {selectedTicket.estado}</p>
              <p><strong>Municipio:</strong> {selectedTicket.municipio}</p>
              <p><strong>Parroquia:</strong> {selectedTicket.parroquia}</p>
              <p><strong>Referido ID:</strong> {selectedTicket.referido_id}</p>
              <p><strong>Validado:</strong> {selectedTicket.validado ? "Sí" : "No"}</p>
              <p><strong>Ganador:</strong> {selectedTicket.ganador ? "Sí" : "No"}</p>
              <p><strong>Creado en:</strong> {new Date(selectedTicket.created_at).toLocaleDateString()}</p>
              <div>
                <p><strong>QR Code:</strong></p>
                <img src={`data:image/png;base64,${selectedTicket.qr_ticket}`} alt="QR Code" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de mensajería actualizado con plantilla y habilitando adjuntos */}
      <MessagingModal
        isOpen={showMessagingModal}
        onClose={() => setShowMessagingModal(false)}
        initialContacts={ticketsToContacts()}
        initialTemplate={messageTemplate}
        enableAttachments={true}
      />
      
      {/* Indicador de progreso de descarga */}
      {isDownloading && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <h4 className="font-bold mb-2">Descargando archivos</h4>
          <div className="mb-2">
            Parte actual: {currentPart} de {totalParts}
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {Math.round(downloadProgress)}% completado
          </div>
        </div>
      )}
      
      {/* Modales de confirmación y mensajes */}
      {showConfirmationModal && (
        <ConfirmationModal
          message={confirmationMessage}
          onConfirm={() => {
            confirmationAction();
            setShowConfirmationModal(false);
          }}
          onCancel={() => setShowConfirmationModal(false)}
        />
      )}

      {showMessageModal && (
        <MessageModal
          isOpen={showMessageModal}
          message={messageText}
          type={messageType}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </div>
  );
};

export default TicketControl;
