/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useState, useEffect } from "react";
import { detectHost } from "../../api";

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [APIHost, setAPIHost] = useState<string | null>(null);
  const [updatedTicket, setUpdatedTicket] = useState({ validado: false, ganador: false });

  useEffect(() => {
    fetchHost();
  }, []);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [APIHost, currentPage, searchTerm]);

  const fetchHost = async () => {
    try {
      const host = await detectHost();
      setAPIHost(host || 'http://applottobueno.com:8000');
    } catch (error) {
      console.error("Error detecting host:", error);
      setAPIHost('http://applottobueno.com:8000');
    }
  };

  const fetchTickets = async () => {
    if (!APIHost) return;
    const query = new URLSearchParams({
      skip: ((currentPage - 1) * ticketsPerPage).toString(),
      limit: ticketsPerPage.toString(),
      ...(searchTerm && { search: searchTerm }),
    }).toString();

    try {
      const response = await fetch(`${APIHost}/tickets/?${query}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data.items)) {
        setTickets(data.items);
        setTotalPages(Math.ceil(data.total / ticketsPerPage));
      } else {
        setTickets([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets([]);
      setTotalPages(1);
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
    setCurrentPage(1); // Reset to the first page on search
  };

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1) {
      setCurrentPage(1);
    } else if (pageNumber > totalPages) {
      setCurrentPage(totalPages);
    } else {
      setCurrentPage(pageNumber);
    }
    fetchTickets();
  };

  const handleUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setUpdatedTicket((prevState) => ({ ...prevState, [name]: checked }));
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!APIHost || !selectedTicket) return;

    try {
      const response = await fetch(`${APIHost}/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTicket),
      });

      if (response.ok) {
        fetchTickets();
        closeEditModal();
      } else {
        console.error("Error updating ticket");
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
    }
  };

  return (
    <div className="p-4">
      <h2>Control de Tickets</h2>
      <input
        type="text"
        placeholder="Buscar..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="input input-bordered mb-4"
      />
      <div className="pagination mb-4 flex justify-center">
        <button onClick={() => paginate(1)} className="btn btn-primary mr-1">{"<<"}</button>
        <button onClick={() => paginate(currentPage - 1)} className="btn btn-primary mr-1">{"<"}</button>
        <span className="btn btn-disabled mr-1">Página {currentPage} de {totalPages}</span>
        <button onClick={() => paginate(currentPage + 1)} className="btn btn-primary mr-1">{">"}</button>
        <button onClick={() => paginate(totalPages)} className="btn btn-primary">{">>"}</button>
      </div>
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
          {tickets.map((ticket) => (
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
          ))}
        </tbody>
      </table>
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
              <button type="submit" className="btn btn-primary mt-4">
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketControl;
