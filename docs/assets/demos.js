/* Các demo tương tác nhỏ cho từng chương. Mỗi demo gắn vào một <div class="demo" data-demo="...">. */
(function () {
  "use strict";

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  var SERIES = ["#2a9d8f", "#e76f51", "#6a4c93", "#e9c46a", "#457b9d"];

  // Canvas sắc nét trên màn hình retina
  function setupCanvas(cv, w, h) {
    var r = window.devicePixelRatio || 1;
    cv.width = w * r; cv.height = h * r;
    var ctx = cv.getContext("2d"); ctx.setTransform(r, 0, 0, r, 0, 0);
    return ctx;
  }
  // Hệ trục: ánh xạ dữ liệu -> pixel
  function Axes(ctx, W, H, xr, yr, pad) {
    pad = pad || 36;
    this.ctx = ctx; this.W = W; this.H = H; this.xr = xr; this.yr = yr; this.pad = pad;
  }
  Axes.prototype.X = function (x) { return this.pad + (x - this.xr[0]) / (this.xr[1] - this.xr[0]) * (this.W - this.pad - 12); };
  Axes.prototype.Y = function (y) { return this.H - this.pad + -(y - this.yr[0]) / (this.yr[1] - this.yr[0]) * (this.H - this.pad - 12); };
  Axes.prototype.invX = function (px) { return this.xr[0] + (px - this.pad) / (this.W - this.pad - 12) * (this.xr[1] - this.xr[0]); };
  Axes.prototype.invY = function (py) { return this.yr[0] + (this.H - this.pad - py) / (this.H - this.pad - 12) * (this.yr[1] - this.yr[0]); };
  Axes.prototype.frame = function (xl, yl, ticks) {
    var c = this.ctx, s = this;
    c.clearRect(0, 0, s.W, s.H);
    c.strokeStyle = css("--rule"); c.lineWidth = 1; c.fillStyle = css("--ink-faint");
    c.font = "11px " + css("--font-ui");
    (ticks || 5) && [0, 1, 2, 3, 4].forEach(function (i) {
      var gx = s.xr[0] + i / 4 * (s.xr[1] - s.xr[0]), gy = s.yr[0] + i / 4 * (s.yr[1] - s.yr[0]);
      c.beginPath(); c.moveTo(s.X(gx), s.Y(s.yr[0])); c.lineTo(s.X(gx), s.Y(s.yr[1])); c.stroke();
      c.beginPath(); c.moveTo(s.X(s.xr[0]), s.Y(gy)); c.lineTo(s.X(s.xr[1]), s.Y(gy)); c.stroke();
      c.textAlign = "center"; c.fillText(+gx.toFixed(2), s.X(gx), s.H - s.pad + 14);
      c.textAlign = "right"; c.fillText(+gy.toFixed(2), s.pad - 4, s.Y(gy) + 4);
    });
    c.textAlign = "right"; if (xl) c.fillText(xl, s.W - 12, s.H - s.pad - 6);
    c.textAlign = "left"; if (yl) c.fillText(yl, s.pad + 4, 22);
  };
  Axes.prototype.curve = function (f, color, width, dash) {
    var c = this.ctx, n = 200;
    c.strokeStyle = color; c.lineWidth = width || 2.5; c.setLineDash(dash || []);
    var path = new Path2D();
    for (var i = 0; i <= n; i++) {
      var x = this.xr[0] + i / n * (this.xr[1] - this.xr[0]);
      var y = Math.max(this.yr[0] - 10, Math.min(this.yr[1] + 10, f(x)));
      i ? path.lineTo(this.X(x), this.Y(y)) : path.moveTo(this.X(x), this.Y(y));
    }
    c.save(); c.beginPath(); c.rect(this.pad, 0, this.W, this.H - this.pad); c.clip();
    c.stroke(path); c.restore(); c.setLineDash([]);
  };
  Axes.prototype.dot = function (x, y, color, r, shape) {
    var c = this.ctx, px = this.X(x), py = this.Y(y); r = r || 4.5;
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = 2.2;
    if (shape === "x") { c.beginPath(); c.moveTo(px - r, py - r); c.lineTo(px + r, py + r); c.moveTo(px + r, py - r); c.lineTo(px - r, py + r); c.stroke(); }
    else if (shape === "o") { c.beginPath(); c.arc(px, py, r, 0, 7); c.stroke(); }
    else { c.beginPath(); c.arc(px, py, r, 0, 7); c.fill(); }
  };

  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(r) { var u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function q(root, s) { return root.querySelector(s); }

  var demos = {};

  /* ---------- 1. Gradient descent cho hồi quy tuyến tính ---------- */
  demos.gd = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: Gradient Descent tìm w và b</div>' +
      '<div class="demo-sub">Dữ liệu giá nhà (diện tích, nghìn sqft → giá, trăm nghìn $). Kéo α rồi bấm “Chạy”. Bấm vào biểu đồ để thêm điểm.</div>' +
      '<canvas width="700" height="300"></canvas>' +
      '<canvas class="cost" width="700" height="140" style="margin-top:8px"></canvas>' +
      '<div class="controls"><label>α <input type="range" min="-3" max="0" step="0.05" value="-1.3"><span class="a readout"></span></label>' +
      '<button class="run">Chạy</button><button class="ghost step">1 bước</button><button class="ghost reset">Đặt lại</button>' +
      '<span class="readout info"></span></div>';
    var cv = q(root, "canvas"), cv2 = q(root, ".cost"), W = 700, H = 300;
    var ctx = setupCanvas(cv, W, H), ctx2 = setupCanvas(cv2, W, 140);
    var ax = new Axes(ctx, W, H, [0, 3], [0, 6]);
    var pts = [[1, 3], [2, 5], [1.5, 3.6], [2.4, 4.9], [0.8, 2.1], [2.8, 5.8], [1.2, 2.9]];
    var w, b, hist, timer = null, it;
    function cost() { var s = 0; pts.forEach(function (p) { var e = w * p[0] + b - p[1]; s += e * e; }); return s / (2 * pts.length); }
    function reset() { w = 0; b = 0; it = 0; hist = [cost()]; draw(); }
    function alpha() { return Math.pow(10, +q(root, "input").value); }
    function step() {
      var dw = 0, db = 0, m = pts.length;
      pts.forEach(function (p) { var e = w * p[0] + b - p[1]; dw += e * p[0]; db += e; });
      w -= alpha() * dw / m; b -= alpha() * db / m; it++;
      hist.push(cost()); if (hist.length > 400) hist.shift();
      draw();
    }
    function draw() {
      ax.frame("x", "y");
      ax.curve(function (x) { return w * x + b; }, css("--accent"), 3);
      pts.forEach(function (p) {
        ax.dot(p[0], p[1], SERIES[1], 5, "x");
        ctx.strokeStyle = css("--ink-faint"); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax.X(p[0]), ax.Y(p[1])); ctx.lineTo(ax.X(p[0]), ax.Y(w * p[0] + b)); ctx.stroke(); ctx.setLineDash([]);
      });
      var J = cost();
      var mx = Math.max.apply(null, hist.filter(isFinite).concat([1e-9]));
      var a2 = new Axes(ctx2, W, 140, [0, Math.max(10, hist.length - 1)], [0, Math.min(mx, 1e6)], 36);
      a2.frame("vòng lặp", "J(w,b)");
      ctx2.strokeStyle = SERIES[2]; ctx2.lineWidth = 2; ctx2.beginPath();
      hist.forEach(function (h, i) { var y = a2.Y(Math.min(h, mx)); i ? ctx2.lineTo(a2.X(i), y) : ctx2.moveTo(a2.X(i), y); });
      ctx2.stroke();
      q(root, ".a").textContent = alpha().toFixed(3);
      q(root, ".info").textContent = "lần " + it + " · w=" + w.toFixed(3) + " · b=" + b.toFixed(3) + " · J=" + (isFinite(J) ? J.toFixed(4) : "∞ (phân kỳ!)");
    }
    q(root, ".run").onclick = function () {
      if (timer) { clearInterval(timer); timer = null; this.textContent = "Chạy"; return; }
      var btn = this; btn.textContent = "Dừng";
      timer = setInterval(function () { step(); if (!isFinite(cost()) || it > 3000) { clearInterval(timer); timer = null; btn.textContent = "Chạy"; } }, 30);
    };
    q(root, ".step").onclick = step;
    q(root, ".reset").onclick = reset;
    q(root, "input").oninput = draw;
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      pts.push([ax.invX((e.clientX - r.left) * W / r.width), ax.invY((e.clientY - r.top) * H / r.height)]);
      hist = [cost()]; draw();
    });
    document.addEventListener("themechange", draw);
    reset();
  };

  /* ---------- 2. Sigmoid & ranh giới quyết định ---------- */
  demos.sigmoid = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: Sigmoid g(wx + b)</div>' +
      '<div class="demo-sub">Kéo w và b, xem đường cong xác suất và ngưỡng 0.5 (ranh giới quyết định) dịch chuyển. Chi phí logistic tính trên 8 điểm dữ liệu.</div>' +
      '<canvas width="700" height="300"></canvas>' +
      '<div class="controls"><label>w <input class="w" type="range" min="-6" max="6" step="0.1" value="2"></label>' +
      '<label>b <input class="b" type="range" min="-12" max="12" step="0.1" value="-5"></label><span class="readout info"></span></div>';
    var cv = q(root, "canvas"), W = 700, H = 300, ctx = setupCanvas(cv, W, H);
    var ax = new Axes(ctx, W, H, [0, 6], [-0.1, 1.1]);
    var data = [[0.5, 0], [1, 0], [1.5, 0], [2, 0], [3, 1], [3.6, 1], [4.2, 1], [5, 1]];
    function draw() {
      var w = +q(root, ".w").value, b = +q(root, ".b").value;
      ax.frame("x (khối u)", "P(y=1|x)");
      ctx.strokeStyle = css("--ink-faint"); ctx.setLineDash([4, 4]); ctx.beginPath();
      ctx.moveTo(ax.X(0), ax.Y(0.5)); ctx.lineTo(ax.X(6), ax.Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
      ax.curve(function (x) { return 1 / (1 + Math.exp(-(w * x + b))); }, css("--accent"), 3);
      var J = 0;
      data.forEach(function (d) {
        var f = 1 / (1 + Math.exp(-(w * d[0] + b)));
        f = Math.min(Math.max(f, 1e-12), 1 - 1e-12);
        J += -d[1] * Math.log(f) - (1 - d[1]) * Math.log(1 - f);
        ax.dot(d[0], d[1], d[1] ? SERIES[1] : SERIES[0], 6, d[1] ? "x" : "o");
      });
      var txt = "J = " + (J / data.length).toFixed(3);
      if (Math.abs(w) > 1e-6) {
        var xb = -b / w;
        if (xb > 0 && xb < 6) {
          ctx.strokeStyle = SERIES[2]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax.X(xb), ax.Y(-0.1)); ctx.lineTo(ax.X(xb), ax.Y(1.1)); ctx.stroke();
        }
        txt += " · ranh giới x = −b/w = " + xb.toFixed(2);
      }
      q(root, ".info").textContent = "w=" + w.toFixed(1) + " · b=" + b.toFixed(1) + " · " + txt;
    }
    root.querySelectorAll("input").forEach(function (i) { i.oninput = draw; });
    document.addEventListener("themechange", draw);
    draw();
  };

  /* ---------- 3. Overfitting: bậc đa thức + λ ---------- */
  function solve(A, y) { // Khử Gauss cho hệ nhỏ
    var n = A.length, M = A.map(function (r, i) { return r.concat([y[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      if (Math.abs(M[c][c]) < 1e-12) continue;
      for (r = 0; r < n; r++) if (r !== c) { var f = M[r][c] / M[c][c]; for (var k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(function (r, i) { return Math.abs(r[i]) < 1e-12 ? 0 : r[n] / r[i]; });
  }
  demos.overfit = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: Underfit ↔ Overfit và tác dụng của λ</div>' +
      '<div class="demo-sub">Khớp đa thức bậc d (ridge regression). Điểm tròn = train, điểm × = cross-validation. Tăng bậc để thấy overfit, rồi tăng λ để “kéo” mô hình về.</div>' +
      '<canvas width="700" height="300"></canvas>' +
      '<div class="controls"><label>bậc d <input class="d" type="range" min="1" max="12" step="1" value="1"><span class="dv readout"></span></label>' +
      '<label>log₁₀ λ <input class="l" type="range" min="-8" max="2" step="0.25" value="-8"><span class="lv readout"></span></label>' +
      '<button class="ghost new">Dữ liệu mới</button><span class="readout info"></span></div>';
    var cv = q(root, "canvas"), W = 700, H = 300, ctx = setupCanvas(cv, W, H);
    var ax = new Axes(ctx, W, H, [0, 1], [-1.6, 1.6]);
    var tr, cvset, seed = 7;
    function truth(x) { return Math.sin(2 * Math.PI * x) * 0.9 + 0.3 * x; }
    function gen() {
      var r = rng(seed++); tr = []; cvset = [];
      for (var i = 0; i < 12; i++) { var x = 0.03 + 0.94 * i / 11 + (r() - .5) * .04; tr.push([x, truth(x) + gauss(r) * .22]); }
      for (i = 0; i < 12; i++) { x = r(); cvset.push([x, truth(x) + gauss(r) * .22]); }
    }
    function feats(x, d) { var f = []; for (var j = 0; j <= d; j++) f.push(Math.pow(2 * x - 1, j)); return f; }
    function draw() {
      var d = +q(root, ".d").value, lam = Math.pow(10, +q(root, ".l").value);
      var n = d + 1, A = [], yv = [];
      for (var i = 0; i < n; i++) { A.push(new Array(n).fill(0)); yv.push(0); }
      tr.forEach(function (p) { var f = feats(p[0], d); for (var i = 0; i < n; i++) { yv[i] += f[i] * p[1]; for (var j = 0; j < n; j++) A[i][j] += f[i] * f[j]; } });
      for (i = 1; i < n; i++) A[i][i] += lam * tr.length; // không phạt hệ số tự do
      var th = solve(A, yv);
      var f = function (x) { var s = 0, ft = feats(x, d); for (var i = 0; i < n; i++) s += th[i] * ft[i]; return s; };
      var mse = function (S) { var s = 0; S.forEach(function (p) { var e = f(p[0]) - p[1]; s += e * e; }); return s / (2 * S.length); };
      ax.frame("x", "y");
      ax.curve(truth, css("--ink-faint"), 1.5, [5, 5]);
      ax.curve(f, css("--accent"), 3);
      tr.forEach(function (p) { ax.dot(p[0], p[1], SERIES[0], 5); });
      cvset.forEach(function (p) { ax.dot(p[0], p[1], SERIES[1], 5, "x"); });
      var jt = mse(tr), jc = mse(cvset);
      var diag = jt > 0.06 ? "bias cao (underfit)" : (jc > 2.5 * jt + 0.02 ? "variance cao (overfit)" : "vừa khớp ✓");
      q(root, ".dv").textContent = d; q(root, ".lv").textContent = lam < 1e-7 ? "≈0" : lam.toPrecision(2);
      q(root, ".info").textContent = "J_train=" + jt.toFixed(3) + " · J_cv=" + jc.toFixed(3) + " → " + diag;
    }
    root.querySelectorAll("input").forEach(function (i) { i.oninput = draw; });
    q(root, ".new").onclick = function () { gen(); draw(); };
    document.addEventListener("themechange", draw);
    gen(); draw();
  };

  /* ---------- 4. Softmax ---------- */
  demos.softmax = function (root) {
    var N = 4;
    var h = '<div class="demo-title">Thử nghiệm: Softmax biến logits thành xác suất</div>' +
      '<div class="demo-sub">Kéo các logit z. Tổng xác suất luôn bằng 1; logit lớn nhất “thắng” nhưng các lớp khác vẫn có phần.</div>' +
      '<canvas width="700" height="220"></canvas><div class="controls">';
    for (var i = 0; i < N; i++) h += '<label>z' + (i + 1) + ' <input type="range" min="-4" max="6" step="0.1" value="' + [1, 2, 0.5, -1][i] + '" style="width:110px"></label>';
    root.innerHTML = h + '</div>';
    var cv = q(root, "canvas"), W = 700, H = 220, ctx = setupCanvas(cv, W, H);
    function draw() {
      var z = [].map.call(root.querySelectorAll("input"), function (i) { return +i.value; });
      var mx = Math.max.apply(null, z), ez = z.map(function (v) { return Math.exp(v - mx); });
      var s = ez.reduce(function (a, b) { return a + b; }, 0), a = ez.map(function (v) { return v / s; });
      ctx.clearRect(0, 0, W, H);
      var bw = (W - 80) / N;
      ctx.font = "13px " + css("--font-ui"); ctx.textAlign = "center";
      a.forEach(function (p, i) {
        var x = 40 + i * bw + bw * .2, w = bw * .6, hh = p * (H - 70);
        ctx.fillStyle = SERIES[i]; ctx.fillRect(x, H - 36 - hh, w, hh);
        ctx.fillStyle = css("--ink"); ctx.fillText((p * 100).toFixed(1) + "%", x + w / 2, H - 42 - hh);
        ctx.fillStyle = css("--ink-faint"); ctx.fillText("a" + (i + 1) + "  (z=" + z[i].toFixed(1) + ")", x + w / 2, H - 14);
      });
    }
    root.querySelectorAll("input").forEach(function (i) { i.oninput = draw; });
    document.addEventListener("themechange", draw);
    draw();
  };

  /* ---------- 5. K-means ---------- */
  demos.kmeans = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: K-means từng bước</div>' +
      '<div class="demo-sub">Mỗi “bước” xen kẽ: (1) gán điểm về tâm gần nhất, (2) dời tâm về trung bình cụm. Bấm vào biểu đồ để thêm điểm.</div>' +
      '<canvas width="700" height="320"></canvas>' +
      '<div class="controls"><label>K <input class="k" type="range" min="2" max="5" step="1" value="3"><span class="kv readout"></span></label>' +
      '<button class="step">Bước tiếp</button><button class="ghost init">Khởi tạo lại tâm</button><button class="ghost new">Dữ liệu mới</button>' +
      '<span class="readout info"></span></div>';
    var cv = q(root, "canvas"), W = 700, H = 320, ctx = setupCanvas(cv, W, H);
    var ax = new Axes(ctx, W, H, [0, 10], [0, 6]);
    var X = [], C = [], idx = [], phase = 0, iter = 0, seed = 3, trail = [];
    function gen() {
      var r = rng(seed++); X = [];
      var centers = [[2, 4.5], [6.5, 3.2], [3.5, 1.3], [8.3, 5], [8, 1]];
      for (var c = 0; c < 4; c++) for (var i = 0; i < 40; i++) X.push([centers[c][0] + gauss(r) * .6, centers[c][1] + gauss(r) * .45]);
    }
    function init() {
      var K = +q(root, ".k").value, r = rng(seed * 7 + K);
      C = []; var used = {};
      while (C.length < K) { var j = Math.floor(r() * X.length); if (!used[j]) { used[j] = 1; C.push(X[j].slice()); } }
      idx = X.map(function () { return -1; }); phase = 0; iter = 0; trail = C.map(function (c) { return [c.slice()]; });
      draw();
    }
    function distortion() { var s = 0; X.forEach(function (p, i) { if (idx[i] >= 0) { var c = C[idx[i]]; s += Math.pow(p[0] - c[0], 2) + Math.pow(p[1] - c[1], 2); } }); return s / X.length; }
    function step() {
      if (phase === 0) {
        idx = X.map(function (p) { var best = 0, bd = Infinity; C.forEach(function (c, k) { var d = Math.pow(p[0] - c[0], 2) + Math.pow(p[1] - c[1], 2); if (d < bd) { bd = d; best = k; } }); return best; });
      } else {
        C = C.map(function (c, k) { var sx = 0, sy = 0, n = 0; X.forEach(function (p, i) { if (idx[i] === k) { sx += p[0]; sy += p[1]; n++; } }); return n ? [sx / n, sy / n] : c; });
        C.forEach(function (c, k) { trail[k].push(c.slice()); });
        iter++;
      }
      phase = 1 - phase; draw();
    }
    function draw() {
      ax.frame("x₁", "x₂");
      X.forEach(function (p, i) { ax.dot(p[0], p[1], idx[i] >= 0 ? SERIES[idx[i]] : css("--ink-faint"), 3.5, "o"); });
      trail.forEach(function (t) {
        ctx.strokeStyle = css("--ink"); ctx.lineWidth = 1.5; ctx.beginPath();
        t.forEach(function (c, i) { i ? ctx.lineTo(ax.X(c[0]), ax.Y(c[1])) : ctx.moveTo(ax.X(c[0]), ax.Y(c[1])); }); ctx.stroke();
      });
      C.forEach(function (c, k) {
        ax.dot(c[0], c[1], css("--ink"), 9, "x"); ax.dot(c[0], c[1], SERIES[k], 6, "x");
      });
      q(root, ".kv").textContent = C.length;
      q(root, ".info").textContent = "vòng " + iter + " · bước tiếp: " + (phase === 0 ? "gán cụm" : "dời tâm") + (idx[0] >= 0 ? " · J = " + distortion().toFixed(3) : "");
    }
    q(root, ".step").onclick = step;
    q(root, ".init").onclick = init;
    q(root, ".new").onclick = function () { gen(); init(); };
    q(root, ".k").oninput = init;
    cv.addEventListener("click", function (e) {
      var r = cv.getBoundingClientRect();
      X.push([ax.invX((e.clientX - r.left) * W / r.width), ax.invY((e.clientY - r.top) * H / r.height)]); idx.push(-1); draw();
    });
    document.addEventListener("themechange", draw);
    gen(); init();
  };

  /* ---------- 6. Entropy ---------- */
  demos.entropy = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: Entropy H(p₁)</div>' +
      '<div class="demo-sub">p₁ = tỉ lệ nấm ăn được tại một nút. Nút “thuần” (p₁ = 0 hoặc 1) có entropy 0; nút lẫn lộn 50/50 có entropy cao nhất = 1.</div>' +
      '<canvas width="700" height="240"></canvas>' +
      '<div class="controls"><label>p₁ <input type="range" min="0" max="1" step="0.01" value="0.3"></label><span class="readout info"></span></div>';
    var cv = q(root, "canvas"), W = 700, H = 240, ctx = setupCanvas(cv, W, H);
    var ax = new Axes(ctx, W, H, [0, 1], [0, 1.05]);
    function Hf(p) { return p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
    function draw() {
      var p = +q(root, "input").value;
      ax.frame("p₁", "H(p₁)");
      ax.curve(Hf, css("--accent"), 3);
      ax.dot(p, Hf(p), SERIES[1], 7);
      q(root, ".info").textContent = "H(" + p.toFixed(2) + ") = " + Hf(p).toFixed(3) + " bit";
    }
    q(root, "input").oninput = draw;
    document.addEventListener("themechange", draw);
    draw();
  };

  /* ---------- 7. Phân phối Gauss & ngưỡng ε ---------- */
  demos.gauss = function (root) {
    root.innerHTML =
      '<div class="demo-title">Thử nghiệm: Ngưỡng ε cho phát hiện bất thường</div>' +
      '<div class="demo-sub">Đường cong là p(x) ước lượng từ dữ liệu bình thường (μ, σ²). Điểm có p(x) &lt; ε bị gắn cờ bất thường (đỏ).</div>' +
      '<canvas width="700" height="260"></canvas>' +
      '<div class="controls"><label>log₁₀ ε <input type="range" min="-5" max="-0.5" step="0.05" value="-2"></label><span class="readout info"></span></div>';
    var cv = q(root, "canvas"), W = 700, H = 260, ctx = setupCanvas(cv, W, H);
    var r = rng(11), xs = [];
    for (var i = 0; i < 60; i++) xs.push({ x: 5 + gauss(r) * 1.1, y: 0 });
    [0.8, 9.6, 10.4, 1.6].forEach(function (x) { xs.push({ x: x, y: 1 }); });
    var mu = 0, v = 0, nn = 0;
    xs.forEach(function (p) { if (!p.y) { mu += p.x; nn++; } }); mu /= nn;
    xs.forEach(function (p) { if (!p.y) v += Math.pow(p.x - mu, 2); }); v /= nn;
    function P(x) { return Math.exp(-Math.pow(x - mu, 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v); }
    var ax = new Axes(ctx, W, H, [0, 11], [0, P(mu) * 1.15]);
    function draw() {
      var eps = Math.pow(10, +q(root, "input").value);
      ax.frame("x", "p(x)");
      ax.curve(P, css("--accent"), 3);
      ctx.strokeStyle = SERIES[1]; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(ax.X(0), ax.Y(eps)); ctx.lineTo(ax.X(11), ax.Y(eps)); ctx.stroke(); ctx.setLineDash([]);
      var tp = 0, fp = 0, fn = 0;
      xs.forEach(function (p) {
        var flag = P(p.x) < eps;
        if (flag && p.y) tp++; else if (flag) fp++; else if (p.y) fn++;
        ax.dot(p.x, P(p.x), flag ? SERIES[1] : SERIES[0], 5, p.y ? "x" : null);
      });
      var pr = tp + fp ? tp / (tp + fp) : 0, rc = tp + fn ? tp / (tp + fn) : 0, F1 = pr + rc ? 2 * pr * rc / (pr + rc) : 0;
      q(root, ".info").textContent = "ε=" + eps.toExponential(1) + " · μ=" + mu.toFixed(2) + " σ²=" + v.toFixed(2) + " · precision=" + pr.toFixed(2) + " recall=" + rc.toFixed(2) + " F1=" + F1.toFixed(2);
    }
    q(root, "input").oninput = draw;
    document.addEventListener("themechange", draw);
    draw();
  };

  function boot() {
    document.querySelectorAll("[data-demo]").forEach(function (root) {
      var f = demos[root.getAttribute("data-demo")];
      if (f) try { f(root); } catch (e) { root.textContent = "Không tải được demo: " + e.message; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
