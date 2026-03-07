import { applyGroupingForWindow } from './grouping.js';
import { scheduleWindowGrouping } from './debounce.js';

const DEBOUNCE_MS = 1000;

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

chrome.tabs.onAttached.addListener((_, attachInfo) => {
  scheduleWindowGrouping(attachInfo.newWindowId, DEBOUNCE_MS, applyGroupingForWindow);
});

chrome.tabs.onDetached.addListener((_, detachInfo) => {
  scheduleWindowGrouping(detachInfo.oldWindowId, DEBOUNCE_MS, applyGroupingForWindow);
});

chrome.tabGroups.onRemoved.addListener((group) => {
  scheduleWindowGrouping(group.windowId, DEBOUNCE_MS, applyGroupingForWindow);
});
