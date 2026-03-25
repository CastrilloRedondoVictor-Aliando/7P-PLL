import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSwalFire = vi.fn(() => Promise.resolve());

vi.mock('sweetalert2', () => ({
  default: {
    fire: (...args) => mockSwalFire(...args)
  }
}));

describe('apiRequest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows the expired token alert on 401 responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ error: 'Token expired' })
    });

    const { apiRequest } = await import('../config/api');

    await expect(apiRequest('/solicitudes')).rejects.toMatchObject({ status: 401 });

    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'Token de seguridad expirado',
      text: 'Debes cerrar sesión y volver a entrar porque el token de seguridad ha expirado.'
    }));
  });

  it('shows the unauthorized alert on forbidden responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' })
    });

    const { apiRequest } = await import('../config/api');

    await expect(apiRequest('/solicitudes')).rejects.toMatchObject({ status: 403 });

    expect(mockSwalFire).toHaveBeenCalledWith(expect.objectContaining({
      icon: 'warning',
      title: 'No autorizado',
      text: 'No estas autorizado para realizar esta accion. Prueba a cerrar sesion y volver a entrar.'
    }));
  });

  it('does not show the expired token alert for generic server errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: vi.fn().mockResolvedValue({ error: 'Error interno del servidor' })
    });

    const { apiRequest } = await import('../config/api');

    await expect(apiRequest('/solicitudes')).rejects.toMatchObject({ status: 500 });

    expect(mockSwalFire).not.toHaveBeenCalled();
  });
});