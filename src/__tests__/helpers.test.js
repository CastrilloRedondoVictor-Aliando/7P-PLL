import { describe, expect, it } from 'vitest';
import { formatDate, formatDateShort, getEstadoColor, getUserById, getSolicitudById } from '../utils/helpers';

describe('helpers', () => {
  it('formats date in long format', () => {
    const result = formatDate('2026-03-04');
    expect(result).toContain('2026');
  });

  it('formats date in short format', () => {
    const result = formatDateShort('2026-03-04');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('returns estado color map with defaults', () => {
    const pending = getEstadoColor('Pendiente');
    expect(pending.bg).toBe('bg-yellow-100');

    const unknown = getEstadoColor('Otro');
    expect(unknown.bg).toBe('bg-gray-100');
  });

  it('finds user by id', () => {
    const users = [{ id: '1', nombre: 'A' }, { id: '2', nombre: 'B' }];
    expect(getUserById(users, '2')).toEqual({ id: '2', nombre: 'B' });
  });

  it('finds solicitud by id', () => {
    const solicitudes = [{ id: 10 }, { id: 20 }];
    expect(getSolicitudById(solicitudes, 20)).toEqual({ id: 20 });
  });
});
