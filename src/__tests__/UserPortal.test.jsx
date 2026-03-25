import React, { act } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserPortal from '../pages/UserPortal';

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

vi.mock('../components/SolicitudDetail', () => ({
  default: ({ onUploadDocument, onSendMessage, onUpdateDescripcion, showCloseButton, onClose }) => (
    <div>
      <button type="button" onClick={() => onUploadDocument?.(new File(['x'], 'doc.txt'), 'General')}>
        Upload Doc
      </button>
      <button type="button" onClick={() => onSendMessage?.('Hola')}>
        Send Msg
      </button>
      <button type="button" onClick={() => onUpdateDescripcion?.(1, 'Nueva descripcion')}>
        Update Desc
      </button>
      {showCloseButton && (
        <button type="button" onClick={onClose}>
          Close Detail
        </button>
      )}
      <div>Detalle Solicitud</div>
    </div>
  )
}));

vi.mock('../components/SolicitudCard', () => ({
  default: ({ solicitud, onClick }) => (
    <button type="button" onClick={onClick}>{solicitud.proyecto}</button>
  )
}));

const baseAuthState = {
  user: { id: 'u1', name: 'Usuario Uno', email: 'u1@empresa.com' },
  solicitudes: [
    {
      id: 1,
      usuarioID: 'u1',
      proyecto: 'Proyecto Uno',
      comentarios: 'Detalle',
      estado: 'Pendiente',
      fechaCreacion: '2026-03-04'
    },
    {
      id: 2,
      usuarioID: 'u2',
      proyecto: 'Proyecto Ajeno',
      comentarios: 'Otro',
      estado: 'Aceptada',
      fechaCreacion: '2026-03-05'
    }
  ],
  documentos: [],
  mensajes: [
    { id: 'm1', solicitudID: 1, usuarioID: 'admin-1', contenido: 'Aviso', rol: 'admin', leidoPorUser: false }
  ],
  logout: vi.fn(),
  uploadDocument: vi.fn(),
  sendMessage: vi.fn(),
  createSolicitud: vi.fn(),
  markMessagesAsRead: vi.fn(),
  updateSolicitudDescripcion: vi.fn(),
  signalRConnection: null,
  getAccessToken: vi.fn().mockResolvedValue('token')
};

describe('UserPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(baseAuthState);
    mockSwalFire.mockResolvedValue({ isConfirmed: false, isDenied: false });
    vi.spyOn(globalThis.window, 'open').mockImplementation(() => null);
    globalThis.window.matchMedia.mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('renders and filters user solicitudes', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    expect(screen.getByText(/Mis Solicitudes/i)).toBeInTheDocument();
    expect(screen.getByText('Proyecto Uno')).toBeInTheDocument();
    expect(screen.queryByText('Proyecto Ajeno')).not.toBeInTheDocument();
    expect(mockApiRequest).not.toHaveBeenCalledWith('/signalr/join-group', expect.anything());

    await user.type(screen.getByPlaceholderText(/Buscar solicitudes/i), 'no-match');
    expect(screen.getByText(/No hay solicitudes/i)).toBeInTheDocument();
  });

  it('joins signalr group only when opening a detail', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    await user.click(screen.getAllByText('Proyecto Uno')[0]);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/signalr/join-group', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ solicitudID: 1 }),
        token: 'token'
      }));
    });
  });

  it('keeps compact header actions available on intermediate widths', async () => {
    const user = userEvent.setup();
    globalThis.window.matchMedia.mockImplementation((query) => ({
      matches: query.includes('1279px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    render(<UserPortal />);

    expect(screen.getByTitle('Mensajes sin leer')).toBeInTheDocument();
    expect(screen.getByTitle('Guia de uso')).toBeInTheDocument();
    expect(screen.getByTitle('Incidencias')).toBeInTheDocument();

    await user.click(screen.getByTitle('Mensajes sin leer'));
    expect(screen.getByText(/Mensajes sin leer/i)).toBeInTheDocument();
  });

  it('orders user solicitudes by most recent uploaded document', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      solicitudes: [
        {
          id: 1,
          usuarioID: 'u1',
          proyecto: 'Proyecto Antiguo',
          comentarios: 'Detalle',
          estado: 'Pendiente',
          fechaCreacion: '2026-03-04'
        },
        {
          id: 2,
          usuarioID: 'u1',
          proyecto: 'Proyecto Con Documento Nuevo',
          comentarios: 'Otro',
          estado: 'Pendiente',
          fechaCreacion: '2026-03-01'
        }
      ],
      documentos: [
        { id: 'd1', solicitudID: 2, fechaCarga: '2026-03-10T10:00:00.000Z' }
      ]
    });

    render(<UserPortal />);

    const projectButtons = screen.getAllByRole('button', { name: /Proyecto /i });
    expect(projectButtons[0]).toHaveTextContent('Proyecto Con Documento Nuevo');
  });

  it('keeps ordering by latest uploaded document when filtering by estado', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      solicitudes: [
        {
          id: 1,
          usuarioID: 'u1',
          proyecto: 'Pendiente Antiguo',
          comentarios: 'Detalle',
          estado: 'Pendiente',
          fechaCreacion: '2026-03-04T10:00:00.000Z'
        },
        {
          id: 2,
          usuarioID: 'u1',
          proyecto: 'Pendiente Reciente',
          comentarios: 'Otro',
          estado: 'Pendiente',
          fechaCreacion: '2026-03-01T10:00:00.000Z'
        }
      ],
      documentos: [
        { id: 'd1', solicitudID: 2, fechaCarga: '2026-03-10T10:00:00.000Z' }
      ]
    });

    render(<UserPortal />);

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'Pendiente');

    const projectButtons = screen.getAllByRole('button', { name: /Pendiente /i });
    expect(projectButtons[0]).toHaveTextContent('Pendiente Reciente');
  });

  it('opens notifications and selects solicitud', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    await user.click(screen.getAllByTitle(/Mensajes sin leer/i)[0]);
    expect(screen.getByText(/Mensajes sin leer/i)).toBeInTheDocument();

    const projectItems = screen.getAllByText('Proyecto Uno');
    await user.click(projectItems.at(-1));
    expect(screen.getByText('Detalle Solicitud')).toBeInTheDocument();
  });

  it('handles detail callbacks for upload, send, and update', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    await user.click(screen.getAllByText('Proyecto Uno')[0]);
    await user.click(screen.getByText('Upload Doc'));
    await user.click(screen.getByText('Send Msg'));
    await user.click(screen.getByText('Update Desc'));

    expect(baseAuthState.uploadDocument).toHaveBeenCalled();
    expect(baseAuthState.sendMessage).toHaveBeenCalled();
    expect(baseAuthState.updateSolicitudDescripcion).toHaveBeenCalledWith(1, 'Nueva descripcion');
  });

  it('does not upload or send messages for closed solicitudes', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      solicitudes: [
        {
          id: 1,
          usuarioID: 'u1',
          proyecto: 'Proyecto Cerrado',
          comentarios: 'Detalle',
          estado: 'Aceptada',
          fechaCreacion: '2026-03-04'
        }
      ]
    });

    render(<UserPortal />);

    await user.click(screen.getByText('Proyecto Cerrado'));
    await user.click(screen.getByText('Upload Doc'));
    await user.click(screen.getByText('Send Msg'));

    expect(baseAuthState.uploadDocument).not.toHaveBeenCalled();
    expect(baseAuthState.sendMessage).not.toHaveBeenCalled();
  });

  it('opens and closes mobile detail popup', async () => {
    vi.useFakeTimers();
    globalThis.window.matchMedia.mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    render(<UserPortal />);

    fireEvent.click(screen.getAllByText('Proyecto Uno')[0]);
    expect(screen.getByText('Close Detail')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Detail'));
    await act(async () => {
      vi.runAllTimers();
    });

    expect(screen.queryByText('Close Detail')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows document selector and opens politicas pdf', async () => {
    const user = userEvent.setup();
    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: false, isDenied: true })
      .mockResolvedValueOnce({ isConfirmed: false, isDenied: false });
    mockApiRequest.mockImplementation((url) => {
      if (url === '/documentos/politica/preview') {
        return Promise.resolve({ url: 'https://example.com/politica-preview.pdf' });
      }
      if (url === '/documentos/politica/download') {
        return Promise.resolve({ url: 'https://example.com/politica-download.pdf' });
      }
      return Promise.resolve({ success: true });
    });

    render(<UserPortal />);
    mockApiRequest.mockClear();

    await user.click(screen.getAllByTitle(/Guia de uso/i).at(-1));

    await waitFor(() => {
      expect(mockSwalFire).toHaveBeenNthCalledWith(1, expect.objectContaining({
        title: 'Informacion',
        confirmButtonText: 'Guia de uso',
        denyButtonText: 'Politica',
        cancelButtonText: 'Cancelar'
      }));
      expect(mockApiRequest).toHaveBeenCalledWith('/documentos/politica/preview', expect.objectContaining({ token: 'token' }));
      expect(mockApiRequest).toHaveBeenCalledWith('/documentos/politica/download', expect.objectContaining({ token: 'token' }));
      expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
        title: 'Politica',
        html: expect.stringContaining('https://example.com/politica-preview.pdf')
      }));
    });
  });

  it('loads guia de uso when selected in document selector', async () => {
    const user = userEvent.setup();
    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: true, isDenied: false })
      .mockResolvedValueOnce({ isConfirmed: false, isDenied: false });
    mockApiRequest.mockImplementation((url) => {
      if (url === '/documentos/guia-uso/preview') {
        return Promise.resolve({ url: 'https://example.com/guia-preview.docx' });
      }
      if (url === '/documentos/guia-uso/download') {
        return Promise.resolve({ url: 'https://example.com/guia-download.docx' });
      }
      return Promise.resolve({ success: true });
    });

    render(<UserPortal />);
    mockApiRequest.mockClear();

    await user.click(screen.getAllByTitle(/Guia de uso/i).at(-1));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/documentos/guia-uso/preview', expect.objectContaining({ token: 'token' }));
      expect(mockApiRequest).toHaveBeenCalledWith('/documentos/guia-uso/download', expect.objectContaining({ token: 'token' }));
      expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
        title: 'Guia de uso',
        html: expect.stringContaining('view.officeapps.live.com')
      }));
      expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
        html: expect.stringContaining(encodeURIComponent('https://example.com/guia-preview.docx'))
      }));
    });
  });

  it('downloads guia de uso directly instead of opening a new tab', async () => {
    const user = userEvent.setup();
    const originalFetch = globalThis.fetch;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: true, isDenied: false })
      .mockResolvedValueOnce({ isConfirmed: true, isDenied: false });
    mockApiRequest.mockImplementation((url) => {
      if (url === '/documentos/guia-uso/preview') {
        return Promise.resolve({ url: 'https://example.com/guia-preview.docx' });
      }
      if (url === '/documentos/guia-uso/download') {
        return Promise.resolve({ url: 'https://example.com/guia-download.docx' });
      }
      return Promise.resolve({ success: true });
    });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['doc']))
    });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:guia-download');
    URL.revokeObjectURL = vi.fn();

    render(<UserPortal />);
    mockApiRequest.mockClear();
    window.open.mockClear();

    await user.click(screen.getAllByTitle(/Guia de uso/i).at(-1));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/guia-download.docx');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalledWith('https://example.com/guia-download.docx', '_blank', 'noopener');
    });

    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
