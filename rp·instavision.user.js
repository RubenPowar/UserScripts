// ==UserScript==
// @name         rp·instavision
// @description  Instagram limited to the people you follow: chronological feed, no ads, no suggestions, no Reels feed, Explore reduced to search
// @version      0.5
// @match        *://www.instagram.com/*
// @run-at       document-start
// @inject-into  content
// @noframes
// ==/UserScript==

// Settings. Edit and save; the change applies on the next load.
const SETTINGS = {
  followingFeed: true,  // home opens the chronological Following feed
  hideAds: true,        // sponsored posts in the feed
  hideSuggested: true,  // suggested posts, and suggested-account blocks
  noReelsFeed: true,    // no endless Reels scroller; a reel someone sends you opens on its own
  inlineVideo: true,    // tapping a video in the feed pauses or plays it instead of opening Reels
  hideReelsNav: true,   // Reels link in the side menu and the bottom bar
  hideExplore: true,    // Explore / search page shows only the search bar
  debug: false          // outline what would be hidden in red instead of hiding it
};

const FOLLOWING_URL = "/?variant=following";

// Instagram's class names are generated and change with every release, so
// nothing here relies on them. Matching is by URL, link targets and the
// visible English labels ("Sponsored", "Follow", "Suggested for you").

// ---------------------------------------------------------------------------
// Redirects. Run before the page draws, and again on every navigation.
// ---------------------------------------------------------------------------

function redirectIfNeeded() {
  const path = location.pathname;

  // /reels/ with no reel in it is the endless scroller. Send it home.
  // /reels/<id>/ (a reel someone sent you) is left to open, with scrolling
  // locked (see lockReelScroll). It used to be redirected to /reel/<id>/,
  // but Instagram sends that straight back to /reels/<id>/, so the two
  // redirects looped.
  if (SETTINGS.noReelsFeed && /^\/reels\/?$/.test(path)) {
    location.replace(SETTINGS.followingFeed ? FOLLOWING_URL : "/");
    return true;
  }

  // The Following feed is Instagram's own chronological feed of accounts you
  // follow, with no recommended posts mixed in.
  if (SETTINGS.followingFeed && path === "/" &&
      new URLSearchParams(location.search).get("variant") !== "following") {
    location.replace(FOLLOWING_URL);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Hiding
// ---------------------------------------------------------------------------

function hide(el, reason) {
  if (!el || el.dataset.rpHidden) return;
  el.dataset.rpHidden = reason;
  if (SETTINGS.debug) {
    el.style.setProperty("outline", "3px solid red", "important");
    el.title = "rp·instavision would hide: " + reason;
  } else {
    el.style.setProperty("display", "none", "important");
  }
}

// Hide an element together with any wrappers that hold nothing else, so a
// removed menu item doesn't leave an empty slot behind.
function hideWithWrappers(el, reason) {
  while (el.parentElement && el.parentElement !== document.body &&
         el.parentElement.childElementCount === 1) {
    el = el.parentElement;
  }
  hide(el, reason);
}

// Elements with no element children whose whole text is exactly `text`.
function leavesWithText(root, text) {
  const out = [];
  for (const el of root.querySelectorAll("span, div, a, h2, h3, h4, button")) {
    if (el.childElementCount === 0 && el.textContent.trim() === text) out.push(el);
  }
  return out;
}

// ---- Feed posts -------------------------------------------------------------

function checkPost(article) {
  if (article.dataset.rpHidden) return;

  // Ads carry a "Sponsored" label under the account name.
  if (SETTINGS.hideAds && leavesWithText(article, "Sponsored").length) {
    hide(article, "sponsored post");
    return;
  }

  if (SETTINGS.hideSuggested) {
    if (leavesWithText(article, "Suggested for you").length ||
        leavesWithText(article, "Suggested posts").length) {
      hide(article, "suggested post");
      return;
    }
    // Posts from accounts you follow never show a Follow button next to the
    // name. One that does is from someone you don't follow.
    const header = article.querySelector("header") || article;
    if (leavesWithText(header, "Follow").length) {
      hide(article, "post from an account you don't follow");
    }
  }
}

// ---- Suggested-account blocks ------------------------------------------------
// The "Suggested for you" list in the right-hand column and the carousels of
// accounts dropped into the feed. Walk up from the heading to the smallest
// block that also holds the list, without ever taking in a post or the feed.

function hideSuggestedAccounts() {
  for (const heading of leavesWithText(document.body, "Suggested for you")) {
    if (heading.closest("article") || heading.closest("[data-rp-hidden]")) continue;
    let box = heading;
    for (let i = 0; i < 8 && box.parentElement; i++) {
      const parent = box.parentElement;
      if (parent === document.body || parent.tagName === "MAIN" ||
          parent.querySelector("article")) break;
      box = parent;
      if (box.querySelector('a[href*="/explore/people"]') ||
          leavesWithText(box, "Follow").length >= 2) break;
    }
    hide(box, "suggested accounts");
  }
}

// ---- Reels menu item ---------------------------------------------------------

function hideReelsLinks() {
  for (const a of document.querySelectorAll('a[href="/reels/"]')) {
    hideWithWrappers(a, "Reels menu item");
  }
}

// ---- Explore / search page ----------------------------------------------------
// On a phone /explore/ is the search page: a search box above a grid of
// recommended posts and reels. On a computer it's only the grid (search is a
// side panel). Keep the search box and the results of a search, and remove
// every block that holds a post or reel.
//
// Search results link to profiles (/<name>/) and tags (/explore/tags/...),
// never to posts or reels, so "contains a post or reel link" separates the
// recommendations from the search reliably.

const CONTENT_LINK = 'a[href*="/p/"], a[href*="/reel/"], a[href*="/reels/"]';

function isExplorePage() {
  return /^\/explore\/?$/.test(location.pathname);
}

function hideExploreGrid() {
  const main = document.querySelector("main") || document.body;
  const input = main.querySelector("input");

  if (input) {
    // Walk from the search box up to <main>. At each level, hide every
    // neighbouring block that holds a post or reel.
    for (let el = input; el && el !== main; el = el.parentElement) {
      for (const sib of el.parentElement ? el.parentElement.children : []) {
        if (sib !== el && !sib.dataset.rpHidden && sib.matches(`${CONTENT_LINK}, :has(${CONTENT_LINK})`)) {
          hide(sib, "Explore content");
        }
      }
    }
  } else {
    // No search box on the page (a computer): nothing in <main> is wanted.
    for (const child of main.children) {
      if (!child.classList.contains("rp-ig-message") && child.querySelector(CONTENT_LINK)) {
        hide(child, "Explore content");
      }
    }
  }

  if (!SETTINGS.debug) placeExploreMessage(main);
}

// One "Focus, Ruben!" on the page, a fixed distance below the search bar.
//
// It's positioned by measuring the search bar on screen rather than by where
// it sits in the page's structure: the block holding the search bar also
// holds the (now empty) space where the grid was, so "after the search bar's
// block" lands near the bottom of the page. Runs on every scan and on resize,
// because the search bar can load or move after the first one. The check is
// page-wide, so even two copies of the script running at once produce one.
const MESSAGE_GAP = 32;

function searchBarRect(main) {
  const input = main.querySelector("input") ||
                document.querySelector('input[placeholder*="Search" i], input[type="search"]');
  if (!input) return null;
  // The rounded bar drawn around the box: the widest wrapper that is still
  // about the height of the box itself.
  let bar = input;
  const h = input.getBoundingClientRect().height;
  while (bar.parentElement && bar.parentElement !== main && bar.parentElement !== document.body &&
         bar.parentElement.getBoundingClientRect().height <= h + 40) {
    bar = bar.parentElement;
  }
  const r = bar.getBoundingClientRect();
  return r.width && r.height ? r : null;
}

function placeExploreMessage(main) {
  const all = document.querySelectorAll(".rp-ig-message");
  all.forEach((m, i) => { if (i > 0) m.remove(); });
  let msg = all[0];
  if (!msg) {
    msg = document.createElement("div");
    msg.className = "rp-ig-message";
    msg.textContent = "Focus, Ruben!";
    msg.style.cssText = "position:absolute;z-index:1;pointer-events:none;text-align:center;" +
      "font-size:15px;color:#737373;font-family:-apple-system,BlinkMacSystemFont,sans-serif;";
    document.body.appendChild(msg);
  }

  const r = searchBarRect(main) || main.getBoundingClientRect();
  const top = (searchBarRect(main) ? r.bottom + MESSAGE_GAP : r.top + 40) + window.scrollY;
  msg.style.top = `${Math.round(top)}px`;
  msg.style.left = `${Math.round(r.left + window.scrollX)}px`;
  msg.style.width = `${Math.round(r.width)}px`;
}

window.addEventListener("resize", () => {
  if (SETTINGS.hideExplore && !SETTINGS.debug && isExplorePage()) {
    placeExploreMessage(document.querySelector("main") || document.body);
  }
});

// ---------------------------------------------------------------------------
// Videos in the feed: tap to pause or play, never open the Reels viewer
// ---------------------------------------------------------------------------
// Instagram opens the Reels viewer when you tap a video in the feed. This
// listens on window in the capture phase, so it runs before Instagram's own
// handlers, and when the tap lands on a video inside a feed post it stops the
// tap from going any further and toggles the video instead. Taps on buttons
// over the video (sound, tags) still go through.

const VIDEO_CONTROL = /audio|mute|sound|volume|tag/i;

function videoUnderPoint(article, x, y) {
  for (const video of article.querySelectorAll("video")) {
    const r = video.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return video;
  }
  return null;
}

function isVideoControl(target, article) {
  for (let el = target; el && el !== article; el = el.parentElement) {
    if (VIDEO_CONTROL.test(el.getAttribute("aria-label") || "")) return true;
    if (el.tagName === "BUTTON") return true;
  }
  return false;
}

function onFeedClick(e) {
  if (!SETTINGS.inlineVideo || e.button !== 0) return;
  const article = e.target.closest && e.target.closest("article");
  if (!article) return;
  const video = videoUnderPoint(article, e.clientX, e.clientY);
  if (!video || isVideoControl(e.target, article)) return;

  e.preventDefault();
  e.stopImmediatePropagation();
  if (video.paused) video.play().catch(() => {});
  else video.pause();
}

// ---------------------------------------------------------------------------
// A reel opened on its own page: no scrolling on to the next one
// ---------------------------------------------------------------------------
// A reel someone sends you opens at /reels/<id>/, inside the same scroller
// as the Reels tab. Block the wheel, swipes and arrow keys there, and hide
// the up and down buttons, so it shows that one reel and stops.

function isReelPage() {
  return /^\/reels?\/[A-Za-z0-9_-]+\/?$/.test(location.pathname);
}

const REEL_NAV_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "j", "k"]);

function lockReelScroll() {
  const block = e => {
    if (SETTINGS.noReelsFeed && isReelPage()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  window.addEventListener("wheel", block, { capture: true, passive: false });
  window.addEventListener("touchmove", block, { capture: true, passive: false });
  window.addEventListener("keydown", e => {
    if (REEL_NAV_KEYS.has(e.key) && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) &&
        !e.target.isContentEditable) block(e);
  }, { capture: true });
}

function hideReelNavButtons() {
  for (const el of document.querySelectorAll("[aria-label]")) {
    if (/^(go to |navigate to )?(next|previous)\b/i.test(el.getAttribute("aria-label"))) {
      hide(el.closest("button, [role='button']") || el, "next / previous reel button");
    }
  }
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

function scan() {
  if (SETTINGS.hideReelsNav) hideReelsLinks();
  if (SETTINGS.hideAds || SETTINGS.hideSuggested) {
    document.querySelectorAll("article").forEach(checkPost);
  }
  if (SETTINGS.hideSuggested) hideSuggestedAccounts();
  if (SETTINGS.hideExplore && isExplorePage()) hideExploreGrid();
  if (SETTINGS.noReelsFeed && isReelPage()) hideReelNavButtons();
}

let scanQueued = false;
function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  setTimeout(() => { scanQueued = false; scan(); }, 150);
}

function start() {
  // Hide the Reels link before first paint, so it never flashes up.
  // Hide the Reels link, and every post and reel tile on Explore, before
  // first paint, so they never flash up while the script finds their blocks.
  if (!SETTINGS.debug) {
    const style = document.createElement("style");
    style.textContent =
      (SETTINGS.hideReelsNav ? 'a[href="/reels/"] { display: none !important; }\n' : "") +
      (SETTINGS.hideExplore ? `html.rp-ig-explore main :is(${CONTENT_LINK}) { display: none !important; }` : "");
    document.documentElement.appendChild(style);
  }
  const markPage = () => document.documentElement.classList.toggle("rp-ig-explore", isExplorePage());
  markPage();

  window.addEventListener("click", onFeedClick, true);
  lockReelScroll();

  // Instagram builds the page, and every post, after load.
  new MutationObserver(queueScan).observe(document.documentElement, {
    childList: true, subtree: true
  });

  // Instagram is a single-page app: moving around changes the URL without
  // loading a new page. Check for that and redirect or re-scan as needed.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    if (redirectIfNeeded()) return;
    markPage();
    if (!isExplorePage()) document.querySelectorAll(".rp-ig-message").forEach(e => e.remove());
    queueScan();
  }, 300);

  queueScan();
}

// Entry point. Kept at the end of the file so every constant above exists
// before anything runs.
// At document-start the page can be so new it has no <html> element yet;
// wait for it before adding styles and observers.
function whenRootExists(fn) {
  if (document.documentElement) return fn();
  new MutationObserver((_, obs) => {
    if (document.documentElement) { obs.disconnect(); fn(); }
  }).observe(document, { childList: true });
}

if (!redirectIfNeeded()) whenRootExists(start);