type Listener = (message: string) => void
const listeners = new Set<Listener>()

export function reportError(message: string): void {
  listeners.forEach((fn) => fn(message))
}

export function subscribeErrors(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
