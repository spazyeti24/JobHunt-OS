const controllers = new Map<number, AbortController>();

export function registerRun(runId: number): AbortSignal {
  const controller = new AbortController();
  controllers.set(runId, controller);
  return controller.signal;
}

export function requestCancel(runId: number): void {
  const controller = controllers.get(runId);
  if (controller) {
    controller.abort();
  }
}

export function isCancelled(runId: number): boolean {
  const controller = controllers.get(runId);
  return controller?.signal.aborted ?? false;
}

export function clearCancel(runId: number): void {
  controllers.delete(runId);
}
