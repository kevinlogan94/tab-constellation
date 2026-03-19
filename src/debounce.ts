const timers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Schedules or reschedules a debounced call to the provided runner function.
 * If a timer is already scheduled for the same window ID, it is cancelled and replaced.
 * @param {number} windowId - The window ID to use as a key for debouncing
 * @param {number} delayMs - The debounce delay in milliseconds
 * @param {(windowId: number) => void} runner - The callback function to execute after the delay
 * @returns {void}
 */
export function scheduleWindowGrouping(
  windowId: number,
  delayMs: number,
  runner: (windowId: number) => void,
): void {
  const existing = timers.get(windowId);
  if (existing !== undefined) clearTimeout(existing);

  const id = setTimeout(() => {
    timers.delete(windowId);
    runner(windowId);
  }, delayMs);

  timers.set(windowId, id);
}
