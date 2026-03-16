import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from '../pages/LoginPage';

const loginMock = vi.fn().mockResolvedValue(true);

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock
  })
}));

describe('LoginPage', () => {
  it('renders and triggers Microsoft login', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    expect(screen.getByText('7P-PLL')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Iniciar sesión con Microsoft/i }));

    expect(loginMock).toHaveBeenCalledTimes(1);
  });
});
