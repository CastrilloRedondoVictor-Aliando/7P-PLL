import React, { useEffect, useMemo, useState } from 'react';
import { XCircle, Search } from 'lucide-react';

const SolicitudModalBase = ({
  isOpen,
  onClose,
  onCreate,
  onSubmit,
  availableUsers,
  loadingUsers,
  mode,
  title,
  headerSubtitle,
  submitLabel,
  projectLabel,
  projectPlaceholder,
  projectHelper,
  commentsLabel,
  commentsPlaceholder,
  requireComments,
  hideRecipientSelector,
  initialData,
  showPercentageField
}) => {
  const toDateInputValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }
      const esMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (esMatch) {
        return `${esMatch[3]}-${esMatch[2]}-${esMatch[1]}`;
      }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const buildInitialFormData = () => ({
    proyecto: initialData?.proyecto || '',
    comentarios: initialData?.comentarios || '',
    trayecto: initialData?.trayecto || '',
    destino: initialData?.destino || '',
    fechaInicio: toDateInputValue(initialData?.fechaInicio),
    fechaFin: toDateInputValue(initialData?.fechaFin),
    empresa: initialData?.empresa || '',
    horasCodigo: initialData?.horasCodigo || '',
    porcentaje:
      initialData?.porcentaje === null || initialData?.porcentaje === undefined || initialData?.porcentaje === ''
        ? ''
        : `${initialData.porcentaje}`
  });
  const shouldSelectRecipients = mode === 'admin' && !hideRecipientSelector;
  const [formData, setFormData] = useState({
    proyecto: '',
    comentarios: '',
    trayecto: '',
    destino: '',
    fechaInicio: '',
    fechaFin: '',
    empresa: '',
    horasCodigo: '',
    porcentaje: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const [dateError, setDateError] = useState('');
  const normalizedSubmitLabel = (submitLabel || '').toString().replace(/^\s*\+\s*/, '');

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialFormData());
      setSearchInput('');
      setSelectedEmails([]);
      setDateError('');
      setIsClosing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const normalizedSearch = (searchInput || '').trim().toLowerCase();
  const filteredAvailableUsers = useMemo(() => {
    const users = Array.isArray(availableUsers) ? availableUsers : [];
    if (!normalizedSearch) return users;
    return users.filter((user) => {
      const email = (user?.email || '').toLowerCase();
      const nombre = (user?.nombre || '').toLowerCase();
      return email.includes(normalizedSearch) || nombre.includes(normalizedSearch);
    });
  }, [availableUsers, normalizedSearch]);

  const toggleAvailableUser = (email) => {
    const safeEmail = (email || '').toString().trim().toLowerCase();
    if (!safeEmail) return;
    const selected = new Set(selectedEmails);
    if (selected.has(safeEmail)) {
      selected.delete(safeEmail);
    } else {
      selected.add(safeEmail);
    }
    setSelectedEmails(Array.from(selected));
  };

  const requestClose = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 180);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.fechaInicio && formData.fechaFin) {
      const start = new Date(formData.fechaInicio);
      const end = new Date(formData.fechaFin);
      if (start > end) {
        setDateError('La fecha de inicio no puede ser posterior a la fecha de fin');
        return;
      }
    }

    if (showPercentageField && formData.porcentaje !== '') {
      const parsedPorcentaje = Number(formData.porcentaje);
      if (Number.isNaN(parsedPorcentaje) || parsedPorcentaje < 0 || parsedPorcentaje > 100) {
        setDateError('El porcentaje debe estar entre 0 y 100');
        return;
      }
    }

    setDateError('');

    const baseExtras = {
      trayecto: formData.trayecto,
      destino: formData.destino,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin,
      empresa: formData.empresa,
      horasCodigo: formData.horasCodigo,
      porcentaje: showPercentageField && formData.porcentaje !== '' ? Number(formData.porcentaje) : undefined
    };

    let submitResult;
    if (mode === 'admin' && shouldSelectRecipients) {
      if (selectedEmails.length > 0 && formData.proyecto) {
        submitResult = await onCreate(selectedEmails, formData.proyecto, '', baseExtras);
      } else {
        return;
      }
    } else if (mode === 'admin') {
      if (!formData.proyecto) {
        return;
      }
      const submitFn = onSubmit || onCreate;
      submitResult = await submitFn({
        proyecto: formData.proyecto,
        comentarios: formData.comentarios,
        ...baseExtras
      });
    } else {
      if (formData.proyecto && (!requireComments || formData.comentarios)) {
        submitResult = await onCreate(formData.proyecto, formData.comentarios, baseExtras);
      } else {
        return;
      }
    }

    if (submitResult === false || submitResult === null) {
      return;
    }

    setFormData({
      proyecto: '',
      comentarios: '',
      trayecto: '',
      destino: '',
      fechaInicio: '',
      fechaFin: '',
      empresa: '',
      horasCodigo: '',
      porcentaje: ''
    });
    setSearchInput('');
    setSelectedEmails([]);
    requestClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={requestClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-primary text-white p-4 sm:p-6 pr-14">
          <div>
            <h3 className="text-2xl font-bold">{title || 'Nueva Solicitud'}</h3>
            <p className="text-blue-200 text-sm">{headerSubtitle}</p>
          </div>
          <button
            onClick={requestClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
            aria-label="Cerrar modal"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {shouldSelectRecipients && (
            <div>
              <label htmlFor="emails" className="block text-sm font-semibold text-gray-700 mb-2">
                Emails destinatarios *
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="emails"
                  type="text"
                  placeholder="Buscar por nombre o email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div className="border border-gray-100 rounded-lg bg-gray-50 p-2 max-h-44 overflow-y-auto mb-2">
                {loadingUsers ? (
                  <p className="text-xs text-gray-500 px-2 py-1">Cargando usuarios...</p>
                ) : filteredAvailableUsers.length > 0 ? (
                  filteredAvailableUsers.map((user) => {
                    const email = (user?.email || '').toLowerCase();
                    const isSelected = selectedEmails.includes(email);
                    return (
                      <button
                        key={user.oid || email}
                        type="button"
                        onClick={() => toggleAvailableUser(user.email)}
                        className={`w-full text-left px-2 py-2 rounded-md transition-colors ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-white text-gray-700'}`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAvailableUser(user.email)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1"
                            aria-label={`Seleccionar ${user.nombre || user.email}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{user.nombre || user.email}</p>
                            <p className="text-xs opacity-80">{user.email}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500 px-2 py-1">No hay coincidencias con la búsqueda.</p>
                )}
              </div>
              {selectedEmails.length > 0 && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                  {selectedEmails.length} usuario{selectedEmails.length === 1 ? '' : 's'} seleccionado{selectedEmails.length === 1 ? '' : 's'}.
                </p>
              )}
              {selectedEmails.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Selecciona al menos un usuario</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="proyecto" className="block text-sm font-semibold text-gray-700 mb-2">
              {projectLabel}
            </label>
            <input
              id="proyecto"
              name="proyecto"
              type="text"
              value={formData.proyecto}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              placeholder={projectPlaceholder}
              required
            />
            {projectHelper && (
              <p className="text-xs text-gray-500 mt-1">{projectHelper}</p>
            )}
          </div>

          {commentsLabel && (
            <div>
              <label htmlFor="comentarios" className="block text-sm font-semibold text-gray-700 mb-2">
                {commentsLabel}
              </label>
              <textarea
                id="comentarios"
                name="comentarios"
                value={formData.comentarios}
                onChange={handleChange}
                rows="5"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                placeholder={commentsPlaceholder}
                required={requireComments}
              ></textarea>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Campos opcionales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trayecto" className="block text-sm font-semibold text-gray-700 mb-2">
                  Trayecto
                </label>
                <input
                  id="trayecto"
                  name="trayecto"
                  type="text"
                  value={formData.trayecto}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Madrid - Barcelona / Barcelona - Madrid"
                />
              </div>

              <div>
                <label htmlFor="destino" className="block text-sm font-semibold text-gray-700 mb-2">
                  Destino
                </label>
                <input
                  id="destino"
                  name="destino"
                  type="text"
                  value={formData.destino}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Barcelona"
                />
              </div>

              <div>
                <label htmlFor="empresa" className="block text-sm font-semibold text-gray-700 mb-2">
                  Empresa
                </label>
                <input
                  id="empresa"
                  name="empresa"
                  type="text"
                  value={formData.empresa}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Perez-Llorca"
                />
              </div>

              <div>
                <label htmlFor="fechaInicio" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de inicio
                </label>
                <input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={handleChange}
                  max={formData.fechaFin || undefined}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="fechaFin" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de fin
                </label>
                <input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={handleChange}
                  min={formData.fechaInicio || undefined}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {showPercentageField && (
                <div>
                  <label htmlFor="porcentaje" className="block text-sm font-semibold text-gray-700 mb-2">
                    Porcentaje
                  </label>
                  <input
                    id="porcentaje"
                    name="porcentaje"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.porcentaje}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Ej: 75"
                  />
                </div>
              )}
              {dateError && (
                <p className="text-xs text-red-500 sm:col-span-2">{dateError}</p>
              )}

              <div>
                <label htmlFor="horasCodigo" className="block text-sm font-semibold text-gray-700 mb-2">
                  Horas codigo
                </label>
                <input
                  id="horasCodigo"
                  name="horasCodigo"
                  type="text"
                  value={formData.horasCodigo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: 120h"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={requestClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-center"
            >
              {normalizedSubmitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SolicitudModalBase;
