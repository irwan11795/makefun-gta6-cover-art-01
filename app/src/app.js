// Vice Cover Studio — an offline GTA-style poster cover maker.
// Every photo is read on this machine and never uploaded anywhere.
// Lettering is Anton (SIL Open Font License), shipped under app/fonts/.

"use strict";

var SAMPLES = {
  messi: { src: "samples/messi.jpg", name: "Lionel Messi" },
  ronaldo: { src: "samples/ronaldo.jpg", name: "Cristiano Ronaldo" },
  taylor: { src: "samples/taylor-swift.png", name: "Taylor Swift" },
  johnson: { src: "samples/dwayne-johnson.jpg", name: "Dwayne Johnson" },
};

// Panel rectangles as fractions of the cover, per layout.
var LAYOUTS = {
  hero: [
    { x: 0, y: 0, w: 0.6, h: 1 },
    { x: 0.6, y: 0, w: 0.4, h: 0.5 },
    { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
  ],
  columns: [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ],
  grid: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
};

var GRADE_FILTERS = {
  sunset: "sepia(0.32) saturate(1.6) hue-rotate(-12deg) contrast(1.06)",
  neon: "saturate(1.8) hue-rotate(8deg) contrast(1.15)",
  noir: "grayscale(1) contrast(1.2) brightness(0.95)",
};

var state = {
  layout: "hero",
  grade: "sunset",
  caption: "VICE CITY",
  subcaption: "Neon nights, palm dreams.",
  photos: [], // { name, src, img }
  panels: [
    { photo: -1, zoom: 1, ox: 0, oy: 0, flip: false },
    { photo: -1, zoom: 1, ox: 0, oy: 0, flip: false },
    { photo: -1, zoom: 1, ox: 0, oy: 0, flip: false },
    { photo: -1, zoom: 1, ox: 0, oy: 0, flip: false },
  ],
  selectedPanel: 0,
};

var coverEl = document.getElementById("coverPreview");
var panelPhotoEl = document.getElementById("panelPhoto");
var panelZoomEl = document.getElementById("panelZoom");
var zoomValueEl = document.getElementById("zoomValue");
var selectedLabelEl = document.getElementById("selectedPanelLabel");
var exportStatusEl = document.getElementById("exportStatus");

function $(id) { return document.getElementById(id); }

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error("Could not load image: " + src)); };
    img.src = src;
  });
}

function visiblePanelCount() {
  return LAYOUTS[state.layout].length;
}

function panelPhotoImage(panel) {
  if (panel.photo < 0 || panel.photo >= state.photos.length) return null;
  return state.photos[panel.photo].img;
}

// Rebuild the live multi-panel preview from state.
function renderCoverPanels() {
  var rects = LAYOUTS[state.layout];
  var old = coverEl.querySelectorAll(".cover-panel");
  old.forEach(function (el) { el.remove(); });
  rects.forEach(function (rect, i) {
    var panel = state.panels[i];
    var div = document.createElement("div");
    div.className = "cover-panel" + (i === state.selectedPanel ? " selected" : "");
    div.style.left = rect.x * 100 + "%";
    div.style.top = rect.y * 100 + "%";
    div.style.width = rect.w * 100 + "%";
    div.style.height = rect.h * 100 + "%";
    div.dataset.panel = String(i);
    var tag = document.createElement("span");
    tag.className = "panel-tag";
    tag.textContent = "PANEL " + (i + 1);
    div.appendChild(tag);
    var img = panelPhotoImage(panel);
    if (img) {
      var el = document.createElement("img");
      el.src = state.photos[panel.photo].src;
      el.alt = "";
      el.draggable = false;
      div.appendChild(el);
      coverEl.insertBefore(div, coverEl.firstChild);
      // Size the photo to cover the panel, then pan/zoom/flip it in place.
      var box = div.getBoundingClientRect();
      var base = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
      el.style.width = img.naturalWidth * base + "px";
      el.style.height = img.naturalHeight * base + "px";
      el.style.transform = panelTransform(panel, box.width, box.height);
    } else {
      coverEl.insertBefore(div, coverEl.firstChild);
    }
    div.addEventListener("pointerdown", onPanelPointerDown);
  });
  coverEl.className = "cover grade-" + state.grade;
  refreshPanelControls();
}

// CSS transform for one panel photo: centre it, then pan (crop position) + zoom + flip.
function panelTransform(panel, panelWidth, panelHeight) {
  var sx = panel.flip ? -panel.zoom : panel.zoom;
  return "translate(-50%, -50%) translate(" + panel.ox * panelWidth + "px, " +
    panel.oy * panelHeight + "px) scale(" + sx + ", " + panel.zoom + ")";
}

// Move one panel's photo inside its crop window (drag to reposition).
function cropPanelPhoto(index, dxFraction, dyFraction) {
  var panel = state.panels[index];
  var slack = 0.35 + (panel.zoom - 1) * 0.5;
  panel.ox = Math.max(-slack, Math.min(slack, panel.ox + dxFraction));
  panel.oy = Math.max(-slack, Math.min(slack, panel.oy + dyFraction));
  renderCoverPanels();
}

function refreshPanelControls() {
  var count = visiblePanelCount();
  selectedLabelEl.textContent =
    "Panel " + (state.selectedPanel + 1) + " of " + count +
    " — click a panel on the cover to select it, then drag it to move the photo.";
  panelPhotoEl.innerHTML = "";
  var none = document.createElement("option");
  none.value = "-1";
  none.textContent = "No photo yet";
  panelPhotoEl.appendChild(none);
  state.photos.forEach(function (photo, i) {
    var opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = photo.name;
    panelPhotoEl.appendChild(opt);
  });
  panelPhotoEl.value = String(state.panels[state.selectedPanel].photo);
  var zoom = state.panels[state.selectedPanel].zoom;
  panelZoomEl.value = String(Math.round(zoom * 100));
  zoomValueEl.textContent = Math.round(zoom * 100) + "%";
}

function selectPanel(index) {
  state.selectedPanel = index;
  renderCoverPanels();
}

// --- grades ---------------------------------------------------------------

function applySunsetGrade() { setGrade("sunset"); }
function applyNeonGrade() { setGrade("neon"); }
function applyNoirGrade() { setGrade("noir"); }

function setGrade(grade) {
  state.grade = grade;
  document.querySelectorAll("#gradeRow .pill").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.grade === grade);
  });
  renderCoverPanels();
}

function setLayout(layout) {
  state.layout = layout;
  if (state.selectedPanel >= visiblePanelCount()) state.selectedPanel = 0;
  document.querySelectorAll("#layoutRow .pill").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.layout === layout);
  });
  renderCoverPanels();
}

// --- photos ---------------------------------------------------------------

function addPhoto(name, src, img) {
  var existing = state.photos.findIndex(function (p) { return p.src === src; });
  if (existing >= 0) return existing;
  state.photos.push({ name: name, src: src, img: img });
  return state.photos.length - 1;
}

// Load one of the built-in sample photos and fill every panel with it.
function loadSamplePhoto(key) {
  var sample = SAMPLES[key];
  return loadImage(sample.src).then(function (img) {
    var index = addPhoto(sample.name, sample.src, img);
    state.panels.forEach(function (panel) { panel.photo = index; });
    var btn = document.querySelector('[data-sample="' + key + '"]');
    if (btn) btn.classList.add("loaded");
    renderCoverPanels();
    return index;
  }).catch(function (err) {
    exportStatusEl.textContent = err.message;
  });
}

function addUserPhotos(fileList) {
  var files = Array.prototype.slice.call(fileList || []);
  if (!files.length) return;
  var firstNew = state.photos.length === 0;
  var chain = Promise.resolve();
  files.forEach(function (file) {
    chain = chain.then(function () {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () {
          loadImage(reader.result).then(function (img) {
            var index = addPhoto(file.name, reader.result, img);
            if (firstNew) {
              state.panels.forEach(function (panel) { panel.photo = index; });
            } else {
              state.panels[state.selectedPanel].photo = index;
            }
            renderCoverPanels();
            resolve();
          }).catch(resolve);
        };
        reader.onerror = resolve;
        reader.readAsDataURL(file);
      });
    });
  });
}

// --- caption --------------------------------------------------------------

function setCaption(text) {
  state.caption = text;
  $("coverTitle").textContent = text;
  if ($("captionInput").value !== text) $("captionInput").value = text;
}

function setSubcaption(text) {
  state.subcaption = text;
  $("coverSub").textContent = text;
  if ($("subInput").value !== text) $("subInput").value = text;
}

// --- export ---------------------------------------------------------------

function seededRandom(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw one photo into a panel rect with cover-fit, zoom, pan and flip.
function drawPanelPhoto(ctx, img, rect, panel) {
  var px = rect.x, py = rect.y, pw = rect.w, ph = rect.h;
  var base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  var scale = base * panel.zoom;
  var dw = img.naturalWidth * scale;
  var dh = img.naturalHeight * scale;
  var dx = px + (pw - dw) / 2 + panel.ox * pw;
  var dy = py + (ph - dh) / 2 + panel.oy * ph;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.filter = GRADE_FILTERS[state.grade];
  if (panel.flip) {
    ctx.translate(px + pw / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(px + pw / 2), 0);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  ctx.filter = "none";
}

function paintGradeWash(ctx, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  var wash;
  if (state.grade === "sunset") {
    wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#ffb74d");
    wash.addColorStop(0.45, "#ff5e3a");
    wash.addColorStop(1, "#ff2e88");
  } else if (state.grade === "neon") {
    wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#22d3ee");
    wash.addColorStop(0.55, "#ff2e88");
    wash.addColorStop(1, "#7c3aed");
  } else {
    wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, "#788cb4");
    wash.addColorStop(1, "#0a0a14");
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintSunDisc(ctx, w, h) {
  // Centred inside the hero panel, ending at the side-panel seam,
  // so it never sits on a panel tag or a face.
  var r = Math.min(w, h) * 0.07;
  var cx = w * 0.53, cy = h * 0.06;
  var g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(0.35, "#ffb347");
  g.addColorStop(0.62, "#ff5e3a");
  g.addColorStop(1, "#ff2e88");
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintDiagonalStripes(ctx, w, h) {
  var bandY = h * 0.62;
  var bandH = Math.max(12, h * 0.03);
  ctx.save();
  ctx.translate(0, bandY);
  ctx.rotate(-0.07);
  ctx.translate(-w * 0.1, -bandH / 2);
  // Solid gold band, then black diagonal hazard stripes across it.
  ctx.fillStyle = "#ffc857";
  ctx.fillRect(0, 0, w * 1.2, bandH);
  ctx.fillStyle = "#14060f";
  var stripeW = Math.max(16, w * 0.014);
  var step = stripeW * 2;
  for (var x = -bandH; x < w * 1.2 + bandH; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripeW, 0);
    ctx.lineTo(x + stripeW - bandH, bandH);
    ctx.lineTo(x - bandH, bandH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintGrain(ctx, w, h) {
  var rand = seededRandom(20261119);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#ffffff";
  var n = Math.floor((w * h) / 900);
  for (var i = 0; i < n; i++) {
    ctx.fillRect(rand() * w, rand() * h, 2, 2);
  }
  ctx.restore();
}

function paintVignette(ctx, w, h) {
  var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function paintCaption(ctx, w, h) {
  var caption = (state.caption || "VICE CITY").toUpperCase();
  var sub = state.subcaption || "";
  var margin = w * 0.04;
  var size = w * 0.115;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.font = size + "px Anton, 'Arial Narrow', sans-serif";
  while (ctx.measureText(caption).width > w * 0.92 && size > 24) {
    size *= 0.92;
    ctx.font = size + "px Anton, 'Arial Narrow', sans-serif";
  }
  var titleY = h - h * 0.1;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(4, size * 0.07);
  ctx.strokeStyle = "#14060f";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255, 46, 136, 0.85)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetX = size * 0.03;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(caption, margin, titleY);
  ctx.fillText(caption, margin, titleY);
  ctx.restore();
  if (sub) {
    ctx.save();
    ctx.font = "700 " + Math.max(16, w * 0.02) + "px 'Segoe UI', system-ui, sans-serif";
    try { ctx.letterSpacing = "3px"; } catch (e) { /* older canvas: no letter spacing */ }
    ctx.fillStyle = "#ffc857";
    ctx.strokeStyle = "#14060f";
    ctx.lineWidth = Math.max(3, w * 0.003);
    var subY = titleY + Math.max(22, w * 0.032);
    ctx.strokeText(sub.toUpperCase(), margin, subY);
    ctx.fillText(sub.toUpperCase(), margin, subY);
    ctx.restore();
  }
  // Small star badge, bottom right.
  ctx.save();
  var badge = "★ VICE ★";
  ctx.font = Math.max(14, w * 0.014) + "px Anton, 'Arial Narrow', sans-serif";
  var bw = ctx.measureText(badge).width + w * 0.03;
  var bh = Math.max(22, w * 0.028);
  var bx = w - margin - bw, by = h - margin - bh;
  ctx.fillStyle = "rgba(20, 6, 15, 0.7)";
  ctx.strokeStyle = "#ffc857";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(badge, bx + w * 0.015, by + bh / 2 + 1);
  ctx.restore();
}

// Render the cover at full post size and download it as a PNG.
function exportCoverPNG(width, height) {
  return document.fonts.load('100px Anton').catch(function () {}).then(function () {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#14060f";
    ctx.fillRect(0, 0, width, height);
    var rects = LAYOUTS[state.layout];
    rects.forEach(function (rect, i) {
      var img = panelPhotoImage(state.panels[i]);
      if (!img) return;
      drawPanelPhoto(ctx, img, {
        x: rect.x * width, y: rect.y * height,
        w: rect.w * width, h: rect.h * height,
      }, state.panels[i]);
    });
    paintGradeWash(ctx, width, height);
    paintSunDisc(ctx, width, height);
    paintDiagonalStripes(ctx, width, height);
    paintGrain(ctx, width, height);
    paintVignette(ctx, width, height);
    paintCaption(ctx, width, height);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { exportStatusEl.textContent = "Export failed — please try again."; resolve(null); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "vice-cover-" + width + "x" + height + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        exportStatusEl.textContent = "Exported " + width + " × " + height + " PNG — check your downloads.";
        resolve(blob);
      }, "image/png");
    });
  });
}

// --- panel dragging -------------------------------------------------------

var drag = null;

function onPanelPointerDown(event) {
  var index = Number(event.currentTarget.dataset.panel);
  selectPanel(index);
  var rect = event.currentTarget.getBoundingClientRect();
  drag = { index: index, x: event.clientX, y: event.clientY, w: rect.width, h: rect.height };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.addEventListener("pointermove", onPanelPointerMove);
  event.currentTarget.addEventListener("pointerup", onPanelPointerUp, { once: true });
}

function onPanelPointerMove(event) {
  if (!drag) return;
  var dx = (event.clientX - drag.x) / drag.w;
  var dy = (event.clientY - drag.y) / drag.h;
  drag.x = event.clientX;
  drag.y = event.clientY;
  cropPanelPhoto(drag.index, dx, dy);
}

function onPanelPointerUp(event) {
  drag = null;
  if (event.currentTarget) {
    event.currentTarget.removeEventListener("pointermove", onPanelPointerMove);
  }
}

// --- wiring ---------------------------------------------------------------

$("photoInput").addEventListener("change", function (event) {
  addUserPhotos(event.target.files);
  event.target.value = "";
});

var dropZone = $("dropZone");
dropZone.addEventListener("click", function () { $("photoInput").click(); });
dropZone.addEventListener("dragover", function (event) {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", function () { dropZone.classList.remove("dragging"); });
dropZone.addEventListener("drop", function (event) {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  addUserPhotos(event.dataTransfer.files);
});
coverEl.addEventListener("dragover", function (event) { event.preventDefault(); });
coverEl.addEventListener("drop", function (event) {
  event.preventDefault();
  addUserPhotos(event.dataTransfer.files);
});

document.querySelectorAll(".sample-btn").forEach(function (btn) {
  btn.addEventListener("click", function () { loadSamplePhoto(btn.dataset.sample); });
});
document.querySelectorAll("#layoutRow .pill").forEach(function (btn) {
  btn.addEventListener("click", function () { setLayout(btn.dataset.layout); });
});
document.querySelectorAll("#gradeRow .pill").forEach(function (btn) {
  btn.addEventListener("click", function () { setGrade(btn.dataset.grade); });
});

$("captionInput").addEventListener("input", function (event) { setCaption(event.target.value); });
$("subInput").addEventListener("input", function (event) { setSubcaption(event.target.value); });
$("coverTitle").addEventListener("input", function (event) { setCaption(event.target.textContent); });
$("coverSub").addEventListener("input", function (event) { setSubcaption(event.target.textContent); });

panelPhotoEl.addEventListener("change", function () {
  state.panels[state.selectedPanel].photo = Number(panelPhotoEl.value);
  renderCoverPanels();
});
panelZoomEl.addEventListener("input", function () {
  state.panels[state.selectedPanel].zoom = Number(panelZoomEl.value) / 100;
  zoomValueEl.textContent = panelZoomEl.value + "%";
  renderCoverPanels();
});
$("panelFlip").addEventListener("click", function () {
  var panel = state.panels[state.selectedPanel];
  panel.flip = !panel.flip;
  renderCoverPanels();
});
$("fillAll").addEventListener("click", function () {
  var photo = state.panels[state.selectedPanel].photo;
  state.panels.forEach(function (panel) { panel.photo = photo; });
  renderCoverPanels();
});
$("resetCrop").addEventListener("click", function () {
  var panel = state.panels[state.selectedPanel];
  panel.zoom = 1; panel.ox = 0; panel.oy = 0; panel.flip = false;
  renderCoverPanels();
});

$("export-1080x1080").addEventListener("click", function () { exportCoverPNG(1080, 1080); });
$("export-1080x1350").addEventListener("click", function () { exportCoverPNG(1080, 1350); });
$("export-1920x1080").addEventListener("click", function () { exportCoverPNG(1920, 1080); });

window.addEventListener("resize", renderCoverPanels);

// Start with a sample loaded so the first thing you see is a real cover.
loadSamplePhoto("messi");
renderCoverPanels();
