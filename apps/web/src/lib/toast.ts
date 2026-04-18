/**
 * Creorga Toast
 * ----------------------------------------------------------
 * Wrapper stylisé autour de react-hot-toast, avec variantes,
 * boutons d'action et helpers promesse.
 */

import toast, { type Toast, type ToastOptions } from 'react-hot-toast'
import { createElement, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Styles                                                             */
/* ------------------------------------------------------------------ */

const BASE_STYLE: ToastOptions['style'] = {
  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 500,
  padding: '12px 16px',
  borderRadius: 12,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  background: '#ffffff',
  color: '#111827',
  border: '1px solid #e5e7eb',
  maxWidth: 420,
}

const VARIANT_STYLES: Record<string, ToastOptions['style']> = {
  success: {
    ...BASE_STYLE,
    borderColor: '#a7f3d0',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
  },
  error: {
    ...BASE_STYLE,
    borderColor: '#fecaca',
    background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
    color: '#991b1b',
  },
  warning: {
    ...BASE_STYLE,
    borderColor: '#fde68a',
    background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
    color: '#92400e',
  },
  info: {
    ...BASE_STYLE,
    borderColor: '#bfdbfe',
    background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
    color: '#1e40af',
  },
  loading: {
    ...BASE_STYLE,
    borderColor: '#e5e7eb',
  },
}

const DEFAULT_DURATION = 3500

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastCustomOptions extends ToastOptions {
  action?: ToastAction
  icon?: ReactNode
}

function renderWithAction(
  t: Toast,
  message: ReactNode,
  action?: ToastAction,
  variantColor?: string,
): ReactNode {
  return createElement(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
      },
    },
    createElement('span', { style: { flex: 1 } }, message),
    action
      ? createElement(
          'button',
          {
            onClick: () => {
              action.onClick()
              toast.dismiss(t.id)
            },
            style: {
              padding: '6px 10px',
              borderRadius: 8,
              border: 'none',
              background: variantColor ?? '#6366f1',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            },
          },
          action.label,
        )
      : null,
  )
}

/* ------------------------------------------------------------------ */
/* API publique                                                       */
/* ------------------------------------------------------------------ */

export function toastSuccess(
  message: ReactNode,
  opts?: ToastCustomOptions,
): string {
  return toast.custom(
    (t) => renderWithAction(t, message, opts?.action, '#10b981'),
    {
      duration: opts?.duration ?? DEFAULT_DURATION,
      style: VARIANT_STYLES.success,
      position: opts?.position,
      id: opts?.id,
    },
  )
}

export function toastError(
  message: ReactNode,
  opts?: ToastCustomOptions,
): string {
  return toast.custom(
    (t) => renderWithAction(t, message, opts?.action, '#ef4444'),
    {
      duration: opts?.duration ?? 5000,
      style: VARIANT_STYLES.error,
      position: opts?.position,
      id: opts?.id,
    },
  )
}

export function toastWarning(
  message: ReactNode,
  opts?: ToastCustomOptions,
): string {
  return toast.custom(
    (t) => renderWithAction(t, message, opts?.action, '#f59e0b'),
    {
      duration: opts?.duration ?? DEFAULT_DURATION,
      style: VARIANT_STYLES.warning,
      position: opts?.position,
      id: opts?.id,
    },
  )
}

export function toastInfo(
  message: ReactNode,
  opts?: ToastCustomOptions,
): string {
  return toast.custom(
    (t) => renderWithAction(t, message, opts?.action, '#3b82f6'),
    {
      duration: opts?.duration ?? DEFAULT_DURATION,
      style: VARIANT_STYLES.info,
      position: opts?.position,
      id: opts?.id,
    },
  )
}

export function toastLoading(
  message: ReactNode,
  opts?: ToastOptions,
): string {
  return toast.loading(message as string, {
    style: VARIANT_STYLES.loading,
    ...opts,
  })
}

export function toastPromise<T>(
  promise: Promise<T>,
  msgs: {
    loading: ReactNode
    success: ReactNode | ((value: T) => ReactNode)
    error: ReactNode | ((err: unknown) => ReactNode)
  },
  opts?: ToastOptions,
): Promise<T> {
  return toast.promise(
    promise,
    {
      loading: msgs.loading as string,
      success: msgs.success as string,
      error: msgs.error as string,
    },
    {
      style: BASE_STYLE,
      success: { style: VARIANT_STYLES.success },
      error: { style: VARIANT_STYLES.error },
      loading: { style: VARIANT_STYLES.loading },
      ...opts,
    },
  )
}

export function toastDismiss(id?: string): void {
  toast.dismiss(id)
}

/**
 * Toast confirmant une action avec un bouton "Annuler".
 * Retourne une promesse résolue à true si l'utilisateur annule.
 */
export function toastWithUndo(
  message: ReactNode,
  opts?: { duration?: number; undoLabel?: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    let undone = false
    const id = toast.custom(
      (t) =>
        renderWithAction(
          t,
          message,
          {
            label: opts?.undoLabel ?? 'Annuler',
            onClick: () => {
              undone = true
              resolve(true)
            },
          },
          '#6366f1',
        ),
      {
        duration: opts?.duration ?? 5000,
        style: VARIANT_STYLES.info,
      },
    )
    setTimeout(
      () => {
        toast.dismiss(id)
        if (!undone) resolve(false)
      },
      opts?.duration ?? 5000,
    )
  })
}

export const creorgaToast = {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  loading: toastLoading,
  promise: toastPromise,
  dismiss: toastDismiss,
  undo: toastWithUndo,
}

export default creorgaToast
