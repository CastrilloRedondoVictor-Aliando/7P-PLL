import { useState } from 'react';
import { XCircle, Plus } from 'lucide-react';

const CreateSolicitudModalUser = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    proyecto: '',
    comentarios: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.proyecto && formData.comentarios) {
      onCreate(
        formData.proyecto,
        formData.comentarios
      );
      setFormData({ proyecto: '', comentarios: '' });
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Nueva Solicitud</h3>
            <p className="text-blue-200 text-sm">Solicita servicios legales a Pérez-Llorca</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              Comentarios Adicionales *
            </label>
            <textarea
              id="comentarios"
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
              placeholder="Describe los detalles de tu solicitud, el contexto, y lo que necesitas que revisemos..."
              required
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
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
