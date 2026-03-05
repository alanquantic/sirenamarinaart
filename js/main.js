/* ============================================
   SIRENA MARINA ART — Main JS
   Scroll animations, QR generation, UI
   ============================================ */

(function () {
  'use strict';

  // ---- CONFIG ----
  // Cambiar BASE_URL cuando se conozca el dominio final
  var BASE_URL = 'https://sirenamarina.art';

  // ---- FADE-IN ON SCROLL (Intersection Observer) ----
  function initFadeIn() {
    var elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---- NAV SHOW ON SCROLL ----
  function initNav() {
    var nav = document.getElementById('homeNav') || document.getElementById('expoNav');
    if (!nav) return;

    var lastScroll = 0;
    var threshold = window.innerHeight * 0.5;

    window.addEventListener('scroll', function () {
      var currentScroll = window.pageYOffset;
      if (currentScroll > threshold) {
        nav.classList.add('visible');
      } else {
        nav.classList.remove('visible');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ---- BACK TO TOP ----
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.pageYOffset > window.innerHeight) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- SEMBLANZA TOGGLE ----
  function initSemblanzaToggle() {
    var toggle = document.getElementById('semblanzaToggle');
    var more = document.getElementById('semblanzaMore');
    if (!toggle || !more) return;

    toggle.addEventListener('click', function () {
      var isOpen = more.classList.toggle('active');
      toggle.textContent = isOpen ? 'Leer menos' : 'Leer más';
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // ---- QR CODE GENERATION ----
  // Minimal QR generator (uses canvas)
  function initQR() {
    var container = document.getElementById('qrCode');
    if (!container) return;

    var url = BASE_URL + '/exposicion060326/';

    // Load QRious library dynamically (lightweight QR lib)
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js';
    script.onload = function () {
      var canvas = document.createElement('canvas');
      container.appendChild(canvas);
      new QRious({
        element: canvas,
        value: url,
        size: 120,
        foreground: '#360F25',
        background: '#F5F4F0',
        level: 'M'
      });
    };
    document.head.appendChild(script);
  }

  // ---- LAZY LOAD IMAGES ----
  function initLazyLoad() {
    var images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          img.src = img.dataset.src;
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
          }
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px 0px'
    });

    images.forEach(function (img) {
      observer.observe(img);
    });
  }

  // ---- SVG DRAW ON SCROLL ----
  function initFirmaDraw() {
    var path = document.getElementById('firmaPath');
    var container = document.getElementById('svgFirma');
    if (!path || !container) return;

    // Get total path length and set as CSS variable
    var pathLength = path.getTotalLength();
    path.style.setProperty('--path-length', pathLength);
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    var dots = document.querySelectorAll('.firma-dot');
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(function () {
        var scrollTop = window.pageYOffset;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var scrollPercent = Math.min(scrollTop / docHeight, 1);

        // Draw the stroke proportionally to scroll
        var drawLength = pathLength * (1 - scrollPercent);
        path.style.strokeDashoffset = drawLength;

        // Show dots when nearly complete (>85% scrolled)
        var dotOpacity = scrollPercent > 0.85 ? Math.min((scrollPercent - 0.85) / 0.1, 1) : 0;
        dots.forEach(function (dot) {
          dot.setAttribute('opacity', dotOpacity);
        });

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Trigger initial state
    onScroll();
  }

  // ---- ANALYTICS HELPER ----
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }

  // ---- LIGHTBOX ----
  function initLightbox() {
    var images = document.querySelectorAll('.lightbox-trigger');
    if (!images.length) return;

    // Create lightbox overlay
    var overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML = '<div class="lightbox__backdrop"></div><div class="lightbox__wrap"><img class="lightbox__img" src="" alt=""><button class="lightbox__close" aria-label="Cerrar">&times;</button></div>';
    document.body.appendChild(overlay);

    var lightboxImg = overlay.querySelector('.lightbox__img');
    var closeBtn = overlay.querySelector('.lightbox__close');
    var backdrop = overlay.querySelector('.lightbox__backdrop');
    var lightboxOpenTime = 0;
    var currentImageName = '';

    function getArtworkName(img) {
      // Try to find artwork name from closest section heading or alt text
      var section = img.closest('.lamina-multi, .lamina-imagen, .lamina-statement');
      if (section) {
        var prev = section.previousElementSibling;
        if (prev) {
          var title = prev.querySelector('.lamina-texto__title');
          if (title) return title.textContent.trim().replace(/\s+/g, ' ');
        }
      }
      return img.alt || img.src.split('/').pop();
    }

    function openLightbox(src, alt, artworkName) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      lightboxOpenTime = Date.now();
      currentImageName = artworkName;

      trackEvent('lightbox_open', {
        image_name: artworkName,
        image_src: src.split('/').pop()
      });
    }

    function closeLightbox() {
      if (overlay.classList.contains('active') && lightboxOpenTime) {
        var viewDuration = Math.round((Date.now() - lightboxOpenTime) / 1000);
        trackEvent('lightbox_close', {
          image_name: currentImageName,
          view_duration_seconds: viewDuration
        });
      }
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      lightboxOpenTime = 0;
    }

    images.forEach(function (img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        var name = getArtworkName(this);
        openLightbox(this.src, this.alt, name);
      });
    });

    closeBtn.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  // ---- ARTWORK VIEW TIME TRACKING ----
  function initArtworkTracking() {
    // Track time spent viewing each artwork section
    var sections = document.querySelectorAll('[id]');
    if (!sections.length) return;

    var sectionTimers = {};
    var sectionReported = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        if (!id) return;

        if (entry.isIntersecting) {
          // Start timing
          sectionTimers[id] = Date.now();
        } else if (sectionTimers[id]) {
          // Stop timing and report
          var elapsed = Math.round((Date.now() - sectionTimers[id]) / 1000);
          delete sectionTimers[id];

          // Only report meaningful views (>2 seconds)
          if (elapsed > 2 && !sectionReported[id + '_' + elapsed]) {
            trackEvent('artwork_view', {
              section_id: id,
              section_name: getSectionName(entry.target),
              view_duration_seconds: elapsed
            });
          }
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    function getSectionName(el) {
      var heading = el.querySelector('.lamina-texto__title, .heading-lg, .heading-md, h2, h3');
      if (heading) return heading.textContent.trim().replace(/\s+/g, ' ');
      return el.id;
    }

    // Report remaining timers on page unload
    window.addEventListener('beforeunload', function () {
      Object.keys(sectionTimers).forEach(function (id) {
        var elapsed = Math.round((Date.now() - sectionTimers[id]) / 1000);
        if (elapsed > 2) {
          trackEvent('artwork_view', {
            section_id: id,
            section_name: id,
            view_duration_seconds: elapsed
          });
        }
      });
    });
  }

  // ---- SCROLL DEPTH TRACKING ----
  function initScrollDepth() {
    var milestones = [25, 50, 75, 90, 100];
    var reported = {};

    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var percent = Math.round((scrollTop / docHeight) * 100);

      milestones.forEach(function (m) {
        if (percent >= m && !reported[m]) {
          reported[m] = true;
          trackEvent('scroll_depth', {
            percent: m,
            page: window.location.pathname
          });
        }
      });
    }, { passive: true });
  }

  // ---- SMOOTH ANCHOR SCROLL ----
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ---- INIT ----
  function init() {
    initFadeIn();
    initNav();
    initBackToTop();
    initSemblanzaToggle();
    initQR();
    initLazyLoad();
    initFirmaDraw();
    initLightbox();
    initArtworkTracking();
    initScrollDepth();
    initSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
