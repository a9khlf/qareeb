// Qareeb motion layer.
//   Lenis        smooth scrolling for the whole student site
//   GSAP         entrance and scroll animations (ScrollTrigger)
//   React Bits   SplitText (headings) and ShinyText (small line above the headline)
//
// The site's own wording is still written by app.js into the [data-i18n] spans, so staff edits and the
// English/Arabic switch keep working. This file only reads that text and shows it with an effect.
// If this file fails to load, the plain text stays visible and the site works exactly as before.
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import SplitText from "./rb/SplitText.jsx";
import ShinyText from "./rb/ShinyText.jsx";

gsap.registerPlugin(ScrollTrigger);

(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body = document.body;

  // ---------- React Bits: text effects ----------
  // Markup: <h1 data-fx="split-load"><span class="fxsrc" data-i18n="key">text</span></h1>
  // app.js writes the (English or Arabic) text into .fxsrc; we show the same text in .fxhost with the effect.
  function mountText(parent, render) {
    var src = parent.querySelector(".fxsrc");
    if (!src) return;
    var host = document.createElement("span");
    host.className = "fxhost";
    host.setAttribute("aria-hidden", "true");
    parent.appendChild(host);
    var reactRoot = createRoot(host);
    var last = null;
    function paint() {
      var text = (src.textContent || "").trim();
      if (!text || text === last) return;
      last = text;
      flushSync(function () { reactRoot.render(render(text)); });
      parent.classList.add("fx-on");
    }
    new MutationObserver(paint).observe(src, { childList: true, characterData: true, subtree: true });
    paint();
  }

  document.querySelectorAll("[data-fx]").forEach(function (el) {
    var kind = el.getAttribute("data-fx");
    if (kind === "split-load") {
      // Words only: splitting Arabic into single letters would break how the letters join.
      mountText(el, function (text) {
        return <SplitText text={text} tag="span" splitType="words" effect="blur" trigger="load"
          textAlign="start" delay={70} duration={1.1} rootMargin="0px" />;
      });
    } else if (kind === "split-view") {
      mountText(el, function (text) {
        return <SplitText text={text} tag="span" splitType="words" effect="blur" trigger="view"
          textAlign="start" delay={60} duration={0.9} rootMargin="-60px" />;
      });
    } else if (kind === "shiny") {
      mountText(el, function (text) {
        return <ShinyText text={text} color="#d9bd7a" shineColor="#fff7dc" speed={2.6} delay={3.5}
          shineWidth={34} softness={0.9} />;
      });
    }
  });

  if (reduce) return;   // people who asked for less motion get the page without scroll animation

  // ---------- Lenis: smooth scrolling ----------
  var lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    anchors: { offset: -84 },   // same gap under the sticky bar as the CSS scroll-margin
    // Let these scroll or zoom by themselves instead of moving the page.
    prevent: function (node) {
      return !!(node.closest && node.closest(".sheet, .track, .combo-list, .leaflet-container, textarea"));
    }
  });
  window.qareebLenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // app.js locks the page behind a room window with body overflow hidden: pause smooth scroll meanwhile.
  function syncLock() {
    if (body.style.overflow === "hidden") lenis.stop(); else lenis.start();
  }
  new MutationObserver(syncLock).observe(body, { attributes: true, attributeFilter: ["style"] });

  // ---------- GSAP: entrance and scroll animations ----------
  var ease = "power3.out";

  // Top of the page: the rest of the hero settles in after the headline starts.
  gsap.from(".hero .lead", { y: 18, opacity: 0, duration: 0.9, ease: ease, delay: 0.55, clearProps: "opacity,transform" });
  gsap.from(".searchcard", { y: 36, opacity: 0, duration: 1, ease: ease, delay: 0.7, clearProps: "opacity,transform" });
  gsap.to(".hero .wrap", {
    yPercent: 14, opacity: 0.35, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  // Sections further down.
  gsap.utils.toArray(".values li").forEach(function (li, i) {
    gsap.from(li, {
      y: 22, opacity: 0, duration: 0.7, ease: ease, delay: i * 0.08, clearProps: "opacity,transform",
      scrollTrigger: { trigger: ".values", start: "top 88%", once: true }
    });
  });
  gsap.from(".steps li", {
    y: 40, opacity: 0, duration: 0.8, ease: ease, stagger: 0.12, clearProps: "opacity,transform",
    scrollTrigger: { trigger: ".steps", start: "top 85%", once: true }
  });
  gsap.from("footer .wrap", {
    y: 24, opacity: 0, duration: 0.8, ease: ease, clearProps: "opacity,transform",
    scrollTrigger: { trigger: "footer", start: "top 96%", once: true }
  });

  // Room cards: app.js rebuilds the grid on every search, so each new set of cards rises into place as it scrolls into view.
  var grid = document.getElementById("grid");
  var cardQueued = false;
  function revealCards() {
    cardQueued = false;
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card")).filter(function (c) { return !c.dataset.rise; });
    if (!cards.length) return;
    cards.forEach(function (c) { c.dataset.rise = "1"; });
    gsap.set(cards, { opacity: 0, y: 30 });
    ScrollTrigger.batch(cards, {
      start: "top 94%", once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: ease, stagger: 0.09, overwrite: true, clearProps: "opacity,transform" });
      }
    });
    // Safety net: a card that is on screen but still hidden a few seconds later gets shown (cards further down wait for scrolling).
    setTimeout(function () {
      cards.forEach(function (c) {
        if (!c.isConnected || getComputedStyle(c).opacity !== "0") return;
        var r = c.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) gsap.to(c, { opacity: 1, y: 0, duration: 0.4, clearProps: "opacity,transform" });
      });
    }, 3500);
  }
  if (grid) {
    new MutationObserver(function () {
      if (cardQueued) return;
      cardQueued = true;
      requestAnimationFrame(revealCards);
    }).observe(grid, { childList: true });
    revealCards();
  }

  // Room windows glide up instead of appearing.
  ["modal", "pinModal", "resModal"].forEach(function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    var sheet = m.querySelector(".sheet");
    new MutationObserver(function () {
      if (m.hidden || !sheet) return;
      gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.out", clearProps: "opacity" });
      gsap.fromTo(sheet, { y: 48, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.5, ease: ease, clearProps: "opacity,transform" });
    }).observe(m, { attributes: true, attributeFilter: ["hidden"] });
  });

  // Lay everything out again once fonts and images have settled, so scroll triggers sit in the right place.
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
