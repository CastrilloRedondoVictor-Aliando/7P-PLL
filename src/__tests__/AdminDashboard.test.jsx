import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDashboard from '../pages/AdminDashboard';
import * as XLSX from 'xlsx-js-style';
import { formatDate } from '../utils/helpers';

const mockUseAuth = vi.fn();
const mockApiRequest = vi.fn();
const mockSwalFire = vi.fn();
let mockCreatePayload = {
  emails: [],
  proyecto: '',
  comentarios: '',
  extraFields: {}
};
let mockEditPayload = {
  proyecto: 'Proyecto Editado',
  comentarios: 'Comentario editado',
  estado: 'Rechazada',
  trayecto: 'Madrid - Estambul / Estambul - Madrid',
  destino: 'Estambul',
  fechaInicio: '2026-03-04',
  fechaFin: '2026-03-10',
  empresa: 'Perez-Llorca',
  horasCodigo: 'HC-100',
  porcentaje: 80
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../config/api', () => ({
  apiRequest: (...args) => mockApiRequest(...args)
}));

vi.mock('sweetalert2', () => ({
  default: { fire: (...args) => mockSwalFire(...args) }
}));

vi.mock('../components/CreateSolicitudModal', () => ({
  default: ({ onCreate }) => (
    <button
      type="button"
      onClick={() => onCreate(
        mockCreatePayload.emails,
        mockCreatePayload.proyecto,
        mockCreatePayload.comentarios,
        mockCreatePayload.extraFields
      )}
    >
      Mock Create
    </button>
  )
}));

vi.mock('../components/EditSolicitudModal', () => ({
  default: ({ isOpen, onSubmit }) => (
    isOpen ? (
      <button
        type="button"
        onClick={() => onSubmit(mockEditPayload)}
      >
        Mock Save Edit
      </button>
    ) : null
  )
}));

vi.mock('xlsx-js-style', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!ref': 'A1:A1', A1: { v: 'Header' } })),
    decode_range: vi.fn(() => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } })),
    encode_cell: vi.fn(({ r, c }) => `${String.fromCodePoint(65 + c)}${r + 1}`),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    sheet_to_json: vi.fn(() => [])
  },
  SSF: {
    parse_date_code: vi.fn(() => ({ y: 2026, m: 3, d: 4 }))
  },
  read: vi.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  writeFile: vi.fn()
}));

const baseSolicitudes = [
  {
    id: 1,
    usuarioID: 'u1',
    usuarioNombre: 'Usuario Uno',
    usuarioEmail: 'u1@empresa.com',
    proyecto: 'Proyecto Pendiente',
    comentarios: 'Comentario pendiente',
    estado: 'Pendiente',
    fechaCreacion: '2026-03-04'
  },
  {
    id: 2,
    usuarioID: 'u2',
    usuarioNombre: 'Usuario Dos',
    usuarioEmail: 'u2@empresa.com',
    proyecto: 'Proyecto Aceptado',
    comentarios: 'Comentario aceptado',
    estado: 'Aceptada',
    fechaCreacion: '2026-03-05'
  }
];

const baseAuthState = {
  user: { id: 'admin-1', rol: 'admin', name: 'Admin', email: 'admin@empresa.com' },
  solicitudes: baseSolicitudes,
  documentos: [
    { id: 'd1', solicitudID: 2, categoria: 'General', nombre: 'doc1.pdf', vistoPorAdmin: false, fechaCarga: '2026-03-06T10:00:00.000Z' }
  ],
  mensajes: [
    { id: 'm1', solicitudID: 2, usuarioID: 'u2', contenido: 'Hola', rol: 'user', leidoPorAdmin: false, fechaEnvio: '2026-03-04' }
  ],
  loading: false,
  logout: vi.fn(),
  updateSolicitudEstado: vi.fn(),
  updateSolicitudTitulo: vi.fn(),
  updateSolicitudCompleta: vi.fn().mockResolvedValue({
    id: 2,
    proyecto: 'Proyecto Editado',
    comentarios: 'Comentario editado'
  }),
  sendMessage: vi.fn(),
  createSolicitud: vi.fn().mockResolvedValue({ id: 10, usuarioNombre: 'Nuevo', usuarioEmail: 'nuevo@empresa.com' }),
  markMessagesAsRead: vi.fn(),
  markDocsAsViewed: vi.fn(),
  resolveUsersByEmails: vi.fn().mockResolvedValue([
    { oid: 'oid-1', nombre: 'Usuario Import', email: 'import@empresa.com' }
  ]),
  getDocumentPreviewUrl: vi.fn().mockResolvedValue('https://example.com/preview'),
  getDocumentDownloadUrl: vi.fn().mockResolvedValue('https://example.com/doc'),
  deleteDocument: vi.fn(),
  deleteSolicitud: vi.fn().mockResolvedValue(true),
  getAccessToken: vi.fn().mockResolvedValue('token')
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(baseAuthState);
    mockCreatePayload = {
      emails: [],
      proyecto: '',
      comentarios: '',
      extraFields: {}
    };
    mockEditPayload = {
      proyecto: 'Proyecto Editado',
      comentarios: 'Comentario editado',
      estado: 'Rechazada',
      trayecto: 'Madrid - Estambul / Estambul - Madrid',
      destino: 'Estambul',
      fechaInicio: '2026-03-04',
      fechaFin: '2026-03-10',
      empresa: 'Perez-Llorca',
      horasCodigo: 'HC-100',
      porcentaje: 80
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders admin dashboard basics', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/Solicitudes Aceptadas/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar por empleado o destino/)).toBeInTheDocument();
    expect(screen.getAllByText('Proyecto Aceptado').length).toBeGreaterThan(0);
  });

  it('filters solicitudes by estado and sends messages', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const pendingCells = screen.getAllByText('Proyecto Pendiente');
    const pendingCell = pendingCells.find((cell) => cell.closest('tr'));
    const row = pendingCell?.closest('tr');
    expect(row).toBeTruthy();
    await user.click(row);

    const messageInput = screen.getByPlaceholderText(/Escribe un mensaje/);
    await user.type(messageInput, 'Mensaje admin');
    fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(baseAuthState.sendMessage).toHaveBeenCalled();
  });

  it('blocks messages from the detail when solicitud is accepted', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const acceptedCells = screen.getAllByText('Proyecto Aceptado');
    const acceptedCell = acceptedCells.find((cell) => cell.closest('tr'));
    const row = acceptedCell?.closest('tr');
    expect(row).toBeTruthy();

    await user.click(row);

    const messageInput = screen.getByPlaceholderText(/La solicitud está cerrada y no admite nuevos mensajes/i);
    expect(messageInput).toBeDisabled();
    expect(baseAuthState.sendMessage).not.toHaveBeenCalled();
  });

  it('changes estado to Aceptada with porcentaje', async () => {
    const user = userEvent.setup();
    mockSwalFire.mockResolvedValueOnce({ value: '50', isConfirmed: true });
    const { container } = render(<AdminDashboard />);

    const pendingCells = screen.getAllByText('Proyecto Pendiente');
    const pendingCell = pendingCells.find((cell) => cell.closest('tr'));
    const row = pendingCell?.closest('tr');
    expect(row).toBeTruthy();
    const trigger = row.querySelector('[data-estado-trigger="true"]');
    expect(trigger).toBeTruthy();
    await user.click(trigger);
    const menu = row.querySelector('[data-estado-menu="true"]') || container.querySelector('[data-estado-menu="true"]');
    expect(menu).toBeTruthy();
    await user.click(within(menu).getByRole('button', { name: 'Aceptada' }));

    expect(baseAuthState.updateSolicitudEstado).toHaveBeenCalledWith(1, 'Aceptada', 50);
  });

  it('changes estado from edit modal', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    const acceptedCells = screen.getAllByText('Proyecto Aceptado');
    const acceptedCell = acceptedCells.find((cell) => cell.closest('tr'));
    const row = acceptedCell?.closest('tr');
    expect(row).toBeTruthy();

    await user.click(row);
    const editButtons = screen.getAllByRole('button', { name: /Editar información/i });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Mock Save Edit' }));

    expect(baseAuthState.updateSolicitudCompleta).toHaveBeenCalledWith(2, expect.objectContaining({
      estado: 'Rechazada'
    }));
  });

  it('shows upload date for documents in the detail panel', async () => {
    render(<AdminDashboard />);

    const acceptedCells = screen.getAllByText('Proyecto Aceptado');
    const acceptedCell = acceptedCells.find((cell) => cell.closest('tr'));
    const row = acceptedCell?.closest('tr');
    expect(row).toBeTruthy();

    await userEvent.click(row);

    expect(await screen.findByText('doc1.pdf')).toBeInTheDocument();
    expect(screen.getByText(`Subido: ${formatDate('2026-03-06T10:00:00.000Z')}`)).toBeInTheDocument();
  });

  it('opens full edit flow and submits solicitud updates', async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminDashboard />);

    const acceptedCells = screen.getAllByText('Proyecto Aceptado');
    const acceptedCell = acceptedCells.find((cell) => cell.closest('tr'));
    const row = acceptedCell?.closest('tr');
    expect(row).toBeTruthy();

    await user.click(row);
    const editButtons = screen.getAllByRole('button', { name: /Editar información/i });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole('button', { name: 'Mock Save Edit' }));

    expect(baseAuthState.updateSolicitudCompleta).toHaveBeenCalledWith(2, expect.objectContaining({
      proyecto: 'Proyecto Editado',
      descripcion: 'Comentario editado',
      estado: 'Rechazada',
      trayecto: 'Madrid - Estambul / Estambul - Madrid',
      destino: 'Estambul',
      porcentaje: 80
    }));
    expect(container).toBeTruthy();
  });

  it('exports excel and handles empty export', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AdminDashboard />);

    await user.click(screen.getAllByRole('button', { name: /Exportar Excel/i })[0]);
    expect(XLSX.writeFile).toHaveBeenCalledTimes(1);

    unmount();
    mockUseAuth.mockReturnValue({ ...baseAuthState, solicitudes: [] });
    render(<AdminDashboard />);
    await user.click(screen.getAllByRole('button', { name: /Exportar Excel/i })[0]);
    expect(mockSwalFire).toHaveBeenCalled();
  });

  it('imports excel rows and updates estado', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        'Correo electrónico': 'import@empresa.com',
        'Unidad organizativa': '700 - TECHNICAL MANAGEMENT',
        'trayecto completo texto': 'Madrid - Estambul / Estambul - Madrid',
        'fecha salida': '4 de marzo de 2026',
        'fecha fin del viaje': '2026-03-10',
        Estado: 'Aceptada',
        Porcentaje: '75'
      }
    ]);

    const { container } = render(<AdminDashboard />);
    const input = container.querySelector('input[type="file"][accept=".xlsx,.xls"]');
    const file = new File(['excel'], 'import.xlsx', { type: 'application/vnd.ms-excel' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(baseAuthState.createSolicitud).toHaveBeenCalled();
      const [usuarioOID, proyecto, comentarios, extraFields] = baseAuthState.createSolicitud.mock.calls[0];
      expect(usuarioOID).toBe('oid-1');
      expect(proyecto).toBe('');
      expect(comentarios).toBe('');
      expect(extraFields).toMatchObject({
        trayecto: 'Madrid - Estambul / Estambul - Madrid',
        destino: 'Estambul',
        empresa: '700 - TECHNICAL MANAGEMENT',
        fechaInicio: '2026-03-04',
        fechaFin: '2026-03-10',
        porcentaje: 75
      });
      expect(baseAuthState.updateSolicitudEstado).toHaveBeenCalledWith(10, 'Aceptada', 75, { silent: true });
      expect(mockSwalFire).toHaveBeenCalled();
    });
  });

  it('imports excel rows without estado and keeps Pendiente by default', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        'Correo electrónico': 'import@empresa.com',
        'Unidad organizativa': '700 - TECHNICAL MANAGEMENT',
        'trayecto completo texto': 'Madrid - Estambul / Estambul - Madrid',
        'fecha salida': '4 de marzo de 2026',
        'fecha fin del viaje': '2026-03-10'
      }
    ]);

    const { container } = render(<AdminDashboard />);
    const input = container.querySelector('input[type="file"][accept=".xlsx,.xls"]');
    const file = new File(['excel'], 'import.xlsx', { type: 'application/vnd.ms-excel' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(baseAuthState.createSolicitud).toHaveBeenCalled();
      expect(baseAuthState.updateSolicitudEstado).not.toHaveBeenCalled();
    });
  });

  it('imports excel roundtrip that ends in different city and keeps intermediary destino', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        'Correo electrónico': 'import@empresa.com',
        'Unidad organizativa': '700 - TECHNICAL MANAGEMENT',
        'trayecto completo texto': 'Madrid - Paris / Paris - Milan',
        'fecha salida': '4 de marzo de 2026',
        'fecha fin del viaje': '2026-03-10'
      }
    ]);

    const { container } = render(<AdminDashboard />);
    const input = container.querySelector('input[type="file"][accept=".xlsx,.xls"]');
    const file = new File(['excel'], 'import.xlsx', { type: 'application/vnd.ms-excel' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(baseAuthState.createSolicitud).toHaveBeenCalled();
      const [, , , extraFields] = baseAuthState.createSolicitud.mock.calls[0];
      expect(extraFields).toMatchObject({
        trayecto: 'Madrid - Paris / Paris - Milan',
        destino: 'Paris'
      });
    });
  });

  it('uses email as usuarioOID when imported email is not found in Entra', async () => {
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        'Correo electrónico': 'noexiste@empresa.com',
        'Unidad organizativa': '700 - TECHNICAL MANAGEMENT',
        'trayecto completo texto': 'Madrid - Estambul / Estambul - Madrid',
        'fecha salida': '4 de marzo de 2026',
        'fecha fin del viaje': '2026-03-10'
      }
    ]);
    baseAuthState.resolveUsersByEmails.mockResolvedValueOnce([]);

    const { container } = render(<AdminDashboard />);
    const input = container.querySelector('input[type="file"][accept=".xlsx,.xls"]');
    const file = new File(['excel'], 'import.xlsx', { type: 'application/vnd.ms-excel' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(baseAuthState.createSolicitud).toHaveBeenCalledWith(
        'noexiste@empresa.com',
        '',
        '',
        expect.objectContaining({
          trayecto: 'Madrid - Estambul / Estambul - Madrid',
          destino: 'Estambul',
          empresa: '700 - TECHNICAL MANAGEMENT',
          fechaInicio: '2026-03-04',
          fechaFin: '2026-03-10'
        }),
        {
          nombre: 'noexiste@empresa.com',
          email: 'noexiste@empresa.com'
        }
      );
      expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
        icon: 'success'
      }));
    });
  });

  it('blocks create when emails are missing', async () => {
    const user = userEvent.setup();
    mockCreatePayload = {
      emails: [],
      proyecto: 'Proyecto X',
      comentarios: 'Comentario',
      extraFields: {}
    };

    render(<AdminDashboard />);

    await user.click(screen.getByText('Mock Create'));
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Emails requeridos'
    }));
    expect(baseAuthState.createSolicitud).not.toHaveBeenCalled();
  });

  it('shows warning when users are missing in Entra', async () => {
    const user = userEvent.setup();
    mockCreatePayload = {
      emails: ['missing@empresa.com'],
      proyecto: 'Proyecto X',
      comentarios: 'Comentario',
      extraFields: {}
    };
    baseAuthState.resolveUsersByEmails.mockResolvedValueOnce([]);

    render(<AdminDashboard />);
    await user.click(screen.getByText('Mock Create'));

    expect(baseAuthState.createSolicitud).not.toHaveBeenCalled();
    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning'
    }));
  });

  it('renders view role without admin actions', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      user: { ...baseAuthState.user, rol: 'view' }
    });

    const { container } = render(<AdminDashboard />);

    expect(screen.queryByText('Nueva Solicitud')).not.toBeInTheDocument();
    expect(container.querySelector('[data-estado-trigger="true"]')).toBeNull();
  });
});
