/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect } from "react";
import { detectHost } from "../../api";
import { useTickets, useUpdateTicket } from "../../hooks/useTickets";
import { useEstados } from "../../hooks/useEstados";
import { useRecolectores } from "../../hooks/useRecolectores";
import ConfirmationModal from '../confirmation/ConfirmationModal';

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
      <div className="mb-4">
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
          className="btn btn-secondary"
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
      </div>
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
        <table className="table-auto w-full mb-4">
          <thead>
            <tr>
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
                <td colSpan={13} className="text-center">No hay tickets disponibles</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
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
      {editModalIsOpen && selectedTicket && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeEditModal}>×</button>
            <h2>Editar Ticket</h2>
            <form onSubmit={handleUpdateSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Validado</label>
                <input
                  type="checkbox"
                  name="validado"
                  checked={updatedTicket.validado}
                  onChange={handleUpdateChange}
                  className="form-checkbox"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ganador</label>
                <input
                  type="checkbox"
                  name="ganador"
                  checked={updatedTicket.ganador}
                  onChange={handleUpdateChange}
                  className="form-checkbox"
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary mt-4"
                disabled={updateTicketMutation.isPending}
              >
                {updateTicketMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
      
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
