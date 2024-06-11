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
}

const TicketControl: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [APIHost, setAPIHost] = useState<string | null>(null);

  useEffect(() => {
    fetchHost();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [APIHost]);

  const fetchHost = async () => {
    try {
      const host = await detectHost();
      setAPIHost(host || 'http://localhost:8001');
    } catch (error) {
      console.error("Error detecting host:", error);
      setAPIHost('http://localhost:8001');
    }
  };

  const fetchTickets = async () => {
    if (!APIHost) return;
    const response = await fetch(`${APIHost}/tickets/?skip=0&limit=100`);
    const data = await response.json();
    setTickets(Array.isArray(data) ? data : []);
  };

  const openModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedTicket(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredTickets = tickets.filter(ticket =>
    Object.values(ticket).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div>
      <h2>Control de Tickets</h2>
      <input
        type="text"
        placeholder="Buscar..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="input input-bordered mb-4"
      />
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Numero Ticket</th>
            <th>Cedula</th>
            <th>Nombre</th>
            <th>Telefono</th>
            <th>Estado</th>
            <th>Municipio</th>
            <th>Parroquia</th>
            <th>Referido ID</th>
            <th>Validado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {currentTickets.map((ticket) => (
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
              <td>
                <button className="view-details-button" onClick={() => openModal(ticket)}>Ver Detalles</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        {[...Array(Math.ceil(filteredTickets.length / ticketsPerPage)).keys()].map((number) => (
          <button key={number} onClick={() => paginate(number + 1)}>
            {number + 1}
          </button>
        ))}
      </div>
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
              <div>
                <p><strong>QR Code:</strong></p>
                <img src={`data:image/png;base64,${selectedTicket.qr_ticket}`} alt="QR Code" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketControl;
