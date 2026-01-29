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
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900">{solicitud.proyecto}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${estadoColors.bg} ${estadoColors.text}`}>
          {solicitud.estado}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {solicitud.comentarios}
      </p>
      
      <div className="flex items-center text-xs text-gray-500 space-x-4">
        <div className="flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {formatDateShort(solicitud.fechaCreacion)}
        </div>
        <div className="flex items-center">
          <FileText className="w-3 h-3 mr-1" />
          ID: {solicitud.id}
        </div>
      </div>
    </div>
  );
};

export default SolicitudCard;
