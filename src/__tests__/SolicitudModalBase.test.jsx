import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SolicitudModalBase from '../components/SolicitudModalBase';

describe('SolicitudModalBase', () => {
  afterEach(() => {
    cleanup();
  });

  it('submits admin mode with emails and extras', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <SolicitudModalBase
        isOpen
        onClose={vi.fn()}
        onCreate={onCreate}
        availableUsers={[
          { oid: '1', nombre: 'Persona Uno', email: 'uno@empresa.com' },
          { oid: '2', nombre: 'Persona Dos', email: 'dos@empresa.com' }
        ]}
        mode="admin"
        headerSubtitle="Admin"
        submitLabel="Crear Solicitud"
        projectLabel="Nombre del Proyecto *"
        projectPlaceholder="Ej"
      />
    );

    await user.click(screen.getByLabelText(/Seleccionar Persona Uno/i));
    await user.type(screen.getByLabelText(/Nombre del Proyecto/), 'Proyecto X');
    await user.type(screen.getByLabelText(/Destino/), 'Espana');

    await user.click(screen.getByRole('button', { name: /Crear Solicitud/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toEqual(['uno@empresa.com']);
    expect(onCreate.mock.calls[0][1]).toBe('Proyecto X');
    expect(onCreate.mock.calls[0][3]).toMatchObject({ pais: 'Espana' });
  });

  it('blocks when fechaInicio is after fechaFin', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <SolicitudModalBase
        isOpen
        onClose={vi.fn()}
        onCreate={onCreate}
        availableUsers={[{ oid: '1', nombre: 'Persona Uno', email: 'uno@empresa.com' }]}
        mode="admin"
        headerSubtitle="Admin"
        submitLabel="Crear Solicitud"
        projectLabel="Nombre del Proyecto *"
        projectPlaceholder="Ej"
      />
    );

    await user.click(screen.getByLabelText(/Seleccionar Persona Uno/i));
    await user.type(screen.getByLabelText(/Nombre del Proyecto/), 'Proyecto X');
    fireEvent.change(screen.getByLabelText(/Fecha de inicio/), {
      target: { value: '2026-03-10' }
    });
    fireEvent.change(screen.getByLabelText(/Fecha de fin/), {
      target: { value: '2026-03-04' }
    });

    await user.click(screen.getByRole('button', { name: /Crear Solicitud/i }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('submits user mode with comments required', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <SolicitudModalBase
        isOpen
        onClose={vi.fn()}
        onCreate={onCreate}
        mode="user"
        headerSubtitle="User"
        submitLabel="Enviar Solicitud"
        projectLabel="Informacion del Proyecto *"
        projectPlaceholder="Ej"
        commentsLabel="Principales funciones realizadas *"
        commentsPlaceholder="Detalles"
        requireComments
      />
    );

    await user.type(screen.getByLabelText(/Informacion del Proyecto/), 'Proyecto Y');
    await user.type(screen.getByPlaceholderText(/Detalles/), 'Detalle');
    await user.click(screen.getByRole('button', { name: /Enviar Solicitud/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toBe('Proyecto Y');
    expect(onCreate.mock.calls[0][1]).toBe('Detalle');
  });
});
