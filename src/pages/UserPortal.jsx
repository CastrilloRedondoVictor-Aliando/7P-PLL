import { useState } from 'react';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import SolicitudCard from '../components/SolicitudCard';
import SolicitudDetail from '../components/SolicitudDetail';

const UserPortal = () => {
  const { user, solicitudes, documentos, mensajes, logout, uploadDocument, sendMessage } = useAuth();
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');

  // Filtrar solicitudes del usuario actual
  const userSolicitudes = solicitudes.filter(s => s.usuarioID === user.id);

  // Aplicar búsqueda y filtros
  const filteredSolicitudes = userSolicitudes.filter(s => {
    const matchesSearch = s.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.comentarios.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEstado === 'Todos' || s.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  // Documentos y mensajes de la solicitud seleccionada
  const solicitudDocumentos = selectedSolicitud 
    ? documentos.filter(d => d.solicitudID === selectedSolicitud.id)
    : [];
    
  const solicitudMensajes = selectedSolicitud
    ? mensajes.filter(m => m.solicitudID === selectedSolicitud.id)
    : [];

  const handleUploadDocument = (file) => {
    if (selectedSolicitud) {
      uploadDocument(selectedSolicitud.id, file);
    }
  };

  const handleSendMessage = (contenido) => {
    if (selectedSolicitud && contenido.trim()) {
      sendMessage(selectedSolicitud.id, contenido);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">7P-PLL</h1>
              <p className="text-blue-200 text-sm">Portal de Usuario</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-semibold">{user.name}</p>
                <p className="text-blue-200 text-sm">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Solicitudes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes</h2>
              
              {/* Búsqueda */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar solicitudes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Filtro de Estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente de revisión">Pendiente de revisión</option>
                <option value="Aceptada">Aceptada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Requiere más información">Requiere más información</option>
              </select>

              {/* Lista de Solicitudes */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredSolicitudes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay solicitudes</p>
                ) : (
                  filteredSolicitudes.map(solicitud => (
                    <SolicitudCard
                      key={solicitud.id}
                      solicitud={solicitud}
                      isSelected={selectedSolicitud?.id === solicitud.id}
                      onClick={() => setSelectedSolicitud(solicitud)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel de Detalle */}
          <div className="lg:col-span-2">
            {selectedSolicitud ? (
              <SolicitudDetail
                solicitud={selectedSolicitud}
                documentos={solicitudDocumentos}
                mensajes={solicitudMensajes}
                onUploadDocument={handleUploadDocument}
                onSendMessage={handleSendMessage}
                currentUserId={user.id}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecciona una solicitud para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
