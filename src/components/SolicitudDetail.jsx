import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Swal from 'sweetalert2';
import { Upload, Download, MessageSquare, Send, FileText, Calendar, X, CheckCircle, Edit2, Check, Trash2, MapPin, Building2, Clock, Percent } from 'lucide-react';
import { formatDate, getEstadoColor } from '../utils/helpers';
import { apiRequest } from '../config/api';
import { useAuth } from '../hooks/useAuth';

const SolicitudDetail = ({ 
  solicitud, 
  documentos, 
  mensajes, 
  onUploadDocument, 
  onSendMessage,
  onUpdateDescripcion,
  currentUserId,
  isUserView = false,
  showCloseButton = false,
  onClose,
}) => {
  const { getAccessToken, getDocumentDownloadUrl, getDocumentPreviewUrl, deleteDocument } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [editingDescripcion, setEditingDescripcion] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const estadoColors = getEstadoColor(solicitud.estado);
  const shouldShowPercentage = !isUserView || solicitud.estado === 'Aceptada';

  const categorias = [
    { value: 'General', label: 'Principales funciones' },
    { value: 'Vuelos', label: 'Vuelos' },
    { value: 'Hoteles', label: 'Hoteles' }
  ];

  useLayoutEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const rafId = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [mensajes.length, solicitud?.id]);

  // Unirse al grupo de SignalR cuando se visualiza una solicitud
  useEffect(() => {
    const joinSolicitudGroup = async () => {
      if (solicitud?.id) {
        try {
          const token = await getAccessToken();
          await apiRequest('/signalr/join-group', {
            method: 'POST',
            body: JSON.stringify({ solicitudID: solicitud.id }),
            token
          });
          console.log(`📥 Usuario unido al grupo de solicitud ${solicitud.id}`);
        } catch (error) {
          console.error('Error uniéndose al grupo de SignalR:', error);
        }
      }
    };

    joinSolicitudGroup();

    // Cleanup: salir del grupo cuando se desmonta o cambia de solicitud
    return () => {
      const leaveSolicitudGroup = async () => {
        if (solicitud?.id) {
          try {
            const token = await getAccessToken();
            await apiRequest('/signalr/leave-group', {
              method: 'POST',
              body: JSON.stringify({ solicitudID: solicitud.id }),
              token
            });
            console.log(`📤 Usuario salió del grupo de solicitud ${solicitud.id}`);
          } catch (error) {
            console.error('Error saliendo del grupo de SignalR:', error);
          }
        }
      };
      leaveSolicitudGroup();
    };
  }, [solicitud?.id, getAccessToken]);


  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map(file => ({
        file,
        categoria: 'General'
      }));
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
      pendingFiles.forEach(({ file, categoria }) => onUploadDocument(file, categoria));
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
      setIsSendBouncing(true);
      setTimeout(() => setIsSendBouncing(false), 220);
    }
  };

  const getUserName = (userId) => {
    const userMessage = mensajes.find(m => m.usuarioID === userId && m.usuarioNombre);
    if (userMessage?.usuarioNombre) return userMessage.usuarioNombre;
    return solicitud?.usuarioNombre || solicitud?.usuarioEmail || 'Usuario desconocido';
  };

  const handleEditDescripcion = () => {
    setNuevaDescripcion(solicitud.comentarios || '');
    setEditingDescripcion(true);
  };

  const handleSaveDescripcion = async () => {
    const nextDescripcion = nuevaDescripcion?.trim() ? nuevaDescripcion.trim() : '';
    const currentDescripcion = solicitud.comentarios?.trim() ? solicitud.comentarios.trim() : '';
    if (nextDescripcion !== currentDescripcion && onUpdateDescripcion) {
      await onUpdateDescripcion(solicitud.id, nextDescripcion);
    }
    setEditingDescripcion(false);
  };

  const handleCancelEditDescripcion = () => {
    setEditingDescripcion(false);
    setNuevaDescripcion('');
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const [previewUrl, downloadUrl] = await Promise.all([
        getDocumentPreviewUrl(doc.id),
        getDocumentDownloadUrl(doc.id)
      ]);

      const fileName = doc?.nombre || '';
      const fileType = doc?.tipo || '';
      const lowerName = fileName.toLowerCase();
      const isPdf = fileType.includes('pdf') || lowerName.endsWith('.pdf');
      const isImage = fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lowerName);
      const isOffice = /\.(docx?|xlsx?|pptx?)$/.test(lowerName) ||
        /(word|excel|powerpoint)/i.test(fileType);
      const previewSrc = isOffice
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}&zoom=50`
        : previewUrl;
      const canEmbed = isPdf || isImage || isOffice;
      const isMobile = window.matchMedia('(max-width: 1023px)').matches;

      if (isMobile) {
        const mobileResult = await Swal.fire({
          title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
          text: 'En movil la previsualizacion se abre en una nueva pestaña para poder usar los controles.',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'Abrir vista',
          denyButtonText: 'Descargar',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#1e40af'
        });

        if (mobileResult.isConfirmed) {
          window.open(previewSrc, '_blank', 'noopener');
        } else if (mobileResult.isDenied) {
          window.open(downloadUrl, '_blank', 'noopener');
        }
        return;
      }

      const result = await Swal.fire({
        title: doc?.nombre ? `Previsualizar ${doc.nombre}` : 'Previsualizar documento',
        html: canEmbed
          ? `
            <div style="width:100%;height:60vh;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
              <iframe src="${previewSrc}" title="Previsualizacion" style="width:100%;height:100%;border:0;"></iframe>
            </div>
            <p style="margin-top:10px;font-size:14px;color:#6b7280;">Si no puedes ver la previsualizacion, usa el boton Descargar.</p>
          `
          : `
            <div style="padding:18px;border-radius:10px;border:1px solid #e5e7eb;background:#f8fafc;">
              <p style="font-size:14px;color:#334155;">Este tipo de archivo no admite previsualizacion en el navegador.</p>
            </div>
            <p style="margin-top:10px;font-size:14px;color:#6b7280;">Usa el boton Descargar para abrirlo.</p>
          `,
        showCancelButton: true,
        confirmButtonText: 'Descargar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#1e40af',
        width: 900
      });

      if (result.isConfirmed) {
        window.open(downloadUrl, '_blank', 'noopener');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo descargar el documento',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error descargando documento:', error);
    }
  };

  const handleDeleteDocument = async (doc) => {
    const result = await Swal.fire({
      title: '¿Eliminar documento?',
      text: `Se eliminara ${doc.nombre} de forma permanente`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await deleteDocument(doc.id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Cabecera */}
      <div className={`${isUserView ? 'bg-primary' : 'bg-gradient-to-r from-primary to-blue-600'} text-white p-4 sm:p-6`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">
                {(solicitud.pais?.trim() ? solicitud.pais.toUpperCase() : 'SIN DESTINO')}
                {' - '}
                {solicitud.fechaInicio
                  ? new Date(solicitud.fechaInicio)
                      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                      .toUpperCase()
                  : 'SIN FECHA'}
              </h2>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                  aria-label="Cerrar detalle"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 text-blue-100 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Inicio: {solicitud.fechaInicio ? formatDate(solicitud.fechaInicio) : 'Sin fecha'}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Fin: {solicitud.fechaFin ? formatDate(solicitud.fechaFin) : 'Sin fecha'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Destino: {solicitud.pais?.trim() ? solicitud.pais : 'Sin destino'}
                </span>
                {shouldShowPercentage && (
                  <span className="flex items-center">
                    <Percent className="w-4 h-4 mr-1" />
                    Porcentaje: {solicitud.porcentaje !== null && solicitud.porcentaje !== undefined && solicitud.porcentaje !== '' ? `${solicitud.porcentaje}%` : '0%'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full font-semibold ${estadoColors.bg} ${estadoColors.text}`}>
            {solicitud.estado}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 sm:p-6 space-y-6">
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
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
              {solicitud.comentarios?.trim() ? solicitud.comentarios : 'Sin descripcion'}
            </p>
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
              className={`border-2 border-dashed rounded-lg p-5 sm:p-8 mb-3 transition-all cursor-pointer ${
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
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {pendingFiles.map((pending, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-white p-3 rounded-lg">
                    <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {pending.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(pending.file.size)}
                      </p>
                      <div className="mt-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Categoría
                        </label>
                        <select
                          value={pending.categoria}
                          onChange={(e) =>
                            setPendingFiles(prev =>
                              prev.map((item, i) =>
                                i === index ? { ...item, categoria: e.target.value } : item
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm"
                        >
                          {categorias.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
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
              <div className="flex flex-col sm:flex-row gap-3">
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

          {/* Secciones de documentos por categoría */}
          <div className="space-y-6">
            {/* Principales funciones */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h4 className="text-md font-semibold text-gray-900">Principales funciones</h4>
              </div>
              <div className="space-y-2">
                {documentos.filter(doc => doc.categoria === 'General').length === 0 ? (
                  <p className="text-gray-500 text-sm py-2 pl-7">
                    No hay documentos en esta categoría
                  </p>
                ) : (
                  documentos
                    .filter(doc => doc.categoria === 'General')
                    .map(doc => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc)}
                              className="text-sm font-normal text-gray-600 hover:text-gray-800 truncate block text-left"
                            >
                              {doc.nombre}
                            </button>
                            <span className="text-[0.7rem] italic text-gray-500 block mt-0.5">
                              {doc.createdAt || doc.fechaCarga ? formatDate(doc.createdAt || doc.fechaCarga) : 'Fecha no disponible'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex-shrink-0 text-primary hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Vuelos */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <h4 className="text-md font-semibold text-gray-900">Vuelos</h4>
              </div>
              <div className="space-y-2">
                {documentos.filter(doc => doc.categoria === 'Vuelos').length === 0 ? (
                  <p className="text-gray-500 text-sm py-2 pl-7">
                    No hay documentos en esta categoría
                  </p>
                ) : (
                  documentos
                    .filter(doc => doc.categoria === 'Vuelos')
                    .map(doc => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc)}
                              className="text-sm font-normal text-gray-600 hover:text-gray-800 truncate block text-left"
                            >
                              {doc.nombre}
                            </button>
                            <span className="text-[0.7rem] italic text-gray-500 block mt-0.5">
                              {doc.createdAt || doc.fechaCarga ? formatDate(doc.createdAt || doc.fechaCarga) : 'Fecha no disponible'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex-shrink-0 text-primary hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Hoteles */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h4 className="text-md font-semibold text-gray-900">Hoteles</h4>
              </div>
              <div className="space-y-2">
                {documentos.filter(doc => doc.categoria === 'Hoteles').length === 0 ? (
                  <p className="text-gray-500 text-sm py-2 pl-7">
                    No hay documentos en esta categoría
                  </p>
                ) : (
                  documentos
                    .filter(doc => doc.categoria === 'Hoteles')
                    .map(doc => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc)}
                              className="text-sm font-normal text-gray-600 hover:text-gray-800 truncate block text-left"
                            >
                              {doc.nombre}
                            </button>
                            <span className="text-[0.7rem] italic text-gray-500 block mt-0.5">
                              {doc.createdAt || doc.fechaCarga ? formatDate(doc.createdAt || doc.fechaCarga) : 'Fecha no disponible'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex-shrink-0 text-primary hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc)}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-primary" />
            Conversación
          </h3>
          
          {/* Mensajes */}
          <div
            ref={messagesContainerRef}
            className="bg-gray-50 rounded-lg p-4 mb-3 max-h-96 overflow-y-auto space-y-3 smooth-scroll"
          >
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
                      className={`max-w-[70%] rounded-lg p-3 animate-fade-in-up ${
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
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isUserView ? 'Debes ser administrador para poder enviar mensajes' : 'Escribe un mensaje...'}
              className="flex-1 px-4 py-2 text-xs sm:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                isSendBouncing ? 'animate-bounce-once' : ''
              }`}
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
