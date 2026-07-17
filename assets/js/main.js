/* Shared site behavior: nav, mobile menu, scroll reveal, security hardening. */
(function () {
  "use strict";

  // ---- Security: force noopener/noreferrer on every external link ----
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    a.rel = 'noopener noreferrer';
  });

  // ---- Security: prevent the page from being framed (clickjacking defence) ----
  if (window.top !== window.self) {
    try { window.top.location = window.self.location; } catch (e) { /* cross-origin, ignore */ }
  }

  // ---- Mobile menu ----
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Active nav link (marks the current page) ----
  // Resolves each link's href against the current URL so this works whether
  // the site is opened via file:// (relative paths) or served over http.
  function normalizePath(pathname) {
    return pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  }
  var currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href) return;
    try {
      var resolved = normalizePath(new URL(href, window.location.href).pathname);
      if (resolved === currentPath) { a.classList.add('active'); }
    } catch (e) { /* ignore malformed URLs */ }
  });

  // ---- Scroll reveal ----
  // Stagger delay resets per sibling-group (e.g. per grid/list) rather than
  // globally, so each row of cards fans in together instead of inheriting a
  // delay based on its position in the whole document.
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var siblingIndex = new WeakMap();
    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var count = siblingIndex.get(parent) || 0;
      el.style.transitionDelay = Math.min(count, 5) * 0.08 + 's';
      siblingIndex.set(parent, count + 1);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Back to top ----
  var backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', function () {
      backToTop.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Image fallback (avoids inline onerror, which the CSP blocks) ----
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    img.addEventListener('error', function () {
      var fallback = img.getAttribute('data-fallback');
      if (fallback && img.src !== fallback) { img.src = fallback; }
    }, { once: true });
  });

  // ---- Boot loader (home page only, once per browser session) ----
  var bootLoader = document.getElementById('bootLoader');
  if (bootLoader) {
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var alreadyPlayed = false;
    try { alreadyPlayed = sessionStorage.getItem('bootPlayed') === '1'; } catch (e) { /* storage blocked, treat as not played */ }

    if (alreadyPlayed || reducedMotion) {
      bootLoader.remove();
    } else {
      document.body.classList.add('boot-lock');
      var bootCmd = document.getElementById('bootCmd');
      var bootStatus1 = document.getElementById('bootStatus1');
      var bootStatus2 = document.getElementById('bootStatus2');
      var command = 'boot --profile subhodeep';
      var charIndex = 0;

      function typeNext() {
        bootCmd.textContent = command.slice(0, charIndex);
        charIndex++;
        if (charIndex <= command.length) {
          setTimeout(typeNext, 28);
        } else {
          bootStatus1.classList.add('show');
          setTimeout(function () {
            bootStatus2.classList.add('show');
            setTimeout(finishBoot, 700);
          }, 380);
        }
      }

      function finishBoot() {
        bootLoader.classList.add('boot-done');
        document.body.classList.remove('boot-lock');
        try { sessionStorage.setItem('bootPlayed', '1'); } catch (e) { /* ignore */ }
        setTimeout(function () { bootLoader.remove(); }, 650);
      }

      setTimeout(typeNext, 260);
    }
  }

  // ---- Custom cursor ----
  // Only for pointer-fine devices that don't ask for reduced motion; body
  // only gets cursor:none once this JS confirms it can actually draw one.
  var wantsCustomCursor =
    window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cursorDot = document.getElementById('cursorDot');
  var cursorRing = document.getElementById('cursorRing');
  if (wantsCustomCursor && cursorDot && cursorRing) {
    document.body.classList.add('custom-cursor');
    var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
    var ringX = mouseX, ringY = mouseY;
    var started = false;

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px) translate(-50%,-50%)';
      if (!started) { ringX = mouseX; ringY = mouseY; started = true; }
    });

    (function loop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseleave', function () {
      cursorDot.style.opacity = '0'; cursorRing.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      cursorDot.style.opacity = '1'; cursorRing.style.opacity = '0.55';
    });

    var hoverTargets = 'a, button, .hamburger, .card, .work-teaser, .cert-row, .social-card';
    document.querySelectorAll(hoverTargets).forEach(function (el) {
      el.addEventListener('mouseenter', function () { cursorRing.classList.add('cur-hover'); });
      el.addEventListener('mouseleave', function () { cursorRing.classList.remove('cur-hover'); });
    });
  }

  // ---- Footer year ----
  var yearEl = document.getElementById('foot-year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }
})();
