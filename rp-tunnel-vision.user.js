// ==UserScript==
// @name         rp·tunnel vision
// @description  Block YouTube distractions (userscript port of the Safari extension)
// @version      1.8
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @run-at       document-start
// @inject-into  content
// @noframes
// ==/UserScript==
 
// Settings. The Safari extension exposes these as switches in its popup;
// here they are fixed. Edit and save; the change applies on the next load.
const SETTINGS = {
  comments: true,   // hide comment sections and live chat
  suggested: true,  // Shorts, suggestions, action buttons, top bar, sidebar menu
  homepage: true    // search-only home page
};
 
const isMobile = window.location.hostname === "m.youtube.com";
 
function getPageType() {
  const p = location.pathname;
  if (p === "/" || p === "") return "home";
  if (p.startsWith("/watch")) return "video";
  if (p.startsWith("/shorts")) return "shorts";
  if (p.startsWith("/feed/subscriptions")) return "subscriptions";
  if (p.startsWith("/feed")) return "feed";
  return "other";
}
 
const DESKTOP_RULES = {
  comments: `
    ytd-comments#comments,
    ytd-item-section-renderer:has(ytd-comments),
    #below ytd-item-section-renderer:last-child { display: none !important; }
    /* Live chat. YouTube moves #chat-container depending on layout: into
       #secondary-inner on a wide window, under the video in #primary #below
       on a narrow one, and straight into #columns in theatre mode. Match it
       wherever it is. */
    ytd-watch-flexy #chat-container,
    ytd-live-chat-frame#chat,
    /* The "Live chat / Open panel" teaser card beside the description, and
       its comments equivalent. Hiding it lets the description fill the row. */
    ytd-watch-metadata #teaser-carousel:has([aria-label="Live chat" i]),
    ytd-watch-metadata #teaser-carousel:has([aria-label^="Comments" i]),
    ytd-watch-metadata #comment-teaser { display: none !important; }
    /* In theatre mode YouTube reserves a 550px slot beside the player for the
       chat (#panels-full-bleed-container). With the chat hidden the slot is
       left empty and the video is squeezed into what remains. Drop the slot
       unless something other than the chat is in it, so an Ask or transcript
       panel opened there still shows. See nudgePlayer for the resize. */
    ytd-watch-flexy #panels-full-bleed-container:not(:has(> :not(#chat-container))) { display: none !important; }
    /* YouTube's "fixed panel" layout (an experiment; ytd-watch-flexy gets
       [using-fixed-panel]). The chat floats over the right edge, and to keep
       it off the video YouTube adds an invisible block of the same width to
       the row (#columns::after, or #secondary-split-scroll-spacer in some
       variants), so the video stops short and leaves a gap. With the chat
       hidden, drop the block, and switch off the empty panel host, which
       would otherwise sit over the widened video and catch clicks. Only when
       no panel is open, so Ask or a transcript still shows (the ads
       panel, hidden below, doesn't count). Variants that put
       suggestions in that panel ([fixed-panel-watch-next]) are left alone. */
    ytd-watch-flexy[using-fixed-panel]:not([fixed-panel-watch-next]):not(:has(ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]:not([target-id="engagement-panel-ads"]))) #columns::after,
    ytd-watch-flexy[using-fixed-panel]:not([fixed-panel-watch-next]):not(:has(ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]:not([target-id="engagement-panel-ads"]))) #secondary-split-scroll-spacer { display: none !important; }
    ytd-watch-flexy[using-fixed-panel]:not([fixed-panel-watch-next]):not(:has(ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]:not([target-id="engagement-panel-ads"]))) #secondary { visibility: hidden !important; pointer-events: none !important; }
  `,
  // Hides what's *in* the sidebar rather than the sidebar itself, so the
  // Ask (Gemini) panel can still open there.
  suggested: `
    /* Shorts, everywhere. */
    ytd-rich-section-renderer:has(#title-text),
    ytd-rich-section-renderer:has(a[href*="/shorts/"]),
    ytd-reel-shelf-renderer, ytd-shorts, ytd-reel-item-renderer,
    ytd-guide-entry-renderer:has(a[href*="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href*="/shorts"]),
    ytd-video-renderer:has(a[href*="/shorts/"]),
    ytd-rich-item-renderer:has(a[href*="/shorts/"]) { display: none !important; }
    /* Sidebar and end-screen suggestions. */
    #secondary #related,
    ytd-watch-next-secondary-results-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="ytbc-related-shelf"],
    ytd-playlist-panel-renderer,
    #secondary #donation-shelf,
    .ytp-endscreen-content,
    .html5-endscreen,
    .videowall-endscreen,
    .ytp-ce-element,
    .ytp-autonav-endscreen-upnext-container,
    /* Suggestions drawn inside the player itself, at the end of a video and
       on pause. The end-of-video grid (.ytp-fullscreen-grid) is an overlay
       that does not contain the <video>, so hiding it leaves the last frame
       and the controls in place. */
    .ytp-fullscreen-grid,
    .ytp-modern-endscreen-content,
    .ytp-modern-videowall-still,
    .ytp-videowall-still,
    .ytp-upnext,
    .ytp-autonav-endscreen-countdown-overlay,
    .ytp-autonav-suggestion-card,
    .ytp-pause-overlay,
    .ytp-pause-overlay-container,
    .ytp-pause-overlay-backdrop,
    .ytp-more-videos-view,
    .ytp-more-videos-view-container,
    .ytp-more-videos-button,
    .ytp-suggestions,
    .ytp-suggestion-panel,
    .ytp-suggestions-container,
    .ytp-related-on-error-overlay,
    [class*="ytwPlayerEndscreen"] { display: none !important; }
    /* Collapse the column when nothing is left in it (see watchSidebar) */
    ytd-watch-flexy #secondary:has(> #secondary-inner.rp-tv-empty) {
      width: 0 !important; min-width: 0 !important;
      padding: 0 !important; overflow: hidden !important;
    }
    /* In theatre mode YouTube keeps a sponsored panel open in the sidebar
       (engagement-panel-ads). It counts as content, so the column never reads
       as empty. Hide it. */
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    #secondary #player-ads { display: none !important; }
    /* Also in theatre mode ([fixed-panels]) YouTube pads the row under the
       player on the right by a sidebar's width, keeping room for a panel,
       which narrows the title and description. Give it back when the column
       is empty; the padding returns as soon as a panel opens. */
    ytd-watch-flexy:has(#secondary-inner.rp-tv-empty) #columns { padding-right: 0 !important; }
    /* With the column gone the player fills the page, and the ambient-mode
       glow (#cinematics), which extends well past the player on every side,
       spills off the right edge and, once comments are hidden, below the
       content too, adding empty scroll space. Clip it at the watch page's
       box; clip is not a scroll container, so sticky positioning is
       unaffected. */
    ytd-watch-flexy { overflow: clip !important; }
    /* Under-video action bar: Share, Save and the "..." menu go; the
       like/dislike pill becomes a plain like count (YouTube exposes no
       dislike count, so that button is removed rather than converted). */
    #top-level-buttons-computed yt-button-view-model:has(button[aria-label^="Share" i]),
    #top-level-buttons-computed ytd-button-renderer:has([aria-label^="Share" i]),
    #flexible-item-buttons yt-button-view-model:has(button[aria-label^="Save" i]),
    #flexible-item-buttons ytd-button-renderer:has([aria-label^="Save" i]),
    ytd-watch-metadata ytd-menu-renderer yt-icon-button#button,
    ytd-watch-metadata ytd-menu-renderer > yt-button-shape,
    segmented-like-dislike-button-view-model dislike-button-view-model,
    segmented-like-dislike-button-view-model yt-light-shape,
    segmented-like-dislike-button-view-model like-button-view-model yt-touch-feedback-shape { display: none !important; }
    segmented-like-dislike-button-view-model { pointer-events: none !important; }
    segmented-like-dislike-button-view-model like-button-view-model button {
      background: transparent !important; border-radius: 0 !important; padding-left: 0 !important;
    }
    /* Masthead: Create and Notifications. */
    ytd-masthead ytd-notification-topbar-button-renderer,
    ytd-masthead #buttons ytd-topbar-menu-button-renderer:has([aria-label^="Create" i]),
    ytd-masthead #buttons ytd-button-renderer:has([aria-label^="Create" i]),
    ytd-masthead #buttons yt-button-shape:has(button[aria-label^="Create" i]) { display: none !important; }
    /* Left guide (burger menu): keep only the You and Subscriptions sections,
       which are the two with a clickable header entry. */
    #sections.ytd-guide-renderer > ytd-guide-section-renderer:not(:has(#header ytd-guide-entry-renderer)),
    #sections.ytd-guide-renderer > ytd-guide-signin-promo-renderer,
    #footer.ytd-guide-renderer { display: none !important; }
  `,
  homepage: `
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] yt-chip-cloud-renderer { display: none !important; }
    ytd-browse[page-subtype="home"] #primary::before {
      content: "Focus, Ruben!"; display: block; text-align: center;
      padding: 80px 20px; font-size: 16px; color: #717171; font-family: Roboto, sans-serif;
    }
  `
};
 
// With suggestions hidden, the right-hand column is empty unless the user
// opens a panel (Ask, transcript, chapters). Mark #secondary-inner empty when
// it has no height so CSS can collapse the column, and un-collapse it the
// moment a panel opens. The column is collapsed with width: 0 rather than
// display: none so its contents keep a measurable height.
let sidebarObserver = null;
let observedInner = null;
 
// Judge emptiness by what's inside the column, not the column's own height.
// On a livestream Safari gives #secondary-inner a height of its own (room
// reserved for the chat) even with every child hidden, so measuring the
// container reports content where there is none.
function sidebarIsEmpty(inner) {
  return [...inner.children].every(c => c.getBoundingClientRect().height < 1);
}

function watchSidebar() {
  if (isMobile) return;
  const inner = document.querySelector("ytd-watch-flexy #secondary-inner");
  if (!inner) return;
  // A ResizeObserver only reports changes. If the column is already empty on
  // first paint (a livestream, where the chat is the only thing in it and is
  // hidden from the start) its size never changes and the callback never
  // runs, so the column is never collapsed. Check on every tick as well.
  inner.classList.toggle("rp-tv-empty", sidebarIsEmpty(inner));
  if (inner === observedInner) return;
  if (sidebarObserver) sidebarObserver.disconnect();
  observedInner = inner;
  sidebarObserver = new ResizeObserver(() => {
    inner.classList.toggle("rp-tv-empty", sidebarIsEmpty(inner));
  });
  sidebarObserver.observe(inner);
}
 
// The player sizes its video and controls with JavaScript, recalculating on a
// window resize. When CSS takes away the chat slot or the sidebar, the player's
// box grows but the video inside stays at the old size until something resizes
// the window. Send a resize whenever either of those changes.
let lastLayout = "";

function nudgePlayer() {
  if (isMobile) return;
  const flexy = document.querySelector("ytd-watch-flexy");
  if (!flexy) return;
  const panels = flexy.querySelector("#panels-full-bleed-container");
  const inner = flexy.querySelector("#secondary-inner");
  const layout = [
    flexy.hasAttribute("theater"),
    panels ? panels.offsetWidth === 0 : null,
    inner ? inner.classList.contains("rp-tv-empty") : null
  ].join("|");
  if (layout === lastLayout) return;
  lastLayout = layout;
  window.dispatchEvent(new Event("resize"));
}

// Applied on every mobile page; see clampWatchScroll for what sets the class.
const MOBILE_SCROLL_LOCK_CSS = `
  .rp-tv-locked { overflow: hidden !important; overscroll-behavior: none !important; }
  html.rp-tv-locked > body { overflow: hidden !important; }
`;
 
function getMobileCSS(settings, pageType) {
  let css = MOBILE_SCROLL_LOCK_CSS;
 
  if (settings.suggested) {
    css += `
      ytm-rich-section-renderer:has(ytm-shorts-lockup-view-model),
      ytm-shorts-lockup-view-model,
      ytm-reel-shelf-renderer,
      ytm-reel-item-renderer,
      ytm-pivot-bar-item-renderer:has(.pivot-shorts) { display: none !important; }
    `;
  }
 
  if (settings.comments && pageType === "video") {
    css += `
      yt-comment-input-box-carousel-item-view-model,
      yt-carousel-item-view-model,
      yt-carousel-title-view-model,
      yt-text-carousel-item-view-model,
      yt-video-metadata-carousel-view-model { display: none !important; }
    `;
  }
 
  if (settings.suggested && pageType === "video") {
    css += `
      ytm-item-section-renderer:has(ytm-video-with-context-renderer),
      ytm-video-with-context-renderer,
      ytm-related-chip-cloud-renderer { display: none !important; }
      /* The suggestions under the video load lazily, and the sections that
         hold them reserve their height before anything arrives in them. The
         rules above only match a section once it has a video inside, so an
         unfilled section keeps its reserved height and the page ends up with
         a long scroll range containing nothing. That empty range is what lets
         the title slide up behind the pinned player. Take the height away:
         hide the sections that are still empty and the infinite-scroll
         continuation, and stop any of them reserving space. */
      ytm-item-section-renderer:has(ytm-compact-video-renderer),
      ytm-item-section-renderer:has(ytm-continuation-item-renderer),
      ytm-watch ytm-item-section-renderer:not(:has(*)),
      ytm-continuation-item-renderer,
      ytm-companion-slot { display: none !important; }
      ytm-watch ytm-item-section-renderer,
      ytm-single-column-watch-next-results-renderer {
        min-height: 0 !important; height: auto !important;
      }
    `;
  }
 
  if (settings.homepage && pageType === "home") {
    css += `
      ytm-rich-grid-renderer,
      ytm-rich-item-renderer,
      ytm-rich-section-renderer,
      ytm-feed-filter-chip-bar-renderer { display: none !important; }
    `;
  }
 
 
  return css;
}
 
// On the mobile watch page the player is pinned to the top and everything
// below it scrolls underneath. That is right on an untouched video, where
// there is a page of comments and suggestions to scroll through. With those
// gone the only things left are the title, the action bar and the message,
// and any leftover scroll range does nothing except slide the title out of
// sight behind the player. The CSS above removes the reserved height that
// causes most of it; this is the backstop. When what remains fits on one
// screen the scroll container is pinned at the top and locked, and it is
// released again the moment something taller appears (a description sheet, a
// panel, a setting turned off).
let lockedScroller = null;
 
function findScroller() {
  const anchor = document.querySelector("ytm-slim-video-action-bar-renderer") ||
                 document.querySelector("ytm-watch");
  for (let el = anchor; el && el !== document.documentElement; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return document.scrollingElement || document.documentElement;
}
 
function unlockScroller() {
  if (!lockedScroller) return;
  lockedScroller.classList.remove("rp-tv-locked");
  lockedScroller = null;
}
 
function clampWatchScroll() {
  if (!isMobile) return;
  if (getPageType() !== "video" || !(SETTINGS.suggested || SETTINGS.comments)) {
    unlockScroller();
    return;
  }
  // An open panel or sheet (description, chapters, share) brings back real
  // content and its own scrolling; stay out of the way.
  if (document.querySelector(
      '[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"],' +
      "ytm-sheet-view-model, tp-yt-paper-dialog[opened], ytm-fullscreen-engagement-panel")) {
    unlockScroller();
    return;
  }
 
  // The message is injected immediately after the action bar, so it is the
  // last thing on the page that is meant to be visible.
  const last = document.querySelector(".rp-tv-message") ||
               document.querySelector("ytm-slim-video-action-bar-renderer");
  if (!last) return;
 
  const scroller = lockedScroller || findScroller();
  if (!scroller) return;
  const isDoc = scroller === (document.scrollingElement || document.documentElement);
  const scrollTop = isDoc ? window.scrollY : scroller.scrollTop;
  const contentBottom = last.getBoundingClientRect().bottom + scrollTop;
 
  if (contentBottom > 0 && contentBottom <= window.innerHeight) {
    if (scrollTop > 0) {
      if (isDoc) window.scrollTo(0, 0);
      else scroller.scrollTop = 0;
    }
    if (!lockedScroller) {
      scroller.classList.add("rp-tv-locked");
      lockedScroller = scroller;
    }
  } else {
    unlockScroller();
  }
}
 
let styleEl = null;
 
function applyRules(settings) {
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "rp-tunnel-vision-styles";
    document.documentElement.appendChild(styleEl);
  }
 
  if (isMobile) {
    styleEl.textContent = getMobileCSS(settings, getPageType());
  } else {
    let css = "";
    for (const [key, rule] of Object.entries(DESKTOP_RULES)) {
      if (settings[key]) css += rule;
    }
    styleEl.textContent = css;
  }
 
  if (isMobile) {
    let attempts = 0;
    function injectMessage() {
      attempts++;
      if (attempts > 20) return;
      document.querySelectorAll(".rp-tv-message").forEach(e => e.remove());
 
      const pageType = getPageType();
 
      if (pageType === "video") {
        const actionBar = document.querySelector("ytm-slim-video-action-bar-renderer");
        if (actionBar) {
          const div = document.createElement("div");
          div.className = "rp-tv-message";
          div.textContent = "Focus, Ruben!";
          div.style.cssText = `display:block!important;text-align:center;padding:24px 20px;font-size:15px;color:#717171;font-family:Roboto,sans-serif;border-top:1px solid #e5e5e5;`;
          actionBar.insertAdjacentElement("afterend", div);
          return;
        }
      }
 
      if (pageType === "home" && settings.homepage) {
        const div = document.createElement("div");
        div.className = "rp-tv-message";
        div.textContent = "Focus, Ruben!";
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        div.style.cssText = `position:fixed!important;top:56px!important;left:0!important;right:0!important;text-align:center!important;padding:32px 20px!important;font-size:15px!important;color:#717171!important;font-family:Roboto,sans-serif!important;pointer-events:none!important;z-index:9999!important;background:${isDark ? "#0f0f0f" : "#ffffff"}!important;`;
        document.body.appendChild(div);
        return;
      }
 
      setTimeout(injectMessage, 500);
    }
    setTimeout(injectMessage, 500);
  }
}
 
function init() {
  applyRules(SETTINGS);
}
 
let lastUrl = location.href;
setInterval(() => {
  watchSidebar();
  nudgePlayer();
  clampWatchScroll();
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    unlockScroller();
    document.querySelectorAll(".rp-tv-message").forEach(e => e.remove());
    setTimeout(init, 300);
  }
}, 300);
 
const observer = new MutationObserver(() => {
  if (styleEl && !document.getElementById("rp-tunnel-vision-styles")) {
    document.documentElement.appendChild(styleEl);
  }
});
observer.observe(document.documentElement, { childList: true, subtree: false });
 
init();
 