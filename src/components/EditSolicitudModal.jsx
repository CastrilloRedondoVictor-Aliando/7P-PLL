import React from 'react';
import SolicitudModalBase from './SolicitudModalBase';

const EditSolicitudModal = ({ isOpen, onClose, onSubmit, initialData }) => (
  <SolicitudModalBase
    isOpen={isOpen}
    onClose={onClose}
    onSubmit={onSubmit}
    mode="admin"
    title="Editar Solicitud"
    headerSubtitle="Actualiza toda la informacion de la solicitud"
    submitLabel="Guardar cambios"
    projectLabel="Nombre del Proyecto *"
    projectPlaceholder="Ej: Proyecto Omega"
    hideRecipientSelector
    initialData={initialData}
    showEstadoField
    showPercentageField
  />
);

export default EditSolicitudModal;
