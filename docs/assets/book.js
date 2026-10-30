/* Sổ tay Machine Learning & Deep Learning — khung sách: mục lục, điều hướng, công thức, code. */
(function () {
  "use strict";

  var REPO = "https://github.com/KhangPhanTZ/Machine-learning/blob/main/coursera/Machine_learning/";
  var REPO_PT = "https://github.com/KhangPhanTZ/pytorch-for-deep-learning/blob/main/C1_intro_to_pytorch/";

  var PARTS = [
    { title: "Mở đầu", chapters: [
      { file: "00-loi-mo-dau.html", n: "0", t: "Lời mở đầu & cách dùng sách" },
      { file: "01-ml-la-gi.html", n: "1", t: "Machine Learning là gì?" }
    ]},
    { title: "Phần I · Hồi quy & Phân loại", chapters: [
      { file: "02-hoi-quy-tuyen-tinh.html", n: "2", t: "Hồi quy tuyến tính & hàm chi phí" },
      { file: "03-gradient-descent.html", n: "3", t: "Gradient Descent" },
      { file: "04-nhieu-bien-vectorization.html", n: "4", t: "Hồi quy nhiều biến & vectorization" },
      { file: "05-feature-scaling-engineering.html", n: "5", t: "Feature scaling, learning rate & feature engineering" },
      { file: "06-logistic-regression.html", n: "6", t: "Logistic Regression" },
      { file: "07-overfitting-regularization.html", n: "7", t: "Overfitting & Regularization" }
    ]},
    { title: "Phần II · Thuật toán nâng cao", chapters: [
      { file: "08-neural-network.html", n: "8", t: "Mạng nơ-ron & forward propagation" },
      { file: "09-activation-softmax.html", n: "9", t: "Hàm kích hoạt, Softmax & phân loại đa lớp" },
      { file: "10-backprop-toi-uu.html", n: "10", t: "Backpropagation & tối ưu hoá" },
      { file: "11-danh-gia-mo-hinh.html", n: "11", t: "Đánh giá mô hình, bias & variance" },
      { file: "12-decision-tree.html", n: "12", t: "Cây quyết định & ensemble" }
    ]},
    { title: "Phần III · Học không giám sát, gợi ý & RL", chapters: [
      { file: "13-k-means.html", n: "13", t: "K-means clustering" },
      { file: "14-anomaly-detection.html", n: "14", t: "Phát hiện bất thường" },
      { file: "15-pca.html", n: "15", t: "Giảm chiều với PCA" },
      { file: "16-recommender.html", n: "16", t: "Hệ thống gợi ý" },
      { file: "17-reinforcement-learning.html", n: "17", t: "Học tăng cường & Deep Q-Learning" }
    ]},
    { title: "Phần IV · Deep Learning với PyTorch", chapters: [
      { file: "18-deep-learning-la-gi.html", n: "18", t: "Deep Learning là gì & khi nào nên dùng" },
      { file: "19-tensor.html", n: "19", t: "Tensor — ngôn ngữ dữ liệu của PyTorch" },
      { file: "20-pytorch-mang-dau-tien.html", n: "20", t: "Mạng nơ-ron đầu tiên với PyTorch" },
      { file: "21-mang-sau-feature.html", n: "21", t: "Mạng nhiều lớp & feature engineering" },
      { file: "22-phan-loai-anh-mnist.html", n: "22", t: "Phân loại ảnh: nn.Module, DataLoader, GPU" },
      { file: "23-data-pipeline.html", n: "23", t: "Data pipeline: Dataset, transforms, augmentation" },
      { file: "24-cnn-transfer-learning.html", n: "24", t: "CNN & transfer learning" },
      { file: "25-chuoi-transformer.html", n: "25", t: "Văn bản, chuỗi thời gian & Transformer" },
      { file: "26-ap-dung-domain.html", n: "26", t: "Áp dụng ML & DL vào từng lĩnh vực" }
    ]},
    { title: "Phần V · Deep Learning thực chiến", chapters: [
      { file: "27-huan-luyen-tot-hon.html", n: "27", t: "Huấn luyện tốt hơn & gỡ lỗi mô hình" },
      { file: "28-autoencoder-mo-hinh-sinh.html", n: "28", t: "Autoencoder & mô hình sinh" },
      { file: "29-trien-khai-mlops.html", n: "29", t: "Triển khai & vận hành mô hình" },
      { file: "30-case-study-anh-van-ban.html", n: "30", t: "Case study: ảnh & văn bản" },
      { file: "31-case-study-bang-chuoi.html", n: "31", t: "Case study: dữ liệu bảng & chuỗi thời gian" }
    ]},
    { title: "Phụ lục", chapters: [
      { file: "A-cong-thuc.html", n: "A", t: "Bảng công thức tóm tắt" },
      { file: "B-thuat-ngu.html", n: "B", t: "Thuật ngữ Anh – Việt" },
      { file: "C-lo-trinh.html", n: "C", t: "Lộ trình học tiếp" }
    ]}
  ];

  var ALL = [];
  PARTS.forEach(function (p) { p.chapters.forEach(function (c) { c.part = p.title; ALL.push(c); }); });

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("mlbook:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("mlbook:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  // Áp dụng theme sớm để tránh nháy màu
  var theme = store.get("theme", null);
  if (theme) document.documentElement.setAttribute("data-theme", theme);

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function loadCSS(href) { document.head.appendChild(el("link", { rel: "stylesheet", href: href })); }
  function loadJS(src) {
    return new Promise(function (res, rej) {
      var s = el("script", { src: src }); s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function slug(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  function build() {
    document.body.classList.remove("no-js");
    var here = location.pathname.split("/").pop() || "index.html";
    var idx = -1;
    ALL.forEach(function (c, i) { if (c.file === here) idx = i; });
    var cur = ALL[idx];
    var done = store.get("done", {});

    var article = document.querySelector("article");

    // Thanh trên
    var top = el("header", { class: "topbar" });
    top.innerHTML =
      '<button class="icon-btn menu-btn" aria-label="Mở mục lục">☰</button>' +
      '<a class="brand" href="index.html">Sổ tay <span>ML·DL</span></a>' +
      '<span class="crumb">' + (cur ? cur.part + " — " + cur.t : "Mục lục") + "</span>" +
      '<span class="actions"><button class="icon-btn theme-btn" aria-label="Đổi giao diện sáng/tối" title="Sáng / tối"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg></button></span>' +
      '<div class="progress"></div>';

    // Thanh bên
    var side = el("nav", { class: "sidebar", "aria-label": "Mục lục" });
    var sh = '<input class="search" type="search" placeholder="Tìm chương…" aria-label="Tìm chương">';
    sh += '<ol><li><a href="index.html"' + (here === "index.html" ? ' class="active"' : "") + '><span class="n">⌂</span><span>Trang bìa & mục lục</span></a></li></ol>';
    PARTS.forEach(function (p) {
      sh += "<h4>" + p.title + "</h4><ol>";
      p.chapters.forEach(function (c) {
        sh += '<li data-k="' + (c.n + " " + c.t).toLowerCase() + '"><a href="' + c.file + '"' + (c === cur ? ' class="active"' : "") +
          '><span class="n">' + c.n + "</span><span>" + c.t + "</span>" + (done[c.file] ? '<span class="done" title="Đã đọc">✓</span>' : "") + "</a></li>";
      });
      sh += "</ol>";
    });
    side.innerHTML = sh;

    var layout = el("div", { class: "layout" });
    var main = el("main");
    var toc = el("aside", { class: "page-toc", "aria-label": "Trong chương này" });
    article.parentNode.insertBefore(top, article);
    article.parentNode.insertBefore(layout, article);
    layout.appendChild(side);
    layout.appendChild(main);
    main.appendChild(article);
    main.appendChild(toc);
    document.body.appendChild(el("div", { class: "scrim" }));

    // Mục lục trong trang + neo tiêu đề
    var heads = article.querySelectorAll("h2, h3");
    var th = "<b>Trong chương</b>";
    heads.forEach(function (h) {
      if (h.closest(".keypoints") || h.closest(".chapter-head")) return;
      if (!h.id) h.id = slug(h.textContent);
      h.insertAdjacentHTML("beforeend", '<a class="anchor" href="#' + h.id + '" aria-label="Liên kết">#</a>');
      th += '<a class="' + h.tagName.toLowerCase() + '" href="#' + h.id + '">' + h.textContent.replace(/#$/, "") + "</a>";
    });
    if (heads.length > 2) toc.innerHTML = th; else toc.remove();

    // Liên kết tới notebook (data-nb: repo ML, data-pt: repo PyTorch)
    article.querySelectorAll("[data-nb], [data-pt]").forEach(function (a) {
      a.href = a.hasAttribute("data-pt") ? REPO_PT + a.getAttribute("data-pt") : REPO + a.getAttribute("data-nb");
      a.target = "_blank"; a.rel = "noopener";
    });

    // Điều hướng trước/sau
    if (cur) {
      var pg = el("nav", { class: "pager", "aria-label": "Chuyển chương" });
      var prev = ALL[idx - 1], next = ALL[idx + 1];
      pg.innerHTML =
        (prev ? '<a class="prev" href="' + prev.file + '"><small>← Chương trước</small>' + prev.n + ". " + prev.t + "</a>" : "<span></span>") +
        (next ? '<a class="next" href="' + next.file + '"><small>Chương sau →</small>' + next.n + ". " + next.t + "</a>" : "");
      var md = el("div", { class: "mark-done" });
      var btn = el("button", { class: "icon-btn" }, done[here] ? "✓ Đã đọc xong" : "Đánh dấu đã đọc");
      btn.addEventListener("click", function () {
        var d = store.get("done", {});
        d[here] = !d[here]; store.set("done", d);
        btn.textContent = d[here] ? "✓ Đã đọc xong" : "Đánh dấu đã đọc";
      });
      md.appendChild(btn);
      article.appendChild(md);
      article.appendChild(pg);
      store.set("last", here);
    }

    // Sự kiện
    top.querySelector(".menu-btn").addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
    document.querySelector(".scrim").addEventListener("click", function () { document.body.classList.remove("nav-open"); });
    top.querySelector(".theme-btn").addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
      var t = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", t); store.set("theme", t);
      document.dispatchEvent(new CustomEvent("themechange"));
    });
    side.querySelector(".search").addEventListener("input", function (e) {
      var q = e.target.value.trim().toLowerCase();
      side.querySelectorAll("li[data-k]").forEach(function (li) { li.classList.toggle("hidden", q && li.dataset.k.indexOf(q) < 0); });
    });

    var bar = top.querySelector(".progress");
    var links = toc.querySelectorAll ? toc.querySelectorAll("a") : [];
    function onScroll() {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
      var active = null;
      heads.forEach(function (hd) { if (hd.getBoundingClientRect().top < 120) active = hd.id; });
      links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + active); });
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var act = side.querySelector("a.active");
    if (act) act.scrollIntoView({ block: "center" });

    // Nút copy cho code
    article.querySelectorAll("pre").forEach(function (pre) {
      var b = el("button", { class: "copy", type: "button" }, "Copy");
      b.addEventListener("click", function () {
        var txt = pre.querySelector("code").innerText;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
          b.textContent = "Đã copy"; setTimeout(function () { b.textContent = "Copy"; }, 1200);
        }).catch(function () {});
      });
      pre.appendChild(b);
    });

    // Trang bìa: liên kết "đọc tiếp"
    var resume = document.querySelector("[data-resume]");
    if (resume) {
      var last = store.get("last", null);
      var lc = ALL.filter(function (c) { return c.file === last; })[0];
      if (lc) { resume.href = lc.file; resume.textContent = "Đọc tiếp: " + lc.n + ". " + lc.t; resume.hidden = false; }
    }
    var tocHost = document.querySelector("[data-book-toc]");
    if (tocHost) {
      var desc = {};
      document.querySelectorAll("template").forEach(function (t) {
        t.content.querySelectorAll("[data-desc]").forEach(function (d) { desc[d.getAttribute("data-for")] = d.innerHTML; });
      });
      var out = "";
      PARTS.forEach(function (p) {
        out += '<section class="toc-part"><h3>' + p.title + '</h3><ol class="toc-list">';
        p.chapters.forEach(function (c) {
          out += '<li><a href="' + c.file + '"><span class="n">' + c.n + '</span><span class="t">' + c.t + (done[c.file] ? " ✓" : "") +
            '</span><span class="d">' + (desc[c.file] || "") + "</span></a></li>";
        });
        out += "</ol></section>";
      });
      tocHost.innerHTML = out;
    }
  }

  // Thư viện ngoài: KaTeX (công thức) + highlight.js (tô màu code)
  function enhance() {
    var hasMath = /\\\(|\$\$/.test(document.body.innerHTML);
    var hasCode = document.querySelector("pre code");
    if (hasMath) {
      loadCSS("assets/vendor/katex/katex.min.css");
      loadJS("assets/vendor/katex/katex.min.js")
        .then(function () { return loadJS("assets/vendor/katex/auto-render.min.js"); })
        .then(function () {
          window.renderMathInElement(document.querySelector("article"), {
            delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }],
            ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
            throwOnError: false
          });
        }).catch(function () {});
    }
    if (hasCode) {
      var dark = function () {
        var t = document.documentElement.getAttribute("data-theme");
        return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      };
      var link = el("link", { rel: "stylesheet" });
      var setHl = function () {
        link.href = "assets/vendor/hljs/" + (dark() ? "github-dark" : "github") + ".min.css";
      };
      setHl(); document.head.appendChild(link);
      document.addEventListener("themechange", setHl);
      loadJS("assets/vendor/hljs/highlight.min.js").then(function () {
        document.querySelectorAll("pre code").forEach(function (b) { window.hljs.highlightElement(b); });
      }).catch(function () {});
    }
  }

  // Font
  var pre1 = el("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" });
  document.head.appendChild(pre1);
  loadCSS("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap");

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { build(); enhance(); });
  else { build(); enhance(); }

  window.MLBook = { parts: PARTS };
})();
