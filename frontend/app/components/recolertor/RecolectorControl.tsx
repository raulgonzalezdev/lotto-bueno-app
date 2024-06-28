/* eslint-disable react-hooks/exhaustive-deps */

"use client";
import React, { useState, useEffect } from "react";
import Toast from '../toast/Toast';
import ConfirmationModal from '../confirmation/ConfirmationModal';

interface Recolector {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  es_referido: boolean;
}

interface EstadisticasRecolector {
  recolector_id: number;
  nombre: string;
  tickets_count: number;
}

const RecolectorControl: React.FC = () => {
  const [recolectores, setRecolectores] = useState<Recolector[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecolector, setSelectedRecolector] = useState<Recolector | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recolectoresPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [newRecolector, setNewRecolector] = useState({ nombre: "", cedula: "", telefono: "", es_referido: false });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [recolectorToDelete, setRecolectorToDelete] = useState<number | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasRecolector[]>([]);
  const [isEstadisticasModalOpen, setIsEstadisticasModalOpen] = useState(false);
  const [APIHost, setAPIHost] = useState<string>("https://applottobueno.com");

  useEffect(() => {
    fetchRecolectores();
   }, [currentPage, searchTerm]);

  const fetchRecolectores = async () => {
    const query = new URLSearchParams({
      skip: ((currentPage - 1) * recolectoresPerPage).toString(),
      limit: recolectoresPerPage.toString(),
      ...(searchTerm && { search: searchTerm }),
    }).toString();

    try {
      const response = await fetch(`${APIHost}/api/recolectores/?${query}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      if (Array.isArray(data.items)) {
        setRecolectores(data.items);
        setTotalPages(Math.ceil(data.total / recolectoresPerPage));
      } else {
        setRecolectores([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching recolectores:", error);
      setRecolectores([]);
      setTotalPages(1);
    }
  };

  const handleDelete = async () => {
    if (!recolectorToDelete) return;
    await fetch(`/api/recolectores/${recolectorToDelete}`, { method: "DELETE" });
    setRecolectorToDelete(null);
    setIsConfirmationModalVisible(false);
    fetchRecolectores();
    setToastMessage("Recolector eliminado exitosamente");
    setToastType("success");
  };

  const handleCreate = async () => {
    await fetch(`${APIHost}/api/recolectores`, {  
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newRecolector)
    });
    setNewRecolector({ nombre: "", cedula: "", telefono: "", es_referido: false });
    fetchRecolectores();
    closeModal();
    setToastMessage("Recolector creado exitosamente");
    setToastType("success");
  };

  const handleUpdate = async (recolector: Recolector) => {
    await fetch(`${APIHost}/api/recolectores/${recolector.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(recolector)
    });
    fetchRecolectores();
    closeModal();
    setToastMessage("Recolector actualizado exitosamente");
    setToastType("success");
  };

  const openModal = (recolector: Recolector | null = null) => {
    setSelectedRecolector(recolector);
    setIsEditing(!!recolector);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedRecolector(null);
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
    fetchRecolectores();
  };

  const fetchEstadisticas = async (recolectorId?: number) => {
    let url = `${APIHost}/api/recolectores/estadisticas/`;
    if (recolectorId) {
      url += `?recolector_id=${recolectorId}`;
    }

    try {
      const response = await fetch(url);
      const data: EstadisticasRecolector[] = await response.json();
      setEstadisticas(data);
      setIsEstadisticasModalOpen(true);
    } catch (error) {
      console.error("Error fetching estadísticas:", error);
      setToastMessage("Error obteniendo estadísticas");
      setToastType("error");
    }
  };

  const closeEstadisticasModal = () => {
    setIsEstadisticasModalOpen(false);
    setEstadisticas([]);
  };

  return (
    <div className="p-4">
      <h2>Control de Recolectores</h2>
      <button onClick={() => openModal()} className="btn btn-primary mb-4">Crear Nuevo Recolector</button>
      <button onClick={() => fetchEstadisticas()} className="btn btn-secondary mb-4 ml-2">Ver Estadísticas Generales</button>
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
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Teléfono</th>
            <th>Referido</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {recolectores.map((recolector) => (
            <tr key={recolector.id}>
              <td>{recolector.id}</td>
              <td>{recolector.nombre}</td>
              <td>{recolector.cedula}</td>
              <td>{recolector.telefono}</td>
              <td>{recolector.es_referido ? "Sí" : "No"}</td>
              <td>
                <button className="btn btn-primary mr-2" onClick={() => openModal(recolector)}>Editar</button>
                <button className="btn btn-danger mr-2" onClick={() => { setRecolectorToDelete(recolector.id); setIsConfirmationModalVisible(true); }}>Eliminar</button>
                <button className="btn btn-info" onClick={() => fetchEstadisticas(recolector.id)}>Ver Estadísticas</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modalIsOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeModal}>×</button>
            <h2>{isEditing ? "Editar Recolector" : "Crear Recolector"}</h2>
            <input
              type="text"
              placeholder="Nombre"
              value={isEditing && selectedRecolector ? selectedRecolector.nombre : newRecolector.nombre}
              onChange={(e) => {
                if (isEditing && selectedRecolector) {
                  setSelectedRecolector({ ...selectedRecolector, nombre: e.target.value });
                } else {
                  setNewRecolector({ ...newRecolector, nombre: e.target.value });
                }
              }}
              className="input input-bordered w-full mb-2"
            />
            <input
              type="text"
              placeholder="Cédula"
              value={isEditing && selectedRecolector ? selectedRecolector.cedula : newRecolector.cedula}
              onChange={(e) => {
                if (isEditing && selectedRecolector) {
                  setSelectedRecolector({ ...selectedRecolector, cedula: e.target.value });
                } else {
                  setNewRecolector({ ...newRecolector, cedula: e.target.value });
                }
              }}
              className="input input-bordered w-full mb-2"
            />
            <input
              type="text"
              placeholder="Teléfono"
              value={isEditing && selectedRecolector ? selectedRecolector.telefono : newRecolector.telefono}
              onChange={(e) => {
                if (isEditing && selectedRecolector) {
                  setSelectedRecolector({ ...selectedRecolector, telefono: e.target.value });
                } else {
                  setNewRecolector({ ...newRecolector, telefono: e.target.value });
                }
              }}
              className="input input-bordered w-full mb-2"
            />
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={isEditing && selectedRecolector ? selectedRecolector.es_referido : newRecolector.es_referido}
                onChange={(e) => {
                  if (isEditing && selectedRecolector) {
                    setSelectedRecolector({ ...selectedRecolector, es_referido: e.target.checked });
                  } else {
                    setNewRecolector({ ...newRecolector, es_referido: e.target.checked });
                  }
                }}
              />
              Es Referido
            </label>
            <button onClick={isEditing ? () => handleUpdate(selectedRecolector!) : handleCreate} className="btn btn-primary">
              {isEditing ? "Actualizar Recolector" : "Crear Recolector"}
            </button>
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
          message="¿Estás seguro de que quieres eliminar este recolector?"
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmationModalVisible(false)}
        />
      )}
      {isEstadisticasModalOpen && (
        <div className="modal-overlay" onClick={closeEstadisticasModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeEstadisticasModal}>×</button>
            <h2>Estadísticas de Recolectores</h2>
            <table className="table-auto w-full mb-4">
              <thead>
                <tr>
                  <th>ID Recolector</th>
                  <th>Nombre</th>
                  <th>Cantidad de Tickets</th>
                </tr>
              </thead>
              <tbody>
                {estadisticas.map((stat) => (
                  <tr key={stat.recolector_id}>
                    <td>{stat.recolector_id}</td>
                    <td>{stat.nombre}</td>
                    <td>{stat.tickets_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecolectorControl;
