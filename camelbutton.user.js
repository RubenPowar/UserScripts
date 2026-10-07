// ==UserScript==
// @name         CamelButton
// @namespace    https://github.com/yourname/camelbutton
// @version      1.0
// @description  Adds a 🐪 button next to Amazon prices that opens the product on CamelCamelCamel
// @author       you
// @match        *://*.amazon.co.uk/*
// @match        *://*.amazon.com/*
// @match        *://*.amazon.de/*
// @match        *://*.amazon.fr/*
// @match        *://*.amazon.es/*
// @match        *://*.amazon.it/*
// @match        *://*.amazon.ca/*
// @match        *://*.amazon.com.au/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // Extract ASIN from the current URL
  function getASIN() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  // Build the CamelCamelCamel URL
  function getCCCUrl(asin) {
    return `https://uk.camelcamelcamel.com/product/${asin}`;
  }

  // Find the best price element to anchor the button next to
  function findPriceElement() {
    const selectors = [
      '#corePrice_feature_div .a-price .a-offscreen',
      '#price_inside_buybox',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price.aok-align-center .a-offscreen',
      '#apex_offerDisplay_desktop .a-price',
      '#corePriceDisplay_desktop_feature_div .a-price',
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el.closest('.a-price') || el;
    }
    return null;
  }

  function injectButton(asin) {
    // Don't inject twice
    if (document.getElementById('ccc-camel-btn')) return;

    const priceEl = findPriceElement();
    if (!priceEl) return;

    const btn = document.createElement('a');
    btn.id = 'ccc-camel-btn';
    btn.href = getCCCUrl(asin);
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.title = 'View price history on CamelCamelCamel';
    btn.textContent = '🐪';
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      font-size: 22px;
      line-height: 1;
      text-decoration: none;
      vertical-align: middle;
      cursor: pointer;
      border-radius: 6px;
      padding: 2px 5px;
      transition: background 0.15s ease;
      position: relative;
      top: -2px;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(0,0,0,0.07)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    priceEl.insertAdjacentElement('afterend', btn);
  }

  function init() {
    const asin = getASIN();
    if (!asin) return;

    injectButton(asin);

    let attempts = 0;
    const interval = setInterval(() => {
      injectButton(asin);
      attempts++;
      if (attempts >= 10 || document.getElementById('ccc-camel-btn')) {
        clearInterval(interval);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Amazon sometimes swaps ASIN on the same URL (e.g. variant switches) —
  // watch for that and re-run.
  let lastAsin = getASIN();
  const observer = new MutationObserver(() => {
    const currentAsin = getASIN();
    if (currentAsin && currentAsin !== lastAsin) {
      lastAsin = currentAsin;
      document.getElementById('ccc-camel-btn')?.remove();
      init();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
