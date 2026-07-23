# Tab Constellation

<img src="assets/banner.png" alt="Tab Constellation banner" />

An opinionated Chrome extension that groups tabs by domain, automatically, with zero setup or configuration.

**Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/mofbdejfllfkiolcioichhgiaieehabn?utm_source=item-share-cb).**

**The rule:** If 2 or more tabs share the same domain, they get grouped. If a domain drops to 1 tab, it gets ungrouped. That's it.

## Local development

```bash
pnpm install
pnpm build
```

Then load the project root as an unpacked extension at `chrome://extensions` (Developer mode → Load unpacked). Use `pnpm watch` while iterating, and reload the extension after changes.
