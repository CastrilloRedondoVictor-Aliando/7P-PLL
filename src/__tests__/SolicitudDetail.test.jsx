import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SolicitudDetail from '../components/SolicitudDetail';

const mockUseAuth = vi.fn();
const mockApiRequest = vi.fn();
const mockSwalFire = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../config/api', () => ({
  apiRequest: (...args) => mockApiRequest(...args)
}));

vi.mock('sweetalert2', () => ({
  default: { fire: (...args) => mockSwalFire(...args) }
}));

const baseSolicitud = {
  id: 1,
  estado: 'Pendiente',
  destino: 'Espana',
  fechaInicio: '2026-03-04',
  fechaFin: '2026-03-10',
  comentarios: 'Detalle',
  empresa: 'Empresa X'
};

describe('SolicitudDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwalFire.mockResolvedValue({ isConfirmed: true, isDenied: false });
    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentDownloadUrl: vi.fn().mockResolvedValue('https://example.com/doc'),
      deleteDocument: vi.fn()
    });
    mockApiRequest.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders solicitud detail basics', () => {
    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText(/Principales funciones realizadas/)).toBeInTheDocument();
    expect(screen.getByText(/Destino/)).toBeInTheDocument();
    expect(screen.getByText(/Detalle/)).toBeInTheDocument();
  });

  it('edits and saves descripcion', async () => {
    const user = userEvent.setup();
    const onUpdateDescripcion = vi.fn();

    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, comentarios: 'Anterior' }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={onUpdateDescripcion}
        currentUserId="user-1"
        isUserView={true}
      />
    );

    await user.click(screen.getByTitle(/Editar descripción/i));
    const textarea = screen.getByDisplayValue('Anterior');
    await user.clear(textarea);
    await user.type(textarea, 'Nueva descripcion');
    await user.click(screen.getByRole('button', { name: /Guardar/i }));

    expect(onUpdateDescripcion).toHaveBeenCalledWith(1, 'Nueva descripcion');
  });

  it('uploads documents and clears pending list', async () => {
    const user = userEvent.setup();
    const onUploadDocument = vi.fn();

    const { container } = render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={onUploadDocument}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    const input = container.querySelector('input[type="file"]');
    const file = new File(['data'], 'doc.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: /Subir 1 documento/i }));
    expect(onUploadDocument).toHaveBeenCalledWith(file, 'General');
  });

  it('blocks new documents and messages when solicitud is closed', async () => {
    const user = userEvent.setup();
    const onUploadDocument = vi.fn();
    const onSendMessage = vi.fn();

    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, estado: 'Aceptada' }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={onUploadDocument}
        onSendMessage={onSendMessage}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText(/no admite nuevos documentos ni mensajes/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/La solicitud está cerrada y no admite nuevos mensajes/i);
    expect(input).toBeDisabled();

    await user.type(input, 'Hola');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(onUploadDocument).not.toHaveBeenCalled();
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('downloads and deletes documents', async () => {
    const user = userEvent.setup();
    const deleteDocument = vi.fn();
    const getDocumentPreviewUrl = vi.fn().mockResolvedValue('https://example.com/preview');
    const getDocumentDownloadUrl = vi.fn().mockResolvedValue('https://example.com/doc');
    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentPreviewUrl,
      getDocumentDownloadUrl,
      deleteDocument
    });
    mockApiRequest.mockResolvedValue({});

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[{ id: 'doc-1', solicitudID: 1, categoria: 'General', nombre: 'doc.txt' }]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    await user.click(screen.getAllByTitle(/Descargar/i)[0]);
    expect(getDocumentPreviewUrl).toHaveBeenCalledWith('doc-1');
    expect(getDocumentDownloadUrl).toHaveBeenCalledWith('doc-1');
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('Previsualizar')
    }));
    expect(window.open).toHaveBeenCalled();

    await user.click(screen.getAllByTitle(/Eliminar/i)[0]);
    expect(deleteDocument).toHaveBeenCalledWith('doc-1');
  });

  it('sends messages from input', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={onSendMessage}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    const input = screen.getAllByPlaceholderText(/Escribe un mensaje/)[0];
    await user.type(input, 'Hola');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Hola');
    });
  });

  it('renders close button and calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
        showCloseButton={true}
        onClose={onClose}
      />
    );

    await user.click(screen.getByLabelText(/Cerrar detalle/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not update descripcion when unchanged', async () => {
    const user = userEvent.setup();
    const onUpdateDescripcion = vi.fn();

    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, comentarios: 'Igual' }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={onUpdateDescripcion}
        currentUserId="user-1"
        isUserView={true}
      />
    );

    await user.click(screen.getByTitle(/Editar descripción/i));
    await user.click(screen.getByRole('button', { name: /Guardar/i }));
    expect(onUpdateDescripcion).not.toHaveBeenCalled();
  });

  it('shows user name from mensaje when available', () => {
    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, usuarioNombre: '' }}
        documentos={[]}
        mensajes={[{ id: 'm1', usuarioID: 'u2', usuarioNombre: 'Usuario Mensaje', contenido: 'Hola', fechaEnvio: '2026-03-04' }]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="u1"
      />
    );

    expect(screen.getByText('Usuario Mensaje')).toBeInTheDocument();
  });

  it('shows Pérez-Llorca for admin messages', () => {
    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, usuarioNombre: '' }}
        documentos={[]}
        mensajes={[{ id: 'm1', usuarioID: 'admin-1', usuarioNombre: 'Administrador', rol: 'admin', contenido: 'Hola', fechaEnvio: '2026-03-04' }]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="u1"
      />
    );

    expect(screen.getByText('Pérez-Llorca')).toBeInTheDocument();
  });

  it('handles download error with alert', async () => {
    const user = userEvent.setup();
    const getDocumentPreviewUrl = vi.fn().mockRejectedValue(new Error('fail'));
    const getDocumentDownloadUrl = vi.fn().mockResolvedValue('https://example.com/doc');
    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentPreviewUrl,
      getDocumentDownloadUrl,
      deleteDocument: vi.fn()
    });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[{ id: 'doc-1', solicitudID: 1, categoria: 'General', nombre: 'doc.txt' }]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    await user.click(screen.getAllByTitle(/Descargar/i)[0]);
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error'
    }));
  });

  it('does not delete document when cancel is chosen', async () => {
    const user = userEvent.setup();
    const deleteDocument = vi.fn();
    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentPreviewUrl: vi.fn().mockResolvedValue('https://example.com/preview'),
      getDocumentDownloadUrl: vi.fn().mockResolvedValue('https://example.com/doc'),
      deleteDocument
    });
    mockSwalFire.mockResolvedValueOnce({ isConfirmed: false });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[{ id: 'doc-1', solicitudID: 1, categoria: 'General', nombre: 'doc.txt' }]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    await user.click(screen.getAllByTitle(/Eliminar/i)[0]);
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it('hides porcentaje in user view when estado is not Aceptada', () => {
    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, estado: 'Pendiente', porcentaje: 60 }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
        isUserView={true}
      />
    );

    expect(screen.queryByText(/Porcentaje:/i)).not.toBeInTheDocument();
  });

  it('shows porcentaje in user view when estado is Aceptada', () => {
    render(
      <SolicitudDetail
        solicitud={{ ...baseSolicitud, estado: 'Aceptada', porcentaje: 60 }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
        isUserView={true}
      />
    );

    expect(screen.getByText(/Porcentaje: 60%/i)).toBeInTheDocument();
  });
});
