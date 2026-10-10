export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

type Listener = (toast: Toast | null) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function showToast(message: string, action?: Toast['action']) {
  const toast: Toast = { id: ++counter, message, action };
  listeners.forEach((listener) => listener(toast));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
