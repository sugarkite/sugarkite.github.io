// Home page behaviour: the top bar, the trailer (plays while on screen, with a pause button and chapter
// jumps), the renovation viewer (shop tabs and the before/after slider), Pippa's blink and the section
// entrances. Without this script every picture and text is still shown, the trailer has its own
// controls and the slider rests at half.
(function () {
  "use strict";
  var hasIO = "IntersectionObserver" in window;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // the top bar slides in once most of the key art has scrolled away
  var bar = document.querySelector(".bar");
  var hero = document.querySelector(".hero");
  if (bar && hero && hasIO) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("show", entries[0].intersectionRatio < 0.3);
    }, { threshold: [0, 0.3, 1] }).observe(hero);
  }

  // the trailer
  var video = document.querySelector(".screen video");
  if (video) {
    var toggle = document.querySelector(".vid-toggle");
    var chapters = Array.prototype.slice.call(document.querySelectorAll(".chapters button"));
    var userPaused = reduce; // with reduced motion the trailer waits for a press
    video.removeAttribute("controls");
    toggle.hidden = false;
    var sync = function () {
      var playing = !video.paused;
      toggle.classList.toggle("playing", playing);
      toggle.setAttribute("aria-label", toggle.getAttribute(playing ? "data-pause" : "data-play"));
    };
    var mark = function () {
      var t = video.currentTime, current = 0;
      chapters.forEach(function (b, i) { if (t >= parseFloat(b.getAttribute("data-t")) - 0.05) current = i; });
      chapters.forEach(function (b, i) {
        if (i === current) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      });
    };
    var play = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("timeupdate", mark);
    var flip = function () {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    };
    toggle.addEventListener("click", flip);
    video.addEventListener("click", flip);
    chapters.forEach(function (b) {
      b.addEventListener("click", function () {
        video.currentTime = parseFloat(b.getAttribute("data-t"));
        userPaused = false;
        play();
        mark();
      });
    });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !userPaused) play();
          else if (!e.isIntersecting && !video.paused) video.pause();
        });
      }, { threshold: 0.5 }).observe(video);
    }
    sync();
    mark();
  }

  // the renovation viewer
  var viewer = document.querySelector("[data-reno]");
  if (viewer) {
    var plate = viewer.querySelector(".plate");
    var range = viewer.querySelector("input[type=range]");
    var before = viewer.querySelector("img.before");
    var after = viewer.querySelector("img.after");
    var name = viewer.querySelector("[data-shop-name]");
    var where = viewer.querySelector("[data-shop-where]");
    var tabs = Array.prototype.slice.call(viewer.querySelectorAll("[role=tab]"));

    var setSplit = function (v) { plate.style.setProperty("--split", v + "%"); };
    range.addEventListener("input", function () { setSplit(range.value); });
    setSplit(range.value);

    var choose = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      var shop = tab.getAttribute("data-shop");
      var base = viewer.getAttribute("data-base") || "";
      before.src = base + "img/shops/" + shop + "_before.webp";
      after.src = base + "img/shops/" + shop + "_after.webp";
      before.alt = tab.getAttribute("data-alt-before");
      after.alt = tab.getAttribute("data-alt-after");
      name.textContent = tab.textContent;
      where.textContent = tab.getAttribute("data-where");
      plate.classList.remove("swap");
      void plate.offsetWidth;
      plate.classList.add("swap");
      range.value = 50;
      setSplit(50);
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { choose(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); choose(next, true); }
      });
    });
  }

  // Pippa: her blinking idle loop from the game (25 frames at 12 fps, then a pause of 2.5 to 5 s, as on
  // Home), loaded when the cast comes near; a tap makes her meow
  var sprite = document.querySelector(".pippa-sprite");
  if (sprite) {
    var FRAMES = 25, timer = 0;
    var show = function (i) { sprite.style.backgroundPosition = (i * 100 / (FRAMES - 1)) + "% 0"; };
    var blink = function () {
      var i = 0;
      var step = function () {
        if (i < FRAMES) { show(i++); timer = setTimeout(step, 1000 / 12); }
        else { show(0); timer = setTimeout(blink, 2500 + Math.random() * 2500); }
      };
      step();
    };
    var wake = function () {
      if (sprite.classList.contains("ready")) return;
      sprite.classList.add("ready");
      show(0);
      if (!reduce) timer = setTimeout(blink, 1200);
    };
    if (hasIO) {
      var near = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { wake(); near.disconnect(); }
      }, { rootMargin: "600px 0px" });
      near.observe(sprite);
    } else wake();
    var pet = document.querySelector(".pippa-pet");
    pet.addEventListener("click", function () {
      wake();
      clearTimeout(timer);
      sprite.classList.add("meow");
      sprite.style.backgroundPosition = "";
      timer = setTimeout(function () {
        sprite.classList.remove("meow");
        show(0);
        if (!reduce) timer = setTimeout(blink, 1500);
      }, 1400);
    });
  }

  // entrances: each block rises once as it enters
  var targets = document.querySelectorAll("[data-rise], .parcels, .cast, .mark");
  if (!hasIO) {
    each(targets, function (t) { t.classList.add("in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -12% 0px" });
  each(targets, function (t) { io.observe(t); });
})();
