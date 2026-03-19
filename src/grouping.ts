import { getDomainKey, humanReadableTitleFromDomain } from './domain.js';

const UNGROUPED = chrome.tabGroups.TAB_GROUP_ID_NONE;

/**
 * Builds a map of domain keys to their associated tabs.
 * Excludes pinned tabs and tabs without a valid domain key.
 * @param {chrome.tabs.Tab[]} tabs - The array of tabs to process
 * @returns {Map<string, chrome.tabs.Tab[]>} A map where keys are domain keys and values are arrays of tabs
 */
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

/**
 * Removes a single tab from its group if it is currently grouped.
 * Safely handles cases where the tab may have closed or been ungrouped already.
 * @param {chrome.tabs.Tab} tab - The tab to ungroup
 * @returns {Promise<void>}
 */
async function ungroupSingle(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  if ((tab.groupId ?? UNGROUPED) === UNGROUPED) return;

  try {
    await chrome.tabs.ungroup([tab.id]);
  } catch {
    // Tab may have closed between query and ungroup — safe to ignore.
  }
}

/**
 * Groups multiple tabs together by domain and updates the group with a title and color.
 * Reuses existing groups only if all tabs are already in the same group to prevent cross-domain contamination.
 * @param {chrome.tabs.Tab[]} tabs - The tabs to group together
 * @param {string} domainKey - The domain key for the group
 * @returns {Promise<void>}
 */
async function groupMultiple(
  tabs: chrome.tabs.Tab[],
  domainKey: string,
): Promise<void> {
  const tabIds = tabs
    .map((t) => t.id)
    .filter((id): id is number => id !== undefined) as [number, ...number[]];

  if (tabIds.length < 2) return;

  // Find an existing group, but only if ALL tabs are already in the SAME group.
  // This prevents cross-domain group contamination when a new tab is created
  // in an existing group but navigates to a different domain.
  const groupIds = new Set(
    tabs
      .map((t) => t.groupId ?? UNGROUPED)
      .filter((id) => id !== UNGROUPED)
  );

  let groupId: number | undefined;
  const existingGroupId = groupIds.size === 1 ? Array.from(groupIds)[0] : undefined;

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

/**
 * Applies domain-based tab grouping to all tabs in a specified browser window.
 * Tabs from the same domain are grouped together, and single tabs are ungrouped.
 * @param {number} windowId - The ID of the window to apply grouping to
 * @returns {Promise<void>}
 */
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
