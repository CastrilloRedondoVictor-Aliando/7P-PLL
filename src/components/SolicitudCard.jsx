import { Calendar, FileText } from 'lucide-react';
import { formatDateShort, getEstadoColor } from '../utils/helpers';

const SolicitudCard = ({ solicitud, isSelected, onClick }) => {
  const estadoColors = getEstadoColor(solicitud.estado);

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
        isSelected 
          ? `${estadoColors.border} bg-blue-50 shadow-md` 
          : 'border-gray-200 bg-white hover:shadow-md'
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-2">
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{solicitud.proyecto}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${estadoColors.bg} ${estadoColors.text}`}>
          {solicitud.estado}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {solicitud.comentarios?.trim() ? solicitud.comentarios : 'Sin descripcion'}
      </p>
      
      <div className="flex flex-wrap items-center text-xs text-gray-500 gap-3">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          Inicio: {solicitud.fechaInicio ? formatDateShort(solicitud.fechaInicio) : 'Sin fecha'}
        </div>
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          Fin: {solicitud.fechaFin ? formatDateShort(solicitud.fechaFin) : 'Sin fecha'}
        </div>
      </div>
    </div>
  );
};

export default SolicitudCard;
