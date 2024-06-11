"use client";
import React, { useState, useEffect } from "react";

const ChatComponent = ({
  production,
  settingConfig,
  APIHost,
  RAGConfig,
  setCurrentPage,
  isAdmin,
  toggleAdmin,
  title,
  subtitle,
  imageSrc
}) => {
  const [electores, setElectores] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedElector, setSelectedElector] = useState(null);
  const [currentElectorPage, setCurrentElectorPage] = useState(1);
  const [electoresPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [cedulaSearch, setCedulaSearch] = useState("");

  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [parroquias, setParroquias] = useState([]);
  const [centrosVotacion, setCentrosVotacion] = useState([]);

  const [codigoEstado, setCodigoEstado] = useState("");
  const [codigoMunicipio, setCodigoMunicipio] = useState("");
  const [codigoParroquia, setCodigoParroquia] = useState("");
  const [codigoCentroVotacion, setCodigoCentroVotacion] = useState("");

  useEffect(() => {
    fetchEstados();
    fetchElectores();
    fetchTotalElectores();
  }, [codigoEstado, codigoMunicipio, codigoParroquia, codigoCentroVotacion, currentElectorPage]);

  const fetchEstados = async () => {
    try {
      const response = await fetch(`${APIHost}/estados/`);
      const data = await response.json();
      const uniqueEstados = Array.from(new Set(data.map(item => item.estado)))
        .map(estado => data.find(item => item.estado === estado));
      setEstados(uniqueEstados);
    } catch (error) {
      console.error("Error fetching estados:", error);
    }
  };

  const fetchMunicipios = async (codigoEstado) => {
    try {
      const response = await fetch(`${APIHost}/municipios/${codigoEstado}`);
      const data = await response.json();
      setMunicipios(data);
    } catch (error) {
      console.error("Error fetching municipios:", error);
    }
  };

  const fetchParroquias = async (codigoEstado, codigoMunicipio) => {
    try {
      const response = await fetch(`${APIHost}/parroquias/${codigoEstado}/${codigoMunicipio}`);
      const data = await response.json();
      setParroquias(data);
    } catch (error) {
      console.error("Error fetching parroquias:", error);
    }
  };

  const fetchCentrosVotacion = async (codigoEstado, codigoMunicipio, codigoParroquia) => {
    try {
      const response = await fetch(`${APIHost}/centros_votacion/${codigoEstado}/${codigoMunicipio}/${codigoParroquia}`);
      const data = await response.json();
      setCentrosVotacion(data);
    } catch (error) {
      console.error("Error fetching centros votacion:", error);
    }
  };

  const fetchElectores = async () => {
    try {
      const query = new URLSearchParams({
        skip: (currentElectorPage - 1) * electoresPerPage,
        limit: electoresPerPage,
        ...(codigoEstado && { codigo_estado: codigoEstado }),
        ...(codigoMunicipio && { codigo_municipio: codigoMunicipio }),
        ...(codigoParroquia && { codigo_parroquia: codigoParroquia }),
        ...(codigoCentroVotacion && { codigo_centro_votacion: codigoCentroVotacion }),
      }).toString();

      const response = await fetch(`${APIHost}/electores/?${query}`);
      const data = await response.json();
      setElectores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching electores:", error);
      setElectores([]);
    }
  };

  const fetchTotalElectores = async () => {
    try {
      const query = new URLSearchParams({
        ...(codigoEstado && { codigo_estado: codigoEstado }),
        ...(codigoMunicipio && { codigo_municipio: codigoMunicipio }),
        ...(codigoParroquia && { codigo_parroquia: codigoParroquia }),
        ...(codigoCentroVotacion && { codigo_centro_votacion: codigoCentroVotacion }),
      }).toString();

      const response = await fetch(`${APIHost}/total/electores?${query}`);
      const total = await response.json();
      setTotalPages(Math.ceil(total / electoresPerPage));
    } catch (error) {
      console.error("Error fetching total electores:", error);
      setTotalPages(1);
    }
  };

  const fetchElectorDetail = async (numero_cedula) => {
    if (!APIHost) return;
    try {
      const response = await fetch(`${APIHost}/electores/cedula/${numero_cedula}`);
      const data = await response.json();
      setSelectedElector(data);
    } catch (error) {
      console.error("Error fetching elector detail:", error);
    }
  };

  const handleEstadoChange = (e) => {
    const value = e.target.value;
    setCodigoEstado(value);
    setCodigoMunicipio("");
    setCodigoParroquia("");
    setCentrosVotacion([]);
    fetchMunicipios(value);
  };

  const handleMunicipioChange = (e) => {
    const value = e.target.value;
    setCodigoMunicipio(value);
    setCodigoParroquia("");
    setCentrosVotacion([]);
    fetchParroquias(codigoEstado, value);
  };

  const handleParroquiaChange = (e) => {
    const value = e.target.value;
    setCodigoParroquia(value);
    fetchCentrosVotacion(codigoEstado, codigoMunicipio, value);
  };

  const handleCentroVotacionChange = (e) => {
    const value = e.target.value;
    setCodigoCentroVotacion(value);
  };

  const handleCedulaSearchChange = (e) => {
    setCedulaSearch(e.target.value);
  };

  const handleCedulaSearch = async () => {
    if (cedulaSearch) {
      try {
        const response = await fetch(`${APIHost}/electores/cedula/${cedulaSearch}`);
        const data = await response.json();
        setSelectedElector(data);
        setModalIsOpen(true);
      } catch (error) {
        console.error("Error searching by cedula:", error);
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const openModal = (numero_cedula) => {
    fetchElectorDetail(numero_cedula);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedElector(null);
  };

  const paginate = (pageNumber) => {
    if (pageNumber < 1) {
      setCurrentElectorPage(1);
    } else if (pageNumber > totalPages) {
      setCurrentElectorPage(totalPages);
    } else {
      setCurrentElectorPage(pageNumber);
    }
    fetchElectores();
  };

  return (
    <div className="p-4">
      <h2>Control de Electores</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label>Estado:</label>
          <select onChange={handleEstadoChange} className="input input-bordered w-full" value={codigoEstado}>
            <option value="">Seleccione un estado</option>
            {estados.map(estado => (
              <option key={estado.codigo_estado} value={estado.codigo_estado}>
                {estado.estado}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Municipio:</label>
          <select
            onChange={handleMunicipioChange}
            className="input input-bordered w-full"
            value={codigoMunicipio}
            disabled={!codigoEstado}
          >
            <option value="">Seleccione un municipio</option>
            {municipios.map(municipio => (
              <option key={municipio.codigo_municipio} value={municipio.codigo_municipio}>
                {municipio.municipio}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Parroquia:</label>
          <select
            onChange={handleParroquiaChange}
            className="input input-bordered w-full"
            value={codigoParroquia}
            disabled={!codigoMunicipio}
          >
            <option value="">Seleccione una parroquia</option>
            {parroquias.map(parroquia => (
              <option key={parroquia.codigo_parroquia} value={parroquia.codigo_parroquia}>
                {parroquia.parroquia}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Centro de Votación:</label>
          <select
            onChange={handleCentroVotacionChange}
            className="input input-bordered w-full"
            value={codigoCentroVotacion}
            disabled={!codigoParroquia}
          >
            <option value="">Seleccione un centro de votación</option>
            {centrosVotacion.map(centro => (
              <option key={centro.codificacion_nueva_cv} value={centro.codificacion_nueva_cv}>
                {centro.nombre_cv}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Búsqueda por cédula:</label>
          <input
            type="text"
            value={cedulaSearch}
            onChange={handleCedulaSearchChange}
            className="input input-bordered w-full"
          />
          <button onClick={handleCedulaSearch} className="btn btn-primary w-full mt-2">Buscar</button>
        </div>
        <div>
          <label>Búsqueda general:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="input input-bordered w-full"
          />
        </div>
      </div>
      <div className="pagination mb-4 flex justify-center">
        <button onClick={() => paginate(1)} className="btn btn-primary mr-1">{"<<"}</button>
        <button onClick={() => paginate(currentElectorPage - 1)} className="btn btn-primary mr-1">{"<"}</button>
        <span className="btn btn-disabled mr-1">Página {currentElectorPage} de {totalPages}</span>
        <button onClick={() => paginate(currentElectorPage + 1)} className="btn btn-primary mr-1">{">"}</button>
        <button onClick={() => paginate(totalPages)} className="btn btn-primary">{">>"}</button>
      </div>
      <table className="table-auto w-full mb-4">
        <thead>
          <tr>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Centro de Votación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {electores.map((elector) => (
            <tr key={elector.id}>
              <td>{`${elector.letra_cedula}-${elector.numero_cedula}`}</td>
              <td>{elector.p_nombre}</td>
              <td>{elector.p_apellido}</td>
              <td>{elector.codigo_centro_votacion}</td>
              <td>
                <button className="btn btn-primary" onClick={() => openModal(elector.numero_cedula)}>
                  Ver Detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* <div className="pagination mb-4 flex justify-center">
        <button onClick={() => paginate(1)} className="btn btn-primary mr-1">{"<<"}</button>
        <button onClick={() => paginate(currentElectorPage - 1)} className="btn btn-primary mr-1">{"<"}</button>
        <span className="btn btn-disabled mr-1">Página {currentElectorPage} de {totalPages}</span>
        <button onClick={() => paginate(currentElectorPage + 1)} className="btn btn-primary mr-1">{">"}</button>
        <button onClick={() => paginate(totalPages)} className="btn btn-primary">{">>"}</button>
      </div> */}
      {modalIsOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-button" onClick={closeModal}>×</button>
            <h2>Detalle del Elector</h2>
            {selectedElector && (
              <div>
                <p><strong>ID:</strong> {selectedElector.elector.id}</p>
                <p><strong>Cédula:</strong> {`${selectedElector.elector.letra_cedula}-${selectedElector.elector.numero_cedula}`}</p>
                <p><strong>Nombre:</strong> {`${selectedElector.elector.p_nombre} ${selectedElector.elector.s_nombre}`}</p>
                <p><strong>Apellido:</strong> {`${selectedElector.elector.p_apellido} ${selectedElector.elector.s_apellido}`}</p>
                <p><strong>Sexo:</strong> {selectedElector.elector.sexo}</p>
                <p><strong>Fecha Nacimiento:</strong> {new Date(selectedElector.elector.fecha_nacimiento).toLocaleDateString()}</p>
                <p><strong>Estado:</strong> {selectedElector.geografico.estado}</p>
                <p><strong>Municipio:</strong> {selectedElector.geografico.municipio}</p>
                <p><strong>Parroquia:</strong> {selectedElector.geografico.parroquia}</p>
                <p><strong>Centro de Votación:</strong> {selectedElector.centro_votacion.nombre_cv}</p>
                <p><strong>Dirección Centro de Votación:</strong> {selectedElector.centro_votacion.direccion_cv}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;
