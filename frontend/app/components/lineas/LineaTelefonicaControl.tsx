/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Toast from '../toast/Toast';
import { detectHost } from "../../api";
// Importar los hooks de React Query
import {
    useLineasTelefonicas,
    useCreateLineaTelefonica,
    useUpdateLineaTelefonica,
    useDeleteLineaTelefonica
} from "../../hooks/useLineasTelefonicas"; // Ajusta la ruta si es necesario

interface LineaTelefonica {
  id: number;
  numero: string;
  operador: string;
}

const LineaTelefonicaControl: React.FC = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedLinea, setSelectedLinea] = useState<Partial<LineaTelefonica> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lineasPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ numero: "", operador: "" });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [APIHost, setAPIHost] = useState<string | null>(null);

  const queryParams = useMemo(() => ({
      currentPage,
      lineasPerPage,
      searchTerm
  }), [currentPage, lineasPerPage, searchTerm]);

  const { 
    data: lineasData,
    isLoading: isLoadingLineas,
    isError: isErrorLineas,
    error: errorLineas
  } = useLineasTelefonicas(queryParams);

  const createLineaMutation = useCreateLineaTelefonica();
  const updateLineaMutation = useUpdateLineaTelefonica();
  const deleteLineaMutation = useDeleteLineaTelefonica();

  const totalPages = useMemo(() => {
      if (!lineasData) return 1;
      return Math.ceil(lineasData.total / lineasPerPage);
  }, [lineasData, lineasPerPage]);

  useEffect(() => {
      if (isErrorLineas && errorLineas) {
          setToastMessage(errorLineas.message || "Error cargando las líneas telefónicas.");
          setToastType("error");
      }
  }, [isErrorLineas, errorLineas]);

  useEffect(() => {
      if (isEditing && selectedLinea) {
          setFormData({ 
              numero: selectedLinea.numero || "", 
              operador: selectedLinea.operador || "" 
          });
      } else {
          setFormData({ numero: "", operador: "" });
      }
  }, [isEditing, selectedLinea]);

  const fetchHost = async () => {
    try {
      const host = await detectHost();
      setAPIHost(host);
    } catch (error) {
      console.error("Error detecting host:", error);
      setAPIHost(process.env.HOST || 'https://applottobueno.com');
    }
  };

  const openModal = (linea: LineaTelefonica | null = null) => {
    if (linea) {
        setSelectedLinea(linea);
        setIsEditing(true);
    } else {
        setSelectedLinea(null);
        setIsEditing(false);
        setFormData({ numero: "", operador: "" });
    }
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedLinea(null);
    setIsEditing(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = (id: number) => {
      deleteLineaMutation.mutate(id, {
          onSuccess: () => {
              setToastMessage("Línea eliminada exitosamente");
              setToastType("success");
          },
          onError: (error) => {
              setToastMessage(error.message || "Error al eliminar la línea.");
              setToastType("error");
          }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isEditing && selectedLinea?.id) {
          updateLineaMutation.mutate({ lineaId: selectedLinea.id, payload: formData }, {
              onSuccess: () => {
                  setToastMessage("Línea actualizada exitosamente");
                  setToastType("success");
                  closeModal();
              },
              onError: (error) => {
                  setToastMessage(error.message || "Error al actualizar la línea.");
                  setToastType("error");
              }
          });
      } else {
          createLineaMutation.mutate(formData, {
              onSuccess: () => {
                  setToastMessage("Línea creada exitosamente");
                  setToastType("success");
                  closeModal();
              },
              onError: (error) => {
                  setToastMessage(error.message || "Error al crear la línea.");
                  setToastType("error");
              }
          });
      }
  };

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const lineas = lineasData?.items ?? [];

  return (
    <div className="p-4">
      <h2>Control de Líneas Telefónicas</h2>
      <button onClick={() => openModal()} className="btn btn-primary mb-4">Crear Nueva Línea</button>
      <input
        type="text"
        placeholder="Buscar..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="input input-bordered mb-4"
      />
      {isLoadingLineas && <p>Cargando líneas...</p>}
      {isErrorLineas && <p className="text-red-500">Error al cargar líneas.</p>}
      
      <div className="pagination mb-4 flex justify-center">
        <button onClick={() => paginate(1)} disabled={currentPage === 1 || isLoadingLineas} className="btn btn-primary mr-1">{"<<"}</button>
        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1 || isLoadingLineas} className="btn btn-primary mr-1">{"<"}</button>
        <span className="btn btn-disabled mr-1">Página {currentPage} de {totalPages}</span>
        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || isLoadingLineas} className="btn btn-primary mr-1">{">"}</button>
        <button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages || isLoadingLineas} className="btn btn-primary">{">>"}</button>
      </div>
      <table className="table-auto w-full mb-4">
        <thead>
          <tr>
            <th>ID</th>
            <th>Número</th>
            <th>Operador</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.id}</td>
              <td>{linea.numero}</td>
              <td>{linea.operador}</td>
              <td>
                <button className="btn btn-primary mr-2" onClick={() => openModal(linea)} disabled={createLineaMutation.isPending || updateLineaMutation.isPending || deleteLineaMutation.isPending}>Editar</button>
                <button className="btn btn-danger" onClick={() => handleDelete(linea.id)} disabled={deleteLineaMutation.isPending || deleteLineaMutation.variables === linea.id}>
                  {deleteLineaMutation.isPending && deleteLineaMutation.variables === linea.id ? "Eliminando..." : "Eliminar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modalIsOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeModal}>×</button>
            <h2>{isEditing ? "Editar Línea" : "Crear Nueva Línea"}</h2>
            <form onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Número</label>
                <input
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleFormChange}
                  required
                  className="input input-bordered w-full mb-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operador</label>
                <input
                  type="text"
                  name="operador"
                  value={formData.operador}
                  onChange={handleFormChange}
                  required
                  className="input input-bordered w-full mb-2"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={createLineaMutation.isPending || updateLineaMutation.isPending}>
                {createLineaMutation.isPending || updateLineaMutation.isPending ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Crear")}
              </button>
            </form>
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
    </div>
  );
};

export default LineaTelefonicaControl;
