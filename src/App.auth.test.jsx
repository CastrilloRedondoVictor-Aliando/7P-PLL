import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const msalState = vi.hoisted(() => ({
  handleRedirectPromise: vi.fn(),
  setActiveAccount: vi.fn(),
  isAuthenticated: false,
}));

const authState = vi.hoisted(() => ({
  user: null,
  isInitializing: false,
  handleLoginSuccess: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: {
      handleRedirectPromise: msalState.handleRedirectPromise,
      setActiveAccount: msalState.setActiveAccount,
    },
  }),
  useIsAuthenticated: () => msalState.isAuthenticated,
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('./pages/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('./pages/UserPortal', () => ({
  default: () => <div>User Portal</div>,
}));

vi.mock('./pages/AdminDashboard', () => ({
  default: () => <div>Admin Dashboard</div>,
}));

describe('App auth flow', () => {
  beforeEach(() => {
    msalState.handleRedirectPromise.mockReset();
    msalState.setActiveAccount.mockReset();
    msalState.isAuthenticated = false;
    authState.user = null;
    authState.isInitializing = false;
    authState.handleLoginSuccess = vi.fn();
  });

  it('sets the redirect account as active before syncing the user', async () => {
    const redirectAccount = { homeAccountId: 'home-account-id' };

    msalState.handleRedirectPromise.mockResolvedValue({
      idToken: 'redirect-token',
      account: redirectAccount,
    });
    authState.handleLoginSuccess.mockResolvedValue(true);

    render(<App />);

    await waitFor(() => {
      expect(msalState.setActiveAccount).toHaveBeenCalledWith(redirectAccount);
      expect(authState.handleLoginSuccess).toHaveBeenCalledWith('redirect-token', redirectAccount);
    });
  });

  it('allows retrying session sync after a failed attempt', async () => {
    msalState.isAuthenticated = true;
    msalState.handleRedirectPromise.mockResolvedValue(null);

    const firstAttempt = vi.fn().mockResolvedValue(false);
    authState.handleLoginSuccess = firstAttempt;

    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(firstAttempt).toHaveBeenCalledTimes(1);
    });

    const secondAttempt = vi.fn().mockResolvedValue(true);
    authState.handleLoginSuccess = secondAttempt;

    rerender(<App />);

    await waitFor(() => {
      expect(secondAttempt).toHaveBeenCalledTimes(1);
    });
  });
});