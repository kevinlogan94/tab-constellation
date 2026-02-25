const timers = new Map<number, ReturnType<typeof setTimeout>>();

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
