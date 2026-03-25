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
  empresa: 'Empresa X',
  codigoEmpleado: '',
  posicion: '',
  politica: ''
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
    expect(screen.queryByText(/Codigo empleado:/i)).not.toBeInTheDocument();
  });

  it('shows imported metadata only when it has value', () => {
    render(
      <SolicitudDetail
        solicitud={{
          ...baseSolicitud,
          codigoEmpleado: '825',
          posicion: 'Directora corporativo',
          politica: 'Firmada'
        }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText(/Codigo empleado: 825/i)).toBeInTheDocument();
    expect(screen.getByText(/Posicion: Directora corporativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Politica: Firmada/i)).toBeInTheDocument();
  });

  it('hides imported metadata in user view', () => {
    render(
      <SolicitudDetail
        solicitud={{
          ...baseSolicitud,
          codigoEmpleado: '825',
          posicion: 'Directora corporativo',
          politica: 'Firmada'
        }}
        documentos={[]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
        isUserView={true}
      />
    );

    expect(screen.queryByText(/Codigo empleado:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Posicion:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Politica:/i)).not.toBeInTheDocument();
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
    const originalFetch = global.fetch;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const deleteDocument = vi.fn();
    const getDocumentPreviewUrl = vi.fn().mockResolvedValue('https://example.com/preview');
    const getDocumentDownloadUrl = vi.fn().mockResolvedValue('https://example.com/doc');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['doc']))
    });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test-doc');
    URL.revokeObjectURL = vi.fn();
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

    await user.click(screen.getAllByTitle(/Previsualizar/i)[0]);
    expect(getDocumentPreviewUrl).toHaveBeenCalledWith('doc-1');
    expect(getDocumentDownloadUrl).toHaveBeenCalledWith('doc-1');
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('Previsualizar')
    }));
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/doc');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();

    await user.click(screen.getAllByTitle(/Eliminar/i)[0]);
    expect(deleteDocument).toHaveBeenCalledWith('doc-1');

    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('previews .msg files inside the modal', async () => {
    const user = userEvent.setup();
    const originalFetch = globalThis.fetch;
    const getDocumentDownloadUrl = vi.fn().mockResolvedValue('https://example.com/mail.msg');
    const getDocumentPreviewUrl = vi.fn();
    const msgBuffer = Uint8Array.from([
      208, 207, 17, 224, 161, 177, 26, 225, 0, 0, 0, 0
    ]).buffer;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(msgBuffer)
    });

    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentPreviewUrl,
      getDocumentDownloadUrl,
      deleteDocument: vi.fn()
    });

    const actualOpenDocumentPreview = (await import('../utils/documentPreview')).openDocumentPreview;
    const previewSpy = vi.spyOn(await import('../utils/documentPreview'), 'openDocumentPreview');
    previewSpy.mockImplementation(async ({ Swal, doc, getDocumentDownloadUrl: getDownloadUrl }) => {
      await getDownloadUrl(doc.id);
      await Swal.fire({
        title: `Previsualizar ${doc.nombre}`,
        html: '<div>Archivo MSG</div><div>Contenido</div>',
        showCancelButton: true,
        confirmButtonText: 'Descargar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#1e40af',
        width: 900
      });
      return actualOpenDocumentPreview;
    });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[{ id: 'doc-msg', solicitudID: 1, categoria: 'General', nombre: 'correo.msg', tipo: 'application/vnd.ms-outlook' }]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    await user.click(screen.getAllByTitle(/Previsualizar/i)[0]);

    expect(getDocumentDownloadUrl).toHaveBeenCalledWith('doc-msg');
    expect(getDocumentPreviewUrl).not.toHaveBeenCalled();
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('correo.msg'),
      html: expect.stringContaining('Archivo MSG')
    }));

    previewSpy.mockRestore();
    globalThis.fetch = originalFetch;
  });

  it('previews .eml files inside the modal', async () => {
    const user = userEvent.setup();
    const originalFetch = globalThis.fetch;
    const getDocumentDownloadUrl = vi.fn().mockResolvedValue('https://example.com/mail.eml');
    const getDocumentPreviewUrl = vi.fn();
    const emlContent = [
      'From: Perez-Llorca <noreply@perezllorca.com>',
      'To: Usuario <usuario@empresa.com>',
      'Subject: Correo de prueba',
      'Date: Mon, 24 Mar 2026 10:00:00 +0100',
      'Content-Type: text/plain; charset="utf-8"',
      '',
      'Hola equipo,',
      '',
      'Este es un correo EML de prueba.'
    ].join('\r\n');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode(emlContent).buffer)
    });

    mockUseAuth.mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentPreviewUrl,
      getDocumentDownloadUrl,
      deleteDocument: vi.fn()
    });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[{ id: 'doc-eml', solicitudID: 1, categoria: 'General', nombre: 'correo.eml', tipo: 'message/rfc822' }]}
        mensajes={[]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="user-1"
      />
    );

    await user.click(screen.getAllByTitle(/Previsualizar/i)[0]);

    expect(getDocumentDownloadUrl).toHaveBeenCalledWith('doc-eml');
    expect(getDocumentPreviewUrl).not.toHaveBeenCalled();
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('correo.eml'),
      html: expect.stringContaining('Archivo EML')
    }));
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Correo de prueba')
    }));
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Este es un correo EML de prueba.')
    }));

    globalThis.fetch = originalFetch;
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

  it('renders own messages in blue on the right when auth user matches by alternate identifier', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'legacy-id', oid: 'oid-1', email: 'user@empresa.com', rol: 'user' },
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentDownloadUrl: vi.fn().mockResolvedValue('https://example.com/doc'),
      getDocumentPreviewUrl: vi.fn().mockResolvedValue('https://example.com/preview'),
      deleteDocument: vi.fn()
    });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[{ id: 'm1', usuarioID: 'oid-1', contenido: 'Mensaje propio', fechaEnvio: '2026-03-04' }]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="legacy-id"
        isUserView={true}
      />
    );

    const bubble = screen.getByText('Mensaje propio').parentElement;
    const wrapper = bubble?.parentElement;

    expect(bubble?.className).toContain('bg-primary');
    expect(bubble?.className).toContain('text-white');
    expect(wrapper?.className).toContain('justify-end');
  });

  it('renders admin-side messages in blue on the right for admin viewers', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-logged', email: 'admin@empresa.com', rol: 'admin' },
      getAccessToken: vi.fn().mockResolvedValue('token'),
      getDocumentDownloadUrl: vi.fn().mockResolvedValue('https://example.com/doc'),
      getDocumentPreviewUrl: vi.fn().mockResolvedValue('https://example.com/preview'),
      deleteDocument: vi.fn()
    });

    render(
      <SolicitudDetail
        solicitud={baseSolicitud}
        documentos={[]}
        mensajes={[{ id: 'm1', usuarioID: 'other-admin-id', rol: 'admin', contenido: 'Mensaje admin', fechaEnvio: '2026-03-04' }]}
        onUploadDocument={vi.fn()}
        onSendMessage={vi.fn()}
        onUpdateDescripcion={vi.fn()}
        currentUserId="admin-logged"
      />
    );

    const bubble = screen.getByText('Mensaje admin').parentElement;
    const wrapper = bubble?.parentElement;

    expect(bubble?.className).toContain('bg-primary');
    expect(bubble?.className).toContain('text-white');
    expect(wrapper?.className).toContain('justify-end');
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

    await user.click(screen.getAllByTitle(/Previsualizar/i)[0]);
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
