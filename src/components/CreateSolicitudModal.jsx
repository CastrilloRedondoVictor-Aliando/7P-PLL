import React from 'react';
import SolicitudModalBase from './SolicitudModalBase';

const CreateSolicitudModal = ({ isOpen, onClose, onCreate, availableUsers = [], loadingUsers = false }) => (
  <SolicitudModalBase
    isOpen={isOpen}
    onClose={onClose}
    onCreate={onCreate}
    availableUsers={availableUsers}
    loadingUsers={loadingUsers}
    mode="admin"
    headerSubtitle="Crear solicitud para varios usuarios"
    submitLabel="Crear Solicitud"
    projectLabel="Nombre del Proyecto *"
    projectPlaceholder="Ej: Proyecto Omega"
  />
);

export default CreateSolicitudModal;
