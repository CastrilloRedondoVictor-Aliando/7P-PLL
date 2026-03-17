import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SolicitudCard from '../components/SolicitudCard';

describe('SolicitudCard', () => {
  it('renders title, estado and dates', () => {
    const solicitud = {
      estado: 'Pendiente',
      destino: 'Espana',
      fechaInicio: '2026-03-04',
      fechaFin: '2026-03-10',
      comentarios: 'Comentario'
    };

    render(
      <SolicitudCard solicitud={solicitud} isSelected={false} onClick={vi.fn()} />
    );

    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/ESPANA -/)).toBeInTheDocument();
    expect(screen.getByText(/Inicio:/)).toBeInTheDocument();
    expect(screen.getByText(/Fin:/)).toBeInTheDocument();
  });
});
