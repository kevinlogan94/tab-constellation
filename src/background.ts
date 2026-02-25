import { applyGroupingForWindow } from './grouping.js';
import { scheduleWindowGrouping } from './debounce.js';

const DEBOUNCE_MS = 200;

async function applyGroupingForAllWindows(): Promise<void> {
  const windows = await chrome.windows.getAll();
  for (const win of windows) {
    if (win.id !== undefined) {
      await applyGroupingForWindow(win.id);
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  applyGroupingForAllWindows();
});

chrome.runtime.onStartup.addListener(() => {
  applyGroupingForAllWindows();
});

chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
  if (changeInfo.url === undefined && changeInfo.status !== 'complete') return;
  if (tab.windowId === undefined) return;

  scheduleWindowGrouping(tab.windowId, DEBOUNCE_MS, applyGroupingForWindow);
});

chrome.tabs.onRemoved.addListener((_, removeInfo) => {
  if (removeInfo.isWindowClosing) return;

  scheduleWindowGrouping(removeInfo.windowId, DEBOUNCE_MS, applyGroupingForWindow);
});
