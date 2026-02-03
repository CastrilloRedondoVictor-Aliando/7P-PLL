import { useState, useRef, useEffect } from 'react';
import { Upload, Download, MessageSquare, Send, FileText, Calendar, X, CheckCircle, Edit2, Check } from 'lucide-react';
import { formatDate, getEstadoColor } from '../utils/helpers';
import { apiRequest } from '../config/api';

const SolicitudDetail = ({ 
  solicitud, 
  documentos, 
  mensajes, 
  onUploadDocument, 
  onSendMessage,
  onUpdateDescripcion,
  currentUserId,
  isUserView = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [editingDescripcion, setEditingDescripcion] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState('General');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const fileInputRef = useRef(null);
  const estadoColors = getEstadoColor(solicitud.estado);

  const categorias = ['General', 'Vuelos', 'Hoteles'];

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await apiRequest('/auth/users');
        setUsuarios(data);
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    };
    loadUsers();
  }, []);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
      e.target.value = ''; // Reset input
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const confirmUpload = () => {
    if (pendingFiles.length > 0) {
      pendingFiles.forEach(file => onUploadDocument(file, selectedCategoria));
      setPendingFiles([]);
    }
  };

  const removeFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const cancelUpload = () => {
    setPendingFiles([]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const getUserName = (userId) => {
    const user = usuarios.find(u => u.id === userId);
    return user ? user.nombre : 'Usuario desconocido';
  };

  const handleEditDescripcion = () => {
    setNuevaDescripcion(solicitud.comentarios);
    setEditingDescripcion(true);
  };

  const handleSaveDescripcion = async () => {
    if (nuevaDescripcion.trim() && nuevaDescripcion !== solicitud.comentarios && onUpdateDescripcion) {
      await onUpdateDescripcion(solicitud.id, nuevaDescripcion.trim());
    }
    setEditingDescripcion(false);
  };

  const handleCancelEditDescripcion = () => {
    setEditingDescripcion(false);
    setNuevaDescripcion('');
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Principales funciones realizadas</h3>
            {isUserView && !editingDescripcion && (
              <button
                onClick={handleEditDescripcion}
                className="text-primary hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                title="Editar descripción"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
          {editingDescripcion ? (
            <div className="space-y-2">
              <textarea
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                rows="5"
                autoFocus
              />
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={handleCancelEditDescripcion}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={handleSaveDescripcion}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{solicitud.comentarios}</p>
          )}
        </div>

        {/* Documentos */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Documentos</h3>

          {/* Zona de drag and drop */}
          {pendingFiles.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 mb-3 transition-all cursor-pointer ${
                isDragging
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-blue-50'
              }`}
            >
              <div className="text-center">
                <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold mb-2 ${isDragging ? 'text-primary' : 'text-gray-700'}`}>
                  {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta un archivo aquí'}
                </p>
                <p className="text-sm text-gray-600 mb-3">o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-3">
                  Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, PPT , PPTX y más.
                </p>
              </div>
            </div>
          ) : (
            /* Previsualización de archivos */
            <div className="border-2 border-primary rounded-lg p-6 mb-3 bg-blue-50">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {pendingFiles.length} archivo{pendingFiles.length !== 1 ? 's' : ''} seleccionado{pendingFiles.length !== 1 ? 's' : ''}
              </h4>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                >
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {pendingFiles.map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Eliminar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={confirmUpload}
                  className="flex-1 flex items-center justify-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Subir {pendingFiles.length} documento{pendingFiles.length !== 1 ? 's' : ''}</span>
                </button>
                <button
                  onClick={cancelUpload}
                  className="flex items-center justify-center space-x-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                >
                  <X className="w-5 h-5" />
                  <span>Cancelar</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-2 border-2 border-primary text-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                >
                  <Upload className="w-5 h-5" />
                  <span>Agregar más</span>
                </button>
              </div>
            </div>
          )}

          {/* Input file compartido */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="*"
            multiple
          />

          {/* Filtro de categoría */}
          <div className="mb-3">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white"
            >
              <option value="Todas">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {documentos.filter(doc => filtroCategoria === 'Todas' || doc.categoria === filtroCategoria).length === 0 ? (
              <p className="text-gray-500 text-center py-4 text-sm">
                No hay documentos {filtroCategoria !== 'Todas' ? `en la categoría "${filtroCategoria}"` : 'adjuntos'}
              </p>
            ) : (
              documentos
                .filter(doc => filtroCategoria === 'Todas' || doc.categoria === filtroCategoria)
                .map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900">{doc.nombreArchivo}</p>
                        {doc.categoria && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                            {doc.categoria}
                          </span>
                        )}
                      </div>
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
