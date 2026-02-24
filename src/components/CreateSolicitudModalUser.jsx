import { useEffect, useState } from 'react';
import { XCircle, Plus } from 'lucide-react';

const CreateSolicitudModalUser = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    proyecto: '',
    comentarios: '',
    pais: '',
    fechaInicio: '',
    fechaFin: '',
    filial: '',
    horasCodigo: ''
  });
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.proyecto && formData.comentarios) {
      onCreate(
        formData.proyecto,
        formData.comentarios,
        {
          pais: formData.pais,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin,
          filial: formData.filial,
          horasCodigo: formData.horasCodigo
        }
      );
      setFormData({
        proyecto: '',
        comentarios: '',
        pais: '',
        fechaInicio: '',
        fechaFin: '',
        filial: '',
        horasCodigo: ''
      });
      requestClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        <div className="bg-primary text-white p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h3 className="text-2xl font-bold">Nueva Solicitud</h3>
            <p className="text-blue-200 text-sm">Solicita servicios legales a Pérez-Llorca</p>
          </div>
          <button
            onClick={requestClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          <div>
            <label htmlFor="proyecto" className="block text-sm font-semibold text-gray-700 mb-2">
              Información del Proyecto *
            </label>
            <input
              id="proyecto"
              name="proyecto"
              type="text"
              value={formData.proyecto}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              placeholder="Ej: Asesoría legal para expansión internacional"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Título o nombre del proyecto para el que necesitas asesoría
            </p>
          </div>

          <div>
            <label htmlFor="comentarios" className="block text-sm font-semibold text-gray-700 mb-2">
              Principales funciones realizadas *
            </label>
            <textarea
              id="comentarios"
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
              placeholder="Describe los detalles de la solicitud..."
              required
            ></textarea>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Campos opcionales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pais" className="block text-sm font-semibold text-gray-700 mb-2">
                  Pais
                </label>
                <input
                  id="pais"
                  name="pais"
                  type="text"
                  value={formData.pais}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Espana"
                />
              </div>

              <div>
                <label htmlFor="filial" className="block text-sm font-semibold text-gray-700 mb-2">
                  Filial
                </label>
                <input
                  id="filial"
                  name="filial"
                  type="text"
                  value={formData.filial}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Madrid"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

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
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Enviar Solicitud</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSolicitudModalUser;
