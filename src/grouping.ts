import { getDomainKey, humanReadableTitleFromDomain } from './domain.js';

const UNGROUPED = chrome.tabGroups.TAB_GROUP_ID_NONE;

function buildDomainMap(tabs: chrome.tabs.Tab[]): Map<string, chrome.tabs.Tab[]> {
  const map = new Map<string, chrome.tabs.Tab[]>();

  for (const tab of tabs) {
    if (tab.pinned) continue;

    const key = getDomainKey(tab.url);
    if (key === null) continue;

    const group = map.get(key);
    if (group) {
      group.push(tab);
    } else {
      map.set(key, [tab]);
    }
  }

  return map;
}

async function ungroupSingle(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  if ((tab.groupId ?? UNGROUPED) === UNGROUPED) return;

  try {
    await chrome.tabs.ungroup([tab.id]);
  } catch {
    // Tab may have closed between query and ungroup — safe to ignore.
  }
}

async function groupMultiple(
  tabs: chrome.tabs.Tab[],
  domainKey: string,
): Promise<void> {
  const tabIds = tabs
    .map((t) => t.id)
    .filter((id): id is number => id !== undefined) as [number, ...number[]];

  if (tabIds.length < 2) return;

  // Reuse the first existing group found among the tabs.
  const existingGroupId = tabs.find(
    (t) => (t.groupId ?? UNGROUPED) !== UNGROUPED,
  )?.groupId;

  let groupId: number | undefined;

  try {
    if (existingGroupId !== undefined && existingGroupId !== UNGROUPED) {
      groupId = await chrome.tabs.group({ groupId: existingGroupId, tabIds });
    } else {
      groupId = await chrome.tabs.group({ tabIds });
    }
  } catch {
    // Tabs may have closed or moved — abort silently.
    return;
  }

  if (groupId === undefined) return;

  const title = humanReadableTitleFromDomain(domainKey);

  try {
    await chrome.tabGroups.update(groupId, { title, color: 'grey' });
  } catch (err) {
    console.warn(`[TC] tabGroups.update failed for group ${groupId}:`, err);
  }
}

export async function applyGroupingForWindow(windowId: number): Promise<void> {
  let tabs: chrome.tabs.Tab[];

  try {
    tabs = await chrome.tabs.query({ windowId });
  } catch {
    // Window may have closed — nothing to do.
    return;
  }

  const domainMap = buildDomainMap(tabs);

  for (const [domainKey, domainTabs] of domainMap) {
    if (domainTabs.length === 1) {
      await ungroupSingle(domainTabs[0]);
    } else {
      await groupMultiple(domainTabs, domainKey);
    }
  }
}
