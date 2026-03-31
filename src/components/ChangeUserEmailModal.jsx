import React from 'react';
import { Users, X } from 'lucide-react';

const ChangeUserEmailModal = ({
  isOpen,
  onClose,
  currentEmail,
  newEmail,
  onCurrentEmailChange,
  onNewEmailChange,
  onSubmit,
  isSubmitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-user-email-modal-title"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="bg-primary px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-2xl bg-white/15 p-2.5">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="change-user-email-modal-title" className="text-lg font-semibold">
                  Corregir email de usuario
                </h2>
                <p className="mt-1 text-sm text-blue-100">
                  Actualiza el correo en Usuarios y Solicitudes sustituyendo el email completo cuando coincide con el actual.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Cerrar modal de correccion de email"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
              <span>Email actual</span>
              <input
                type="email"
                value={currentEmail}
                onChange={(event) => onCurrentEmailChange(event.target.value)}
                placeholder="ejemplo@dominio-antiguo.com"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-slate-700">
              <span>Email correcto</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => onNewEmailChange(event.target.value)}
                placeholder="ejemplo@grupotr.es"
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar cambio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeUserEmailModal;