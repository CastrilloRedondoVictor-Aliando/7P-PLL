import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EditSolicitudModal from '../components/EditSolicitudModal';

describe('EditSolicitudModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('hides principales funciones field for admin edit flow', () => {
    render(
      <EditSolicitudModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={{
          proyecto: 'Proyecto X',
          comentarios: 'Texto interno',
          estado: 'En revisión',
          destino: 'Yazmir'
        }}
      />
    );

    expect(screen.queryByText(/Principales funciones realizadas/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del Proyecto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estado/i)).toBeInTheDocument();
  });
});