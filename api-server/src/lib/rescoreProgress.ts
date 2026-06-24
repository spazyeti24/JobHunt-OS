interface RescoreProgress {
  isRunning: boolean;
  total: number;
  processed: number;
  lastUpdatedAt: number;
}

let state: RescoreProgress = {
  isRunning: false,
  total: 0,
  processed: 0,
  lastUpdatedAt: 0,
};

let cancelRequested = false;

export function tryStartRescoreProgress(total: number): boolean {
  if (state.isRunning) return false;
  state = { isRunning: true, total, processed: 0, lastUpdatedAt: Date.now() };
  cancelRequested = false;
  return true;
}

export function incrementRescoreProgress(): void {
  state.processed++;
  state.lastUpdatedAt = Date.now();
}

export function finishRescoreProgress(): void {
  state = { isRunning: false, total: 0, processed: 0, lastUpdatedAt: Date.now() };
  cancelRequested = false;
}

export function resetRescoreProgress(): void {
  state = { isRunning: false, total: 0, processed: 0, lastUpdatedAt: Date.now() };
  cancelRequested = false;
}

export function getRescoreProgress(): RescoreProgress {
  return { ...state };
}

export function requestCancelRescore(): void {
  cancelRequested = true;
}

export function isCancelRequested(): boolean {
  return cancelRequested;
}
