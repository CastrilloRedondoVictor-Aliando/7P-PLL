import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateSolicitudModalUser from '../components/CreateSolicitudModalUser';

describe('CreateSolicitudModalUser', () => {
  it('renders user modal copy', () => {
    render(
      <CreateSolicitudModalUser isOpen onClose={vi.fn()} onCreate={vi.fn()} />
    );

    expect(screen.getByText(/Solicita servicios legales/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Informacion del Proyecto/)).toBeInTheDocument();
  });
});
