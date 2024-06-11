"use client";
import React, { useState } from "react";
import Toast from '../toast/Toast';

interface Ticket {
  id: number;
  numero_ticket: string;
  cedula: string;
  nombre: string;
  telefono: string;
  estado: string;
  municipio: string;
  parroquia: string;
  referido_id: number | null;
  validado: boolean;
  ganador: boolean;
}

const SorteoControl: React.FC = () => {
  const [ganadores, setGanadores] = useState<Ticket[]>([]);
  const [cantidadGanadores, setCantidadGanadores] = useState(1);
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const APIHost = 'http://localhost:8001';

  const handleSorteo = async () => {
    try {
      const response = await fetch(`${APIHost}/sorteo/ganadores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cantidad_ganadores: cantidadGanadores, estado, municipio })
      });
      const data: Ticket[] = await response.json();
      setGanadores(Array.isArray(data) ? data : []);
      setToastMessage("Sorteo realizado exitosamente");
      setToastType("success");
    } catch (error) {
      console.error("Error realizando el sorteo:", error);
      setGanadores([]);
      setToastMessage("Error realizando el sorteo. Por favor, intenta de nuevo.");
      setToastType("error");
    }
  };

  const handleQuitarGanadores = async () => {
    try {
      await fetch(`${APIHost}/sorteo/quitar_ganadores`, {
        method: "POST"
      });
      setGanadores([]);
      setToastMessage("Marca de ganadores eliminada exitosamente");
      setToastType("success");
    } catch (error) {
      console.error("Error quitando la marca de ganadores:", error);
      setToastMessage("Error quitando la marca de ganadores. Por favor, intenta de nuevo.");
      setToastType("error");
    }
  };

  return (
    <div className="p-4">
      <h2>Control de Sorteo de Ganadores</h2>
      <div className="mb-4">
        <label className="block mb-2">Cantidad de Ganadores</label>
        <input
          type="number"
          value={cantidadGanadores}
          onChange={(e) => setCantidadGanadores(parseInt(e.target.value))}
          className="input input-bordered w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Estado</label>
        <input
          type="text"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Municipio</label>
        <input
          type="text"
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
          className="input input-bordered w-full"
        />
      </div>
      <button onClick={handleSorteo} className="btn btn-primary mr-2">Realizar Sorteo</button>
      <button onClick={handleQuitarGanadores} className="btn btn-danger">Quitar Marca de Ganadores</button>
      {toastMessage && (
        <Toast 
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
      <h3 className="mt-4">Ganadores del Sorteo</h3>
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
          </tr>
        </thead>
        <tbody>
          {ganadores.length > 0 ? (
            ganadores.map((ganador) => (
              <tr key={ganador.id}>
                <td>{ganador.id}</td>
                <td>{ganador.numero_ticket}</td>
                <td>{ganador.cedula}</td>
                <td>{ganador.nombre}</td>
                <td>{ganador.telefono}</td>
                <td>{ganador.estado}</td>
                <td>{ganador.municipio}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="text-center">No hay ganadores disponibles</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SorteoControl;
