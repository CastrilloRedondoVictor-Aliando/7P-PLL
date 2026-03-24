import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
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
    window.matchMedia.mockImplementation((query) => ({
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
    cleanup();
  });

  it('renders and filters user solicitudes', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    expect(screen.getByText(/Mis Solicitudes/i)).toBeInTheDocument();
    expect(screen.getByText('Proyecto Uno')).toBeInTheDocument();
    expect(screen.queryByText('Proyecto Ajeno')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Buscar solicitudes/i), 'no-match');
    expect(screen.getByText(/No hay solicitudes/i)).toBeInTheDocument();
  });

  it('opens notifications and selects solicitud', async () => {
    const user = userEvent.setup();
    render(<UserPortal />);

    await user.click(screen.getAllByTitle(/Mensajes sin leer/i)[0]);
    expect(screen.getByText(/Mensajes sin leer/i)).toBeInTheDocument();

    const projectItems = screen.getAllByText('Proyecto Uno');
    await user.click(projectItems[projectItems.length - 1]);
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
    window.matchMedia.mockImplementation((query) => ({
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

    render(<UserPortal />);
    mockApiRequest.mockClear();

    await user.click(screen.getAllByTitle(/Guia de uso/i)[0]);

    expect(mockApiRequest).not.toHaveBeenCalledWith('/documentos/guia-uso/preview', expect.anything());
    expect(mockSwalFire).toHaveBeenNthCalledWith(1, expect.objectContaining({
      title: 'Informacion',
      denyButtonText: 'Política'
    }));
    expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: 'Política',
      html: expect.stringContaining('Pol%C3%ADtica%207P%20TR.pdf')
    }));
  });

  it('loads guia de uso when selected in document selector', async () => {
    const user = userEvent.setup();
    mockSwalFire
      .mockResolvedValueOnce({ isConfirmed: true, value: 'guia' })
      .mockResolvedValueOnce({ isConfirmed: false, isDenied: false });

    render(<UserPortal />);
    mockApiRequest.mockClear();

    await user.click(screen.getAllByTitle(/Guia de uso/i)[0]);

    expect(mockApiRequest).not.toHaveBeenCalledWith('/documentos/guia-uso/preview', expect.anything());
    expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: 'Guia de uso',
      html: expect.stringContaining('view.officeapps.live.com')
    }));
    expect(mockSwalFire).toHaveBeenNthCalledWith(2, expect.objectContaining({
      html: expect.stringContaining('guia_uso_7P_PLL.docx')
    }));
  });
});
