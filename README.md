# Userscripts

Personal userscripts for Safari on macOS and iOS, run through the [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) app. Each script is a single self-contained `.user.js` file with no build step and no dependencies.

| Script | Version | Runs on | What it does |
| --- | --- | --- | --- |
| [**rp·tunnel vision**](#rptunnel-vision) | 1.8 | `www.youtube.com`, `m.youtube.com` | Strips YouTube down to search, the video and its description. Removes Shorts, comments, live chat, suggestions, the home feed and most of the chrome around the player. |
| [**CamelButton**](#camelbutton) | 1.0 | Amazon (UK, US, DE, FR, ES, IT, CA, AU) | Adds a 🐪 button next to the price on Amazon product pages that opens the product's price history on CamelCamelCamel. |

---

## Contents

- [Installation](#installation)
- [rp·tunnel vision](#rptunnel-vision)
  - [Settings](#settings)
  - [What it hides on desktop](#what-it-hides-on-desktop)
  - [What it hides on mobile](#what-it-hides-on-mobile)
  - [How it works](#how-it-works)
  - [Known limitations](#known-limitations)
  - [Debugging a broken selector](#debugging-a-broken-selector)
- [CamelButton](#camelbutton)
- [Working on these scripts](#working-on-these-scripts)
- [Version history](#version-history)

---

## Installation

### macOS

1. Install **Userscripts** from the Mac App Store.
2. Open the Userscripts app and set its scripts folder to this directory.
3. In Safari, go to **Settings → Extensions** and enable **Userscripts**.
4. Under the extension's website permissions, allow it on `youtube.com` and the Amazon domains you use, or on all websites.
5. Reload any open YouTube or Amazon tabs.

### iOS and iPadOS

1. Install **Userscripts** from the App Store.
2. Open the app and point it at this folder. Keeping the folder in iCloud Drive lets the Mac and the phone share the same files.
3. Go to **Settings → Apps → Safari → Extensions → Userscripts**, turn it on, and allow it on the relevant sites.

### Keeping the files on disk

If this folder lives in iCloud Drive, macOS may offload the scripts to save space, and Userscripts can't load a file that isn't downloaded. In Finder, right-click the folder and choose **Keep Downloaded**.

---

## rp·tunnel vision

`rp-tunnel-vision.user.js`

YouTube is built to keep you watching. This script removes the parts of the page that exist to pull you onto the next video, so you can find what you came for, watch it and leave.

What stays:

- The search bar
- The video player
- The title, channel and subscribe button
- The like count
- The description
- Your subscriptions feed, untouched
- Panels you open on purpose, such as Ask and the transcript

Where something has been removed, the script shows a short message in its place: **Focus, Ruben!**

The script started life as a Safari App Extension with a popup of switches (versions 1.0 and 1.1). From version 1.2 it is a userscript, which needs no Xcode project, no signing and no rebuilding.

### Settings

Settings are constants at the top of the file. Edit them and save; the change applies on the next page load.

```js
const SETTINGS = {
  comments: true,   // hide comment sections and live chat
  suggested: true,  // Shorts, suggestions, action buttons, top bar, sidebar menu
  homepage: true    // search-only home page
};
```

| Setting | Scope | Effect |
| --- | --- | --- |
| `comments` | Video pages | Hides the comments section, the live chat on streams, and the teaser cards that link to either. |
| `suggested` | Everywhere | Hides Shorts, suggested videos (beside, below and inside the player), the share and save buttons, the top-bar extras and most of the side menu. |
| `homepage` | Home page only | Replaces the recommendation feed with the "Focus, Ruben!" message, leaving search as the way in. |

None of the settings affect the subscriptions feed, except that Shorts are removed from it when `suggested` is on.

### What it hides on desktop

**`comments`**

| Element | Notes |
| --- | --- |
| Comments section | Including the empty section wrapper that would otherwise leave a gap. |
| Live chat | Hidden wherever YouTube puts it: the right-hand column on a wide window, under the video on a narrow one, and beside the player in theatre mode. |
| Live chat and comments teaser cards | The "Live chat · Open panel" card beside the description. The description widens to fill the row. |
| Empty chat slot in theatre mode | The 550px column reserved for the chat beside a theatre-mode player. The video expands to full width. |
| Fixed-panel layout spacer | In YouTube's experimental fixed-panel layout, the invisible block that keeps the floating chat off the video. |

**`suggested`**

| Element | Notes |
| --- | --- |
| Shorts | Home page shelves, search results, channel tabs and the Shorts entry in the side menu. |
| Sidebar suggestions | The "Up next" list, related-video shelves, playlist panels and the donation shelf. |
| End screens | End cards, the video wall and the autoplay countdown. |
| Overlays inside the player | The end-of-video grid, the pause overlay, "More videos" and the suggestions panel. The last frame and the controls stay. |
| Sponsored sidebar panel | The ads panel YouTube opens in the sidebar in theatre mode. |
| Action bar | Share, Save and the "⋯" menu are removed. Dislike is removed (YouTube exposes no dislike count), and the like button becomes a plain, non-interactive count. |
| Top bar | Create and Notifications. |
| Side menu | Trimmed to the You and Subscriptions sections. |

When the right-hand column is left with nothing in it, it collapses to zero width and the player grows to take the space. It reappears the moment you open a panel such as Ask or the transcript.

**`homepage`**

| Element | Notes |
| --- | --- |
| Recommendation grid | Replaced with "Focus, Ruben!". |
| Filter chips | The topic bar above the feed. |

### What it hides on mobile

On `m.youtube.com` every rule is scoped to the page it belongs on, using the URL. Mobile YouTube uses the same building blocks for the home page and the subscriptions feed, so this is the only reliable way to clear one without breaking the other.

| Setting | Page | Hidden |
| --- | --- | --- |
| `suggested` | Every page | Shorts shelves and items, and the Shorts tab in the bottom bar. The remaining tabs close up evenly. |
| `suggested` | Video | Suggested videos and topic chips under the player, plus any empty placeholder sections. |
| `comments` | Video | The comments card and its input box. |
| `homepage` | Home | The feed and filter chips. |

On a video page, "Focus, Ruben!" appears under the like and share row. On the home page it sits below the top bar, with a background that follows the system light or dark appearance.

**Scroll lock.** On a phone, the player is pinned to the top and the page scrolls underneath it. Once suggestions and comments are gone, there's nothing left to scroll to, and dragging would just slide the title behind the player. When the remaining content fits on one screen, the script pins the page at the top and locks scrolling. It releases the lock as soon as something taller appears, such as the description sheet, a panel, or a setting turned off.

### How it works

**Styles, not deletion.** Almost everything is hidden with one injected `<style>` element using `display: none !important`. Nothing is removed from the page, so YouTube's own scripts keep working, and turning a setting off restores the element on the next load. A `MutationObserver` puts the style element back if YouTube's page rebuilds drop it.

**Separate desktop and mobile rule sets.** Desktop YouTube is built from `ytd-*` custom elements and mobile from `ytm-*`. The two share almost no selectors, so the script picks a rule set from the hostname.

**Page detection by URL.** `getPageType()` classifies the page from `location.pathname` as `home`, `video`, `shorts`, `subscriptions`, `feed` or `other`. On mobile this is the only signal available, because the home page and the subscriptions feed have identical markup.

**Navigation polling.** YouTube is a single-page app: moving between videos changes the URL without loading a new page. A 300ms interval watches `location.href` and re-applies the rules after each navigation. Earlier versions used a `MutationObserver` for this and missed navigations.

**Collapsing the empty sidebar.** `watchSidebar()` checks the right-hand column on every tick and when it resizes. If none of its children has any height, it adds the class `rp-tv-empty`, and CSS collapses the column to zero width. The check looks at the children rather than the column itself, because on livestreams Safari gives the empty column a height of its own. The column is collapsed with `width: 0` rather than `display: none`, so anything that opens inside it still has a measurable height and reopens it.

**Resizing the player.** The player sizes its video with JavaScript and only recalculates when the window resizes. `nudgePlayer()` watches three things: theatre mode, the chat slot and the sidebar. When any of them changes, it fires a `resize` event so the video grows into the space that was freed.

**Theatre mode and the fixed-panel layout.** In theatre mode, and in an experimental layout some accounts are served (`ytd-watch-flexy[using-fixed-panel]`), YouTube reserves room for a chat panel even when no chat is showing. It does this with an empty slot beside the player, padding on the row below it, and an invisible spacer element. The script removes each of these, but only when no real panel is open, so Ask and transcripts still get their space.

### Known limitations

- **YouTube changes its markup.** Selectors are tied to YouTube's element names and attributes, and YouTube renames things and runs layout experiments that differ between accounts and browsers. When something reappears, a selector has stopped matching. See [Debugging a broken selector](#debugging-a-broken-selector).
- **Some matches use English labels.** Share, Save, Create, Comments and Live chat are found by their `aria-label`. If YouTube is set to another language, those elements will show.
- **Settings are fixed in the file.** There is no toggle in the browser. Change a setting by editing the constant and reloading.
- **The fixed-panel layout fix is partly untested.** Opening Ask inside YouTube's experimental fixed-panel layout hasn't been checked. If the panel doesn't appear, the open-panel check in the `comments` rules is the place to look.

### Debugging a broken selector

Guessing at YouTube's element names rarely works. Inspect what's actually on the page, then write the rule against that.

- **Mac:** open YouTube in Safari and press **⌥⌘I** for the Web Inspector.
- **iPhone:** turn on **Settings → Apps → Safari → Advanced → Web Inspector**, connect the phone to the Mac with a cable, and choose **Develop → [your iPhone] → [the YouTube tab]** in Safari on the Mac.

This lists every YouTube element on the page, which is usually enough to find the new name:

```js
copy([...new Set([...document.querySelectorAll("*")]
  .map(e => e.tagName.toLowerCase())
  .filter(t => t.startsWith("ytd-") || t.startsWith("ytm-") || t.startsWith("yt-")))]
  .sort().join("\n"));
```

It copies the list to the clipboard. Some notes from past debugging:

- **Detach the inspector into its own window** before measuring layout. When it's docked, the page gets a shorter window and YouTube changes its layout to suit.
- **Safari only allows `copy()` while the console is evaluating.** Inside a `setTimeout` it silently does nothing. Store the result in a variable such as `window.__rp` instead, then run `copy(window.__rp)` separately.
- **Check the attributes on `ytd-watch-flexy`.** YouTube switches layouts by setting attributes on it, such as `theater`, `fixed-panels` and `using-fixed-panel`, and most layout bugs trace back to one of them.

---

## CamelButton

`camelbutton.user.js`

Adds a 🐪 button right after the price on Amazon product pages. Clicking it opens the product's price history on [CamelCamelCamel](https://uk.camelcamelcamel.com) in a new tab, so you can tell whether today's price is actually a good one before buying.

**Supported sites:** amazon.co.uk, amazon.com, amazon.de, amazon.fr, amazon.es, amazon.it, amazon.ca, amazon.com.au.

**How it works**

1. **Reads the ASIN.** It takes the product's 10-character ASIN from the `/dp/XXXXXXXXXX` part of the URL.
2. **Builds the link.** It points the button at `https://uk.camelcamelcamel.com/product/<ASIN>`.
3. **Finds the price.** It works through a list of Amazon's price containers, newest layout first, and places the button after the first one it finds.
4. **Waits for late pages.** Amazon builds parts of the page late, so if no price is found straight away, it retries every 500ms, up to ten times.
5. **Follows variant changes.** Switching colour or size can change the ASIN without loading a new page. A `MutationObserver` notices the change and rebuilds the button for the new ASIN.

**Limitations**

- **The link always goes to the UK site.** On non-UK Amazon stores it still opens `uk.camelcamelcamel.com`, so the price history shown may not match the store you're on.
- **Only `/dp/` pages are recognised.** Product pages whose URL uses another form, such as `/gp/product/`, get no button.
- **It relies on Amazon's price selectors.** If Amazon changes its price markup, the button won't appear until the selector list is updated.

---

## Working on these scripts

**Edit the files in this folder directly.** Userscripts reads them from disk, so saving and reloading the page is enough.

**Watch the Userscripts editor.** If a script is open in the Userscripts app's own editor, the app can save its copy over changes made elsewhere. This happened to rp·tunnel vision 1.6. Before editing a file outside the app, close it in the app's editor without saving. Before trusting a test, check the `@version` line in the file on disk.

**Bump `@version`** in the metadata block with every change, and add an entry to the version history below.

**Commit and push** after each change:

```bash
git add -A && git commit -m "rp-tunnel-vision 1.9: describe the change" && git push
```

---

## Version history

### rp·tunnel vision

#### 1.8 · 7 October 2026

- Fixed the title and description being narrowed in theatre mode.
- Hid the sponsored panel (`engagement-panel-ads`) that YouTube keeps open in the sidebar in theatre mode. It counted as content, so the sidebar never registered as empty and never collapsed.
- The fixed-panel rules from 1.7 now ignore the ads panel when checking whether a panel is open.
- Removed the right-hand padding YouTube adds under a theatre-mode player when the sidebar is empty. The description width went from 632px to the full row. The padding comes back as soon as a panel opens.

#### 1.7 · 7 October 2026

- Added support for YouTube's experimental fixed-panel layout (`ytd-watch-flexy[using-fixed-panel]`). In that layout the chat floats over the right edge of the page, and an invisible spacer (`#columns::after`) stopped the video short, leaving a gap on the right in default mode.
- The spacer is removed when no panel is open.
- The empty panel host is made invisible and non-clickable. Otherwise it would sit over the widened video and catch clicks.
- Included the 1.6 change, which never ran.

#### 1.6 · 7 October 2026

- The sidebar now counts as empty when none of its children has any height, instead of measuring the sidebar itself. On livestreams Safari gives the empty sidebar a height of its own, which kept it open.
- **This version never ran.** The Userscripts editor saved its open copy of 1.5 over it. The change shipped in 1.7.

#### 1.5 · 7 October 2026

- Fixed empty space beside the player in theatre mode on livestreams. YouTube reserves a 550px slot for the chat (`#panels-full-bleed-container`), and it stayed empty after the chat was hidden. The slot is now hidden unless something other than the chat is in it.
- Added `nudgePlayer()`. It fires a window `resize` event whenever theatre mode, the chat slot or the sidebar changes, so the player redraws its video at the new size. Without it, the player's box grew but the video stayed small.

#### 1.4 · 7 October 2026

- Hid the "Live chat · Open panel" teaser card beside the description, and the comments equivalents. The description fills the row.
- The empty-sidebar check now runs every 300ms as well as on resize. A `ResizeObserver` only reports changes, so a sidebar that was empty from the first paint, as on a livestream, was never collapsed.

#### 1.3 · 7 October 2026

- Live chat is hidden in all three places YouTube puts it, depending on layout: the sidebar on a wide window, under the video on a narrow window, and beside the player in theatre mode. 1.2 only caught the first.
- Moved live chat from the `suggested` setting to `comments`, since it's the livestream equivalent of a comment section.

#### 1.2 · 20 September 2026

Ported from a Safari extension to a userscript.

> These notes were reconstructed by comparing the 1.1 and 1.2 source. The conversation where 1.2 was written isn't on record.

- Ported to the Userscripts app, with `@run-at document-start`, `@inject-into content` and `@noframes`. No Xcode project, signing or rebuild needed.
- Replaced the popup switches with a `SETTINGS` constant: `comments`, `suggested` and `homepage`.
- Removed the `shorts` setting; Shorts are now part of `suggested`.
- Removed the `askai` setting. Instead of hiding the whole sidebar, the script now hides what's in it, so the Ask panel can still open there.
- Added collapsing of the empty sidebar (`rp-tv-empty`), so the player takes the space when nothing is in the column.
- Hid suggestion overlays inside the player: the end-of-video grid, the pause overlay, "More videos", the suggestions panel and the related-on-error screen.
- Hid Share, Save and the "⋯" menu. Removed dislike and turned the like button into a plain count.
- Hid Create and Notifications in the top bar, and trimmed the side menu to You and Subscriptions.
- Clipped the ambient-mode glow, which spilled past the edges once the sidebar collapsed.
- On mobile, added the scroll lock and hid empty suggestion sections that were reserving height.

#### 1.1 · 10 September 2026

Safari extension.

- Added a fifth popup switch, **Ask AI**. It hides the Gemini "Ask" button and panel on desktop and mobile, separately from suggested videos, which YouTube had bundled it with.

#### 1.0 · 27 May 2026

Safari extension, originally named **YT Focus**, for Safari on macOS and iOS. Wrapped with `safari-web-extension-converter`, with a popup of four switches: Shorts, Comments, Suggested Videos and Homepage Feed.

What was worked out during 1.0:

- **Mobile needs its own selectors.** `m.youtube.com` uses `ytm-*` elements, unlike desktop's `ytd-*`. The real names were found by injecting an element inspector into the live page.
- **Page detection by URL.** Mobile gives the home page and the subscriptions feed the same markup, so rules are scoped by `location.pathname`. This stopped the homepage setting from blanking the subscriptions feed.
- **Navigation polling.** A 300ms URL check replaced a `MutationObserver`, which was missing navigations within YouTube.
- **"Focus, Ruben!" message.** Added after the like and share row on video pages, and below the top bar on the home page, where it follows dark mode.
- **Shorts removed everywhere, including the bottom bar.** The whole tab is hidden, so the remaining tabs space out evenly.
- **Infinite scroll kept.** Hiding YouTube's "load more" trigger had stopped feeds from loading further.
- **End screen hidden on desktop.** The suggestions shown over the player when a video finishes.
- **Renamed** from YT Focus to **rp·tunnel vision**.

### CamelButton

#### 1.0 · 12 September 2026

- First release as a userscript. Adds a 🐪 button next to the price on Amazon product pages, linking to the product on CamelCamelCamel.
- Matches eight Amazon regional domains.
- Retries for up to five seconds while Amazon's page loads.
- A `MutationObserver` rebuilds the button when switching variants changes the ASIN.

Before 1.0 it was built as a Safari App Extension in Xcode, then as a Safari web extension made with `safari-web-extension-converter`. It moved to a userscript because it only needs to run in one browser, and a userscript can be edited without rebuilding anything.
