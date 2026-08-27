/* كاروسيل الأعمال — نفس كاروسيل m7mdbedeiry.com بالضبط،
   والتغيير الوحيد: البطاقات هنا أفلام عرضية 2.35:1 وكل بطاقة تفتح صفحة عملها. */
(function () {
  var stage = document.getElementById("stage");
  if (!stage) return;

  var WORKS = [
    { slug: "color",   title: "COLOR",        kind: "تجربة تلوين",  file: "film-01" },
    { slug: "atmanna", title: "أتمنى",        kind: "فيلم قصير",    file: "film-02" },
    { slug: "hewar",   title: "حوار نفسي",    kind: "فيلم قصير",    file: "film-03" },
    { slug: "kharij",  title: "خارج الصندوق", kind: "فيلم قصير",    file: "film-04" },
    { slug: "suhba",   title: "صحبة بريئة",   kind: "فيلم قصير",    file: "film-05" },
    { slug: "alzafer", title: "الزافر",       kind: "مسلسل تاريخي", file: "alzafer", still: true }
  ];
  var BASE = "assets/media/works/";
  var N = WORKS.length;
  var current = 0;
  var cards = [];
  var swiped = false;

  var capT = document.querySelector(".stage__title");
  var capK = document.querySelector(".stage__kind");

  WORKS.forEach(function (w) {
    var card = document.createElement("a");
    card.className = "stage__card";
    card.href = "work/" + w.slug + ".html";
    // البطاقة رابط، والمتصفح يبدأ سحب الرابط ويبلع حركة السحب — نوقفه
    card.draggable = false;
    card.addEventListener("dragstart", function (e) { e.preventDefault(); });

    var inner = document.createElement("div");
    inner.className = "stage__inner";

    if (w.still) {
      // الزافر مشروع صور، فبطاقته صورة ثابتة
      var img = document.createElement("img");
      img.src = BASE + w.file + ".jpg";
      img.alt = w.title;
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      inner.appendChild(img);
    } else {
      // نسخة 640px خفيفة وبدون صوت — فك ترميزها رخيص فتشتغل كلها بدون لاق
      var v = document.createElement("video");
      v.src = BASE + "card/" + w.file + ".mp4";
      v.poster = BASE + w.file + ".jpg";
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "metadata";
      inner.appendChild(v);
    }

    card.appendChild(inner);
    stage.appendChild(card);
    cards.push(card);

    card.addEventListener("click", function (e) {
      // السحب ما يفتح العمل، والبطاقة الجانبية تجي للنص أول
      if (swiped) { e.preventDefault(); return; }
      var i = cards.indexOf(card);
      if (signedDist(i) !== 0) {
        e.preventDefault();
        current = i;
        render();
        caption();
        settlePlayback();
      }
    });
  });

  var cardW = 480;

  function signedDist(i) {
    var d = (i - current) % N;
    return d > N / 2 ? d - N : d < -N / 2 ? d + N : d;
  }

  function caption() {
    if (capT) capT.textContent = WORKS[current].title;
    if (capK) capK.textContent = WORKS[current].kind;
  }

  function layout() {
    var stageH = stage.getBoundingClientRect().height;
    var vw = window.innerWidth;
    var byHeight = (stageH * 0.94) * 2.35;
    // على الجوال بطاقات أصغر حتى يظهر القوس المتداخل كاملًا
    var widthFactor = vw <= 640 ? 0.86 : 0.46;
    var minW = vw <= 640 ? 230 : 300;
    cardW = Math.max(minW, Math.min(byHeight, vw * widthFactor, 700));
    stage.style.setProperty("--card-w", cardW + "px");
    render();
  }

  function render() {
    var spacing = cardW * 0.55;
    var maxSide = Math.ceil((window.innerWidth / 2) / spacing) + 1;

    for (var i = 0; i < N; i++) {
      var d = signedDist(i);
      var abs = Math.abs(d);
      var card = cards[i];
      var scale = Math.pow(0.9, abs);
      var x = d * spacing;
      var ry = d === 0 ? 0 : d > 0 ? -13 : 13;

      card.style.zIndex = 60 - abs;
      card.style.opacity = abs > maxSide ? "0" : "1";
      card.style.pointerEvents = abs > maxSide ? "none" : "auto";
      card.style.transform = "translateY(-50%) translateX(" + x + "px) scale(" + scale + ") rotateY(" + ry + "deg)";
    }
  }

  // كل الفيديوهات الظاهرة على الشاشة تشتغل، والمخفية خلف الحواف فقط تتوقف
  function syncPlayback() {
    var maxSide = Math.ceil((window.innerWidth / 2) / (cardW * 0.55)) + 1;
    for (var i = 0; i < N; i++) {
      var abs = Math.abs(signedDist(i));
      var v = cards[i].querySelector("video");
      if (!v) continue;
      if (abs <= maxSide) {
        if (v.preload !== "auto") v.preload = "auto";
        if (v.paused) v.play().catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    }
  }

  // نؤجل تشغيل الفيديوهات حتى تستقر الحركة، فلا يتقطع التنقل السريع
  var settle = null;
  function settlePlayback() {
    clearTimeout(settle);
    settle = setTimeout(syncPlayback, 260);
  }

  function go(dir) {
    current = (current + dir + N) % N;
    render();
    caption();
    settlePlayback();
  }

  document.getElementById("nextBtn").addEventListener("click", function () { go(1); });
  document.getElementById("prevBtn").addEventListener("click", function () { go(-1); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  var startX = null;
  stage.addEventListener("pointerdown", function (e) { startX = e.clientX; });
  window.addEventListener("pointerup", function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 40) {
      swiped = true;
      go(dx < 0 ? 1 : -1);
      setTimeout(function () { swiped = false; }, 160);
    }
    startX = null;
  });
  window.addEventListener("pointercancel", function () { startX = null; });

  // ملاحظة: زي بديري بالضبط — الكاروسيل ما يدور لحاله،
  // الحركة تجي من الفيديوهات اللي تشتغل داخل البطاقات.
  layout();
  caption();
  syncPlayback();      // شغّل الظاهر بعد أول رسم
  window.addEventListener("resize", function () { layout(); syncPlayback(); });

  // لو فُتحت الصفحة بتبويب خلفي، نعيد تشغيل الفيديوهات عند ظهورها
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) syncPlayback();
  });
})();
