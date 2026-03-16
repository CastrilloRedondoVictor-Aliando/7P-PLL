import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserPortal from '../pages/UserPortal';

const mockUseAuth = vi.fn();
const mockApiRequest = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../config/api', () => ({
  apiRequest: (...args) => mockApiRequest(...args)
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
});
