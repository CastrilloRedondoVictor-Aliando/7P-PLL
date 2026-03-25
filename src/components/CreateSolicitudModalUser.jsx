import React from 'react';
import SolicitudModalBase from './SolicitudModalBase';

const CreateSolicitudModalUser = ({ isOpen, onClose, onCreate }) => (
  <SolicitudModalBase
    isOpen={isOpen}
    onClose={onClose}
    onCreate={onCreate}
    mode="user"
    headerSubtitle="Solicita servicios legales a Perez-Llorca"
    submitLabel="Enviar Solicitud"
    projectLabel="Informacion del Proyecto"
    projectPlaceholder="Ej: Asesoria legal para expansion internacional"
    projectHelper="Titulo o nombre del proyecto para el que necesitas asesoria"
    commentsLabel="Principales funciones realizadas *"
    commentsPlaceholder="Describe los detalles de la solicitud..."
    requireComments
  />
);

export default CreateSolicitudModalUser;
