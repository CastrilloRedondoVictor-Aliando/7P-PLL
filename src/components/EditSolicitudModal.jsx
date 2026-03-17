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
    commentsLabel="Principales funciones realizadas"
    commentsPlaceholder="Describe los detalles de la solicitud..."
    hideRecipientSelector
    initialData={initialData}
    showPercentageField={initialData?.estado === 'Aceptada'}
  />
);

export default EditSolicitudModal;
