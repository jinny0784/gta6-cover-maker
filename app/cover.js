/* Sunset Vice Cover Maker — all cover logic, vanilla JS, fully offline.
 *
 * A cover is drawn on a <canvas> at the chosen export size:
 *   - photos are cover-fitted into comic panels (3 layouts),
 *   - each panel gets a colour grade (canvas filter + gradient wash),
 *   - the hero panel gets a sunset skyline / palm silhouette strip,
 *   - the title is stamped in heavy display lettering with a gradient fill
 *     and a thick black outline, and the tagline sits in a banner box.
 * Empty photo slots fall back to the bundled sample.jpg postcard.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('cover');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var titleEl = document.getElementById('title');
  var taglineEl = document.getElementById('tagline');
  var sizeEl = document.getElementById('size');

  var GRADES = {
    vice: {
      filter: 'saturate(1.35) contrast(1.08)',
      washTop: 'rgba(255, 46, 136, 0.20)',
      washBottom: 'rgba(255, 138, 60, 0.28)',
      titleA: '#ffd23c', titleB: '#ff2e88',
      banner: '#ff2e88'
    },
    neon: {
      filter: 'saturate(1.5) contrast(1.15) hue-rotate(-12deg)',
      washTop: 'rgba(60, 138, 255, 0.22)',
      washBottom: 'rgba(180, 77, 255, 0.30)',
      titleA: '#2ee6c8', titleB: '#b44dff',
      banner: '#3c8aff'
    },
    golden: {
      filter: 'saturate(1.2) contrast(1.05) sepia(0.35)',
      washTop: 'rgba(255, 243, 176, 0.18)',
      washBottom: 'rgba(188, 108, 37, 0.30)',
      titleA: '#fff3b0', titleB: '#ffb703',
      banner: '#bc6c25'
    },
    mono: {
      filter: 'grayscale(1) contrast(1.25)',
      washTop: 'rgba(255, 255, 255, 0.10)',
      washBottom: 'rgba(0, 0, 0, 0.35)',
      titleA: '#f8f9fa', titleB: '#868e96',
      banner: '#212529'
    }
  };

  var state = {
    layout: 'grid',
    grade: 'vice',
    images: [null, null, null],   // per-slot HTMLImageElement, null = sample
    sample: null,
    ready: false
  };

  function setStatus(msg) { statusEl.textContent = msg; }

  function checkedValue(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  /* Draw img into rect (x, y, w, h) with "cover" fit (fill, crop overflow). */
  function drawCover(img, x, y, w, h) {
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  /* A palm silhouette: curved trunk plus a fan of fronds. (x, y) is the base,
     s is the height in px. Drawn in the current fill style. */
  function drawPalm(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, y);
    ctx.quadraticCurveTo(x + s * 0.02, y - s * 0.55, x + s * 0.16, y - s * 0.92);
    ctx.lineTo(x + s * 0.22, y - s * 0.90);
    ctx.quadraticCurveTo(x + s * 0.10, y - s * 0.5, x + s * 0.07, y);
    ctx.closePath();
    ctx.fill();
    var cx = x + s * 0.19, cy = y - s * 0.91;
    var angles = [-2.9, -2.35, -1.8, -1.25, -0.7, -0.25];
    ctx.lineWidth = Math.max(2, s * 0.035);
    ctx.beginPath();
    for (var i = 0; i < angles.length; i++) {
      var a = angles[i];
      var len = s * (0.34 + 0.08 * Math.sin(i * 2.1));
      var mx = cx + Math.cos(a) * len * 0.55;
      var my = cy + Math.sin(a) * len * 0.55 - s * 0.05;
      var ex = cx + Math.cos(a) * len;
      var ey = cy + Math.sin(a) * len + s * 0.12;
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
    }
    ctx.stroke();
  }

  /* Skyline + palms silhouette strip along the bottom of the hero panel. */
  function drawSilhouette(x, y, w, h) {
    var base = y + h;
    var stripH = h * 0.20;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.88)';
    // skyline blocks of varying heights
    var bx = x;
    var seed = 7;
    while (bx < x + w) {
      seed = (seed * 37 + 11) % 23;
      var bw = w * (0.05 + seed * 0.006);
      var bh = stripH * (0.35 + (seed % 9) * 0.07);
      ctx.fillRect(bx, base - bh, bw, bh);
      bx += bw + w * 0.012;
    }
    // a low sun disc peeking over the skyline
    ctx.fillStyle = 'rgba(255, 170, 60, 0.85)';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, base - stripH * 0.42, stripH * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 4, 20, 0.92)';
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.92)';
    drawPalm(x + w * 0.10, base, stripH * 1.25);
    drawPalm(x + w * 0.60, base, stripH * 1.05);
    drawPalm(x + w * 0.90, base, stripH * 1.4);
    ctx.restore();
  }

  /* Panel rectangles for the current layout, as fractions of the canvas. */
  function panelRects(layout, W, H) {
    if (layout === 'duo') {
      return [
        { x: 0, y: 0, w: W * 0.505, h: H, slot: 0 },
        { x: W * 0.495, y: 0, w: W * 0.505, h: H, slot: 1 }
      ];
    }
    if (layout === 'solo') {
      return [{ x: 0, y: 0, w: W, h: H, slot: 0 }];
    }
    // classic grid: hero on top, two panels underneath
    return [
      { x: 0, y: 0, w: W, h: H * 0.64, slot: 0 },
      { x: 0, y: H * 0.635, w: W * 0.505, h: H * 0.365, slot: 1 },
      { x: W * 0.495, y: H * 0.635, w: W * 0.505, h: H * 0.365, slot: 2 }
    ];
  }

  function drawPanel(rect, grade, isHero) {
    var img = state.images[rect.slot] || state.sample;
    if (!img) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    try { ctx.filter = grade.filter; } catch (e) { /* older engines: wash only */ }
    drawCover(img, rect.x, rect.y, rect.w, rect.h);
    try { ctx.filter = 'none'; } catch (e) { /* ignore */ }
    var wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, grade.washTop);
    wash.addColorStop(1, grade.washBottom);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (isHero) drawSilhouette(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    // comic panel border: thick black frame with a thin paper keyline
    ctx.lineWidth = Math.max(6, rect.w * 0.012);
    ctx.strokeStyle = '#0a0512';
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 246, 236, 0.85)';
    ctx.strokeRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10);
  }

  function drawTitle(W, H, grade) {
    var title = (titleEl.value || 'SUNSET VICE').toUpperCase();
    var size = H * 0.115;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // shrink the display font until the title fits the cover width
    do {
      ctx.font = '900 ' + size + 'px Impact, "Arial Narrow Bold", "Franklin Gothic Medium", sans-serif';
      size *= 0.94;
    } while (ctx.measureText(title).width > W * 0.92 && size > 18);
    try { ctx.letterSpacing = '2px'; } catch (e) { /* ignore */ }
    ctx.transform(1, 0, -0.05, 1, 0, 0); // a slight blockbuster lean
    var grad = ctx.createLinearGradient(0, H * 0.03, 0, H * 0.03 + size * 1.6);
    grad.addColorStop(0, grade.titleA);
    grad.addColorStop(1, grade.titleB);
    ctx.lineWidth = size * 0.16;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0512';
    var tx = W / 2, ty = H * 0.035;
    ctx.strokeText(title, tx, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, tx, ty);
    ctx.restore();
    return ty + size * 1.15;
  }

  function drawTagline(W, H, grade) {
    var tag = (taglineEl.value || '').trim();
    if (!tag) return;
    ctx.save();
    var size = Math.max(20, H * 0.032);
    ctx.font = '700 ' + size + 'px "Arial Narrow", "Segoe UI", sans-serif';
    try { ctx.letterSpacing = '3px'; } catch (e) { /* ignore */ }
    var tw = ctx.measureText(tag.toUpperCase()).width;
    var pad = size * 0.7;
    var bw = tw + pad * 2, bh = size * 2.0;
    var bx = W * 0.045, by = H - bh - H * 0.045;
    ctx.fillStyle = 'rgba(10, 5, 18, 0.88)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.lineWidth = 3;
    ctx.strokeStyle = grade.banner;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff6ec';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag.toUpperCase(), bx + pad, by + bh / 2 + 1);
    ctx.restore();
  }

  function drawRatingBadge(W, H) {
    // the little age-rating box every blockbuster cover carries
    var s = H * 0.085;
    var x = W - s - W * 0.04, y = H - s - H * 0.04;
    ctx.save();
    ctx.fillStyle = '#d90429';
    ctx.fillRect(x, y, s, s);
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff6ec';
    ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = '#fff6ec';
    ctx.font = '900 ' + (s * 0.52) + 'px Impact, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('18', x + s / 2, y + s / 2 + 2);
    ctx.restore();
  }

  function render() {
    if (!state.ready) return;
    var parts = sizeEl.value.split('x');
    var W = parseInt(parts[0], 10), H = parseInt(parts[1], 10);
    canvas.width = W; canvas.height = H;
    var grade = GRADES[state.grade] || GRADES.vice;
    ctx.fillStyle = '#0a0512';
    ctx.fillRect(0, 0, W, H);
    var rects = panelRects(state.layout, W, H);
    for (var i = 0; i < rects.length; i++) {
      drawPanel(rects[i], grade, i === 0);
    }
    drawTitle(W, H, grade);
    drawTagline(W, H, grade);
    drawRatingBadge(W, H);
    setStatus('Cover ready — ' + W + ' × ' + H + ', ' +
      state.layout + ' layout, ' + state.grade + ' grade.');
  }

  function loadSlotImage(slot, src) {
    var img = new Image();
    img.onload = function () {
      state.images[slot] = img;
      render();
    };
    img.onerror = function () { setStatus('That file could not be read as an image.'); };
    img.src = src;
  }

  function wireSlots() {
    var inputs = document.querySelectorAll('input[data-file]');
    inputs.forEach(function (input) {
      input.addEventListener('change', function () {
        var slot = parseInt(input.getAttribute('data-file'), 10);
        if (input.files && input.files[0]) {
          loadSlotImage(slot, URL.createObjectURL(input.files[0]));
        }
      });
    });
    var zones = document.querySelectorAll('.slot');
    zones.forEach(function (zone) {
      var slot = parseInt(zone.getAttribute('data-slot'), 10);
      zone.addEventListener('dragover', function (ev) {
        ev.preventDefault(); zone.classList.add('drag');
      });
      zone.addEventListener('dragleave', function () { zone.classList.remove('drag'); });
      zone.addEventListener('drop', function (ev) {
        ev.preventDefault(); zone.classList.remove('drag');
        var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
        if (file) loadSlotImage(slot, URL.createObjectURL(file));
      });
    });
  }

  function wireControls() {
    document.querySelectorAll('input[name="layout"]').forEach(function (r) {
      r.addEventListener('change', function () {
        state.layout = checkedValue('layout') || 'grid'; render();
      });
    });
    document.querySelectorAll('input[name="grade"]').forEach(function (r) {
      r.addEventListener('change', function () {
        state.grade = checkedValue('grade') || 'vice'; render();
      });
    });
    titleEl.addEventListener('input', render);
    taglineEl.addEventListener('input', render);
    sizeEl.addEventListener('change', render);
    document.getElementById('download').addEventListener('click', function () {
      render();
      canvas.toBlob(function (blob) {
        if (!blob) { setStatus('Export failed in this browser.'); return; }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sunset-vice-cover-' + canvas.width + 'x' + canvas.height + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        setStatus('PNG downloaded — ' + canvas.width + ' × ' + canvas.height + '.');
      }, 'image/png');
    });
  }

  /* Small public hook so the maker's screenshot runs (and tinkerers) can put
     the editor into a known state and wait for the first painted cover. */
  var readyResolve;
  var readyPromise = new Promise(function (res) { readyResolve = res; });
  window.CoverMaker = {
    whenReady: function () { return readyPromise; },
    setState: function (patch) {
      if (patch.layout) {
        state.layout = patch.layout;
        var lr = document.querySelector('input[name="layout"][value="' + patch.layout + '"]');
        if (lr) lr.checked = true;
      }
      if (patch.grade) {
        state.grade = patch.grade;
        var gr = document.querySelector('input[name="grade"][value="' + patch.grade + '"]');
        if (gr) gr.checked = true;
      }
      if (typeof patch.title === 'string') titleEl.value = patch.title;
      if (typeof patch.tagline === 'string') taglineEl.value = patch.tagline;
      if (patch.size) sizeEl.value = patch.size;
      render();
    }
  };

  function init() {
    wireSlots();
    wireControls();
    var sample = new Image();
    sample.onload = function () {
      state.sample = sample;
      state.ready = true;
      render();
      readyResolve();
    };
    sample.onerror = function () {
      setStatus('The bundled sample.jpg failed to load — drop a photo into the hero slot.');
      state.ready = true;
      readyResolve();
    };
    sample.src = 'sample.jpg';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
