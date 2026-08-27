/* ══════════════════════════════════════════════════════════════
   AHMED BIN RASHED — حركات الموقع
   1) بوابة الدخول   2) محرّك الظهور عند السكرول   3) حركة الماوس
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══ 1) بوابة الدخول: تفتح لمن الصورة والخطوط يجهزون ═══ */
  function start() {
    if (body.classList.contains('is-ready')) return;
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
  }

  var instant = /(^|[?&])ready\b/.test(location.search);

  if (instant) {
    // ?ready — يتخطى حركة الدخول (للمعاينة وأخذ الصور)
    body.classList.add('is-instant');
    document.documentElement.style.scrollBehavior = 'auto';
    start();
  } else {
    var hero = document.querySelector('.hero__figure img');
    var waits = [];

    if (hero && !hero.complete) {
      waits.push(new Promise(function (res) {
        hero.addEventListener('load', res, { once: true });
        hero.addEventListener('error', res, { once: true });
      }));
    }
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);

    // نبدأ لمن يجهز كل شي، وبأقصى حد 2.2 ثانية عشان ما ينتظر أحد
    Promise.race([
      Promise.all(waits),
      new Promise(function (res) { setTimeout(res, 2200); })
    ]).then(function () {
      setTimeout(start, 90);
    });
  }

  /* ═══ 2) محرّك الظهور عند السكرول ═══
     أي عنصر بأي قسم: data-reveal="up | clip | scale | blur | rule"
     وللتأخير المتسلسل: style="--d:.2s"                              */
  var items = document.querySelectorAll('[data-reveal]');

  if (instant || reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ═══ 3) الضوء والصورة يتحركون شوي مع الماوس ═══ */
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;

    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 60;
      ty = (e.clientY / window.innerHeight - 0.5) * 34;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      body.style.setProperty('--mx', cx.toFixed(2) + 'px');
      body.style.setProperty('--my', cy.toFixed(2) + 'px');
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        requestAnimationFrame(loop);
      } else { running = false; }
    }
  }
})();

/* ══════════════════════════════════════════════════════════════
   الأشرطة المتحركة + عارض الصور والفيديو
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lb = document.getElementById('lb');
  if (!lb) return;
  var stage = document.getElementById('lbStage');
  var btnClose = lb.querySelector('.lb__close');
  var btnPrev = lb.querySelector('.lb__nav--prev');
  var btnNext = lb.querySelector('.lb__nav--next');

  var group = [];      // روابط الصور في القسم المفتوح
  var index = 0;
  var opener = null;

  /* ── 1) مجموعات العارض ── */
  var groups = [];
  Array.prototype.forEach.call(
    document.querySelectorAll(".strip, .gallery"),
    function (box) {
      var items = Array.prototype.slice.call(box.querySelectorAll(".shot"));
      if (!items.length) return;
      groups.push(items.map(function (el) { return el.getAttribute("data-full"); }));
      var gi = groups.length - 1;
      items.forEach(function (el, i) { el.dataset.g = gi; el.dataset.i = i; });
    }
  );

  /* ── 1ب) الشريط: يمشي لحاله + تقدر تسحبه بيدك ── */
  Array.prototype.forEach.call(document.querySelectorAll(".strip"), function (strip) {
    var originals = Array.prototype.slice.call(strip.children);
    if (!originals.length) return;

    // نكرر المحتوى مرة عشان الدوران يصير بلا نهاية
    var frag = document.createDocumentFragment();
    originals.forEach(function (el) {
      var c = el.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.setAttribute("tabindex", "-1");
      frag.appendChild(c);
    });
    strip.appendChild(frag);

    var dir = strip.getAttribute("data-dir") === "-1" ? -1 : 1;
    var speed = 0.42;              // بكسل بكل إطار — هادي
    var down = false, startX = 0, startLeft = 0, moved = 0, visible = true;
    var target = null;             // هدف أزرار التنقل
    // المتصفح يقرّب scrollLeft لعدد صحيح، فنمسك الموضع بالكسور عندنا
    // وإلا الحركة البطيئة (أقل من بكسل بالإطار) تضيع ولا يتحرك الشريط
    var pos = 0;

    // طول الدورة = المسافة بين أول عنصر أصلي وأول نسخة مكررة
    function period() {
      var a = strip.children[0], b = strip.children[originals.length];
      return (a && b) ? (b.offsetLeft - a.offsetLeft) : strip.scrollWidth / 2;
    }

    // الحركة ما تتوقف أبداً — بس نوقفها لحظة السحب باليد عشان ما تعاند الإصبع
    strip.addEventListener("pointerdown", function (e) {
      down = true; moved = 0;
      startX = e.clientX; startLeft = strip.scrollLeft;
    });
    strip.addEventListener("wheel", function () { pos = strip.scrollLeft; }, { passive: true });
    strip.addEventListener("scroll", function () {
      // لو تحرّك السكرول من برا الحلقة، نزامن موضعنا معه
      if (Math.abs(strip.scrollLeft - pos) > 2) pos = strip.scrollLeft;
    }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var d = e.clientX - startX;
      if (Math.abs(d) > moved) moved = Math.abs(d);
      if (moved > 5) strip.classList.add("is-drag");
      strip.scrollLeft = startLeft - d;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      strip.classList.remove("is-drag");
      // لو كان يسحب، نمنع الضغطة اللي بتجي بعد السحب
      if (moved > 5) {
        strip.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
        }, { capture: true, once: true });
      }
    });

    // أزرار اليمين واليسار
    var rail = strip.parentNode;
    Array.prototype.forEach.call(rail.querySelectorAll(".rail__btn"), function (btn) {
      var sign = btn.classList.contains("rail__btn--next") ? 1 : -1;
      btn.addEventListener("click", function () {
        var base = target === null ? pos : target;
        target = base + sign * strip.clientWidth * 0.8;
      });
    });

    // ما نشغّل الحركة إلا والشريط ظاهر — قياس مباشر كل عدة إطارات
    var frame = 0;
    function checkVisible() {
      var r = strip.getBoundingClientRect();
      visible = r.bottom > 0 && r.top < window.innerHeight;
    }

    function tick() {
      if (frame++ % 15 === 0) checkVisible();
      var h = period();
      if (down) {
        target = null;
        pos = strip.scrollLeft;
      } else {
        if (target !== null) {
          // انزلاق ناعم لهدف الزر
          var d = target - pos;
          if (Math.abs(d) < 1) { pos = target; target = null; }
          else pos += d * 0.11;
        } else if (visible && !reduced) {
          pos += speed * dir;
        }
        // اللف اللانهائي
        if (pos >= h) { pos -= h; if (target !== null) target -= h; }
        else if (pos < 0) { pos += h; if (target !== null) target += h; }
        strip.scrollLeft = pos;
      }
      requestAnimationFrame(tick);
    }
    // الاتجاه المعاكس يبدأ من نهاية الدورة عشان يقدر يرجع
    pos = dir === -1 ? period() - 1 : 0;
    strip.scrollLeft = pos;
    requestAnimationFrame(tick);
  });

  /* ── 2) فتح وإغلاق العارض ── */
  function show() {
    stage.innerHTML = '';
    var img = new Image();
    img.src = group[index];
    img.alt = '';
    stage.appendChild(img);
  }

  function openImage(g, i, from) {
    group = groups[g] || [];
    index = i;
    opener = from;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    show();
    btnClose.focus();
  }

  function close() {
    var v = stage.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    stage.innerHTML = '';
    lb.hidden = true;
    document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  function step(d) {
    if (!group.length) return;
    index = (index + d + group.length) % group.length;
    show();
  }

  /* ── 3) الضغطات ── */
  document.addEventListener('click', function (e) {
    var shot = e.target.closest('.shot');
    if (shot) {
      openImage(+shot.dataset.g, +shot.dataset.i, shot);
      return;
    }
  });

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', function () { step(-1); });
  btnNext.addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === stage) close(); });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(1);
    else if (e.key === 'ArrowRight') step(-1);
  });
})();
