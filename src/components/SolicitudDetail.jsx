import { useState, useRef } from 'react';
import { Upload, Download, MessageSquare, Send, FileText, Calendar } from 'lucide-react';
import { formatDate, getEstadoColor } from '../utils/helpers';
import { MOCK_USERS } from '../data/mockData';

const SolicitudDetail = ({ 
  solicitud, 
  documentos, 
  mensajes, 
  onUploadDocument, 
  onSendMessage,
  currentUserId 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef(null);
  const estadoColors = getEstadoColor(solicitud.estado);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadDocument(file);
      e.target.value = ''; // Reset input
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const getUserName = (userId) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    return user ? user.name : 'Usuario desconocido';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Cabecera */}
      <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{solicitud.proyecto}</h2>
            <div className="flex items-center space-x-4 text-blue-100 text-sm">
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(solicitud.fechaCreacion)}
              </span>
              <span>ID: {solicitud.id}</span>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold ${estadoColors.bg} ${estadoColors.text}`}>
            {solicitud.estado}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6">
        {/* Comentarios */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
          <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{solicitud.comentarios}</p>
        </div>

        {/* Documentos */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Documentos</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Documento</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            />
          </div>

          <div className="space-y-2">
            {documentos.length === 0 ? (
              <p className="text-gray-500 text-center py-6 bg-gray-50 rounded-lg">
                No hay documentos adjuntos
              </p>
            ) : (
              documentos.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.nombreArchivo}</p>
                      <p className="text-xs text-gray-500">
                        {doc.tamaño} • {formatDate(doc.fechaCarga)}
                      </p>
                    </div>
                  </div>
                  <button className="text-primary hover:text-blue-700 transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary" />
            Conversación
          </h3>
          
          {/* Mensajes */}
          <div className="bg-gray-50 rounded-lg p-4 mb-3 max-h-96 overflow-y-auto space-y-3">
            {mensajes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay mensajes</p>
            ) : (
              mensajes.map(mensaje => {
                const isCurrentUser = mensaje.usuarioID === currentUserId;
                return (
                  <div
                    key={mensaje.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isCurrentUser
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className={`text-xs font-semibold mb-1 ${
                        isCurrentUser ? 'text-blue-200' : 'text-gray-600'
                      }`}>
                        {getUserName(mensaje.usuarioID)}
                      </p>
                      <p className="text-sm">{mensaje.contenido}</p>
                      <p className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatDate(mensaje.fechaEnvio)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input de nuevo mensaje */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitudDetail;
