type Listener = () => void;

const listeners = new Set<Listener>();

export function startPageLoad() {
  listeners.forEach((listener) => listener());
}

export function subscribePageLoad(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
