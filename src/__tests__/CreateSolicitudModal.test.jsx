import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreateSolicitudModal from '../components/CreateSolicitudModal';

describe('CreateSolicitudModal', () => {
  it('renders admin modal copy', () => {
    render(
      <CreateSolicitudModal isOpen onClose={vi.fn()} onCreate={vi.fn()} />
    );

    expect(screen.getByText(/Crear solicitud para varios usuarios/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Emails destinatarios/)).toBeInTheDocument();
  });
});
