# Cross-Domain Group Contamination Bug

## Summary

When opening a new tab via a link from a grouped tab (e.g., clicking a cursor.com link while on a google.com tab), the new tab would inherit the source tab's group ID. The extension would then fail to properly separate it into the correct domain group, resulting in a single group containing tabs from multiple different domains.

## Original Behavior (Bug)

1. User has 2 google.com tabs grouped together as "Google" (group ID: 667967261)
2. User clicks a link to cursor.com while on a google.com tab
3. Chrome creates the new cursor.com tab with `groupId: 667967261` (inherited from source tab)
4. Extension's `applyGroupingForWindow()` runs and identifies two domains:
   - google.com: [tab1, tab2]
   - cursor.com: [tab3]
5. When processing cursor.com tabs, the extension's `groupMultiple()` function finds the existing `groupId: 667967261` on tab3
6. **Bug**: `groupMultiple()` blindly reuses that group ID without checking if all tabs are actually in the same group
7. Result: Both google.com and cursor.com tabs end up in group 667967261 (cross-domain contamination)

## Root Cause

In `src/grouping.ts`, the `groupMultiple()` function had this logic:

```javascript
// BEFORE (buggy code)
const existingGroupId = tabs.find(
  (t) => (t.groupId ?? UNGROUPED) !== UNGROUPED,
)?.groupId;
```

This code:
- Finds the **first** tab that has a group ID
- Assumes all tabs should be in that group
- Doesn't validate that all tabs are already in the **same** group

When a cursor.com tab inherits the Google group's ID but actually belongs to a different domain, this code would reuse the contaminated group without question.

## Solution

Changed the logic to validate group ID consistency before reusing:

```javascript
// AFTER (fixed code)
const groupIds = new Set(
  tabs
    .map((t) => t.groupId ?? UNGROUPED)
    .filter((id) => id !== UNGROUPED)
);

const existingGroupId = groupIds.size === 1 ? Array.from(groupIds)[0] : undefined;
```

This new logic:
1. Collects all unique group IDs from the tabs being processed
2. Only reuses the group if there's exactly 1 unique group ID (all tabs are in the same group)
3. Creates a fresh group if tabs have inconsistent group IDs

Additionally, the existing `ungroupSingle()` function handles individual misplaced tabs that end up in the wrong group due to Chrome's default inheritance behavior.

## Code Changes

**File**: `src/grouping.ts`  
**Function**: `groupMultiple()`  
**Lines**: 46-56

Added a sanity check before group reuse that ensures all tabs being grouped are already in the same group (or ungrouped).

## Testing

The bug was reproduced and verified with runtime instrumentation:

1. Created 2 google.com tabs in a group
2. Opened a cursor.com tab via link from a google.com tab
3. Verified that:
   - The cursor.com tab initially has the Google group ID (Chrome's default)
   - After the extension runs, the cursor.com tab is properly ungrouped
   - The Google tabs remain in their original group
   - No cross-domain group contamination occurs

## Impact

- **Before**: Tab groups could become inconsistent, showing mixed domains in a single group
- **After**: Tab groups remain domain-specific; tabs are properly separated even when initially created in the wrong group

## Related Files

- `src/grouping.ts` - Main grouping logic
- `src/domain.ts` - Domain extraction and validation
- `src/background.ts` - Event listeners that trigger grouping
