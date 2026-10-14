// Interactive pieces: topic x year timeline, topic network, career timeline, filterable paper list.
// Adapted from cv-and-website/site/mockups/shared/viz.js (see docs/copied-from.md).
(function () {
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const topicColor = (id) => css("--c-" + id) || "#888";
  const topicLabel = (id) => (TOPICS.find((t) => t.id === id) || { label: id }).label;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const state = { topic: null, listeners: [] };
  const lead = (p) => p.lead;

  function setTopic(id) {
    state.topic = state.topic === id ? null : id;
    state.listeners.forEach((fn) => fn(state.topic));
  }
  function onTopic(fn) { state.listeners.push(fn); }

  // ---- tooltip
  let tip;
  function showTip(evt, p) {
    if (!tip) { tip = document.createElement("div"); tip.className = "viz-tip"; document.body.appendChild(tip); }
    tip.innerHTML = `<strong>${esc(p.title)}</strong><span>${esc(p.venue || "")} &middot; ${p.year}${p.citations ? " &middot; " + p.citations + " citations" : ""}</span>`;
    tip.style.display = "block";
    tip.style.left = Math.min(evt.clientX + 14, window.innerWidth - 300) + "px";
    tip.style.top = evt.clientY + 14 + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; }
  const open = (p) => p.url && window.open(p.url, "_blank", "noopener");

  // ---- publication list (topic chips + text search)
  function renderPubs(el) {
    el.innerHTML = `<div class="pub-tools"><input type="search" class="pub-search" placeholder="Search titles, authors, journals" aria-label="Search papers">
      <span class="seg pub-sort"><button data-s="new" class="on">Newest</button><button data-s="cited">Most cited</button></span>
      <span class="pub-count"></span></div><div class="pub-body"></div>`;
    const body = el.querySelector(".pub-body"), count = el.querySelector(".pub-count"), search = el.querySelector(".pub-search");
    let sort = "new";
    el.querySelectorAll(".pub-sort button").forEach((b) => b.onclick = () => {
      sort = b.dataset.s; el.querySelectorAll(".pub-sort button").forEach((x) => x.classList.toggle("on", x === b)); draw();
    });
    function draw() {
      const q = search.value.trim().toLowerCase(), topic = state.topic;
      const items = PUBS.filter((p) => (!topic || p.topics.includes(topic)) &&
        (!q || (p.title + " " + p.authors + " " + p.venue).toLowerCase().includes(q)));
      if (sort === "cited") items.sort((a, b) => (b.citations || 0) - (a.citations || 0));
      count.innerHTML = topic ? `${items.length} papers on <b>${esc(topicLabel(topic))}</b> <button class="pub-clear">Clear</button>` : `${items.length} papers`;
      let year = null, html = "";
      items.forEach((p) => {
        if (sort === "new" && p.year !== year) { year = p.year; html += `<h4 class="pub-year">${year}</h4>`; }
        const authors = esc(p.authors).replace(/\b(RE? Nelson|Nelson RE?)\b/, (m) => `<b>${m}</b>`);
        const title = p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title);
        const chips = p.topics.map((t) => `<button class="chip" data-t="${t}" style="--chip:${topicColor(t)}">${esc(topicLabel(t))}</button>`).join("");
        html += `<article class="pub"><div class="pub-title">${title}</div><div class="pub-authors">${authors}</div>
          <div class="pub-meta"><i>${esc(p.venue || "")}</i>${sort === "cited" ? " &middot; " + p.year : ""}${p.citations ? ` &middot; ${p.citations} citations` : ""}</div>
          <div class="pub-chips">${chips}</div></article>`;
      });
      body.innerHTML = html || `<p class="pub-none">No papers match.</p>`;
      body.querySelectorAll(".chip").forEach((b) => b.onclick = () => setTopic(b.dataset.t));
      const c = count.querySelector(".pub-clear"); if (c) c.onclick = () => setTopic(state.topic);
    }
    search.oninput = draw;
    draw();
    onTopic(draw);
  }

  // ---- topic x year dot timeline; papers in one cell pack into a small grid
  function renderMatrix(el) {
    const years = PUBS.map((p) => p.year);
    const y0 = Math.min(...years), y1 = Math.max(...years);
    const cols = 3, step = 10, r = 4, colW = cols * step + 10, labelW = 190, top = 26;
    const rows = TOPICS.map((t) => {
      let max = 1;
      for (let y = y0; y <= y1; y++) max = Math.max(max, PUBS.filter((p) => p.year === y && p.topics.includes(t.id)).length);
      return Math.max(34, Math.ceil(max / cols) * step + 14);
    });
    const W = labelW + (y1 - y0 + 1) * colW + 6, H = top + rows.reduce((a, b) => a + b, 0) + 4;
    const ns = "http://www.w3.org/2000/svg", mk = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const svg = mk("svg", { viewBox: `0 0 ${W} ${H}`, class: "matrix" });
    svg.style.minWidth = Math.round(W * 0.72) + "px";
    const colX = (y) => labelW + (y - y0) * colW + colW / 2;
    for (let y = y0; y <= y1; y++) {
      if ((y - y0) % 2 === 0 || y === y1) { const t = mk("text", { x: colX(y), y: 14, class: "m-year" }); t.textContent = "'" + String(y).slice(2); svg.appendChild(t); }
    }
    const dots = [];
    let cy0 = top;
    TOPICS.forEach((topic, i) => {
      const h = rows[i], g = mk("g", { class: "m-row" }); g.dataset.t = topic.id;
      g.appendChild(mk("rect", { x: 0, y: cy0 + 2, width: W, height: h - 4, rx: 4, class: "m-bg" }));
      const lab = mk("text", { x: 8, y: cy0 + h / 2 + 4, class: "m-label" }); lab.textContent = topic.label; g.appendChild(lab);
      g.onclick = () => setTopic(topic.id);
      svg.appendChild(g);
      for (let y = y0; y <= y1; y++) {
        const ps = PUBS.filter((p) => p.year === y && p.topics.includes(topic.id));
        const nrow = Math.ceil(ps.length / cols);
        ps.forEach((p, k) => {
          const row = Math.floor(k / cols), col = k % cols, inRow = Math.min(cols, ps.length - row * cols);
          const cx = colX(y) + (col - (inRow - 1) / 2) * step, cy = cy0 + h / 2 + (row - (nrow - 1) / 2) * step;
          const c = mk("circle", { cx, cy, r, fill: lead(p) ? topicColor(topic.id) : "transparent", stroke: topicColor(topic.id), "stroke-width": 1.6, class: "m-dot" });
          c.__p = p;
          c.onmouseenter = (e) => { dots.forEach((d) => d.classList.toggle("m-hot", d.__p === p)); svg.classList.add("m-hovering"); showTip(e, p); };
          c.onmousemove = (e) => showTip(e, p);
          c.onmouseleave = () => { svg.classList.remove("m-hovering"); dots.forEach((d) => d.classList.remove("m-hot")); hideTip(); };
          c.onclick = (e) => { e.stopPropagation(); open(p); };
          dots.push(c); svg.appendChild(c);
        });
      }
      cy0 += h;
    });
    el.appendChild(svg);
    onTopic((t) => svg.querySelectorAll(".m-row").forEach((row) => row.classList.toggle("m-active", row.dataset.t === t)));
  }

  // ---- force-directed topic network (needs d3)
  function renderNetwork(el, opts = {}) {
    el.innerHTML = "";
    const W = el.clientWidth || 800, H = opts.height || 480;
    const nodes = TOPICS.map((t) => ({ id: t.id, kind: "topic", n: PUBS.filter((p) => p.topics.includes(t.id)).length }))
      .concat(PUBS.map((p, i) => ({ id: "p" + i, kind: "pub", p })));
    const links = [];
    PUBS.forEach((p, i) => p.topics.forEach((t) => links.push({ source: "p" + i, target: t })));
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "net");
    const link = svg.append("g").selectAll("line").data(links).join("line").attr("class", "n-link").attr("stroke", (d) => topicColor(d.target));
    const node = svg.append("g").selectAll("g").data(nodes).join("g").attr("class", (d) => "n-" + d.kind);
    const rad = (d) => d.kind === "topic" ? 9 + Math.sqrt(d.n) * 2.6 : 4.5;
    node.append("circle").attr("r", rad)
      .attr("fill", (d) => d.kind === "topic" ? topicColor(d.id) : (lead(d.p) ? css("--ink") : css("--bg")))
      .attr("stroke", (d) => d.kind === "topic" ? "none" : css("--ink")).attr("stroke-width", 1.3);
    node.filter((d) => d.kind === "topic").append("text").attr("class", "n-label")
      .attr("dy", (d) => rad(d) + 14).attr("text-anchor", "middle").text((d) => topicLabel(d.id));
    node.filter((d) => d.kind === "topic").on("click", (e, d) => setTopic(d.id)).raise();
    node.filter((d) => d.kind === "pub")
      .on("mouseenter", (e, d) => { showTip(e, d.p); link.classed("n-hot", (l) => l.source === d); })
      .on("mousemove", (e, d) => showTip(e, d.p))
      .on("mouseleave", () => { hideTip(); link.classed("n-hot", false); })
      .on("click", (e, d) => open(d.p));
    // Topics sit on an ellipse; papers settle between the topics they belong to.
    const k = TOPICS.length;
    nodes.forEach((d) => {
      if (d.kind !== "topic") return;
      const i = TOPICS.findIndex((t) => t.id === d.id), a = -Math.PI / 2 + (2 * Math.PI * i) / k;
      d.tx = W / 2 + Math.cos(a) * W * 0.36; d.ty = H / 2 + Math.sin(a) * H * 0.36; d.x = d.tx; d.y = d.ty;
    });
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(30).strength(0.25))
      .force("charge", d3.forceManyBody().strength((d) => d.kind === "topic" ? -60 : -14))
      .force("collide", d3.forceCollide((d) => rad(d) + (d.kind === "topic" ? 6 : 2)))
      .force("x", d3.forceX((d) => d.kind === "topic" ? d.tx : W / 2).strength((d) => d.kind === "topic" ? 0.9 : 0.02))
      .force("y", d3.forceY((d) => d.kind === "topic" ? d.ty : H / 2).strength((d) => d.kind === "topic" ? 0.9 : 0.02));
    node.call(d3.drag()
      .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    sim.on("tick", () => {
      nodes.forEach((d) => { d.x = Math.max(20, Math.min(W - 20, d.x)); d.y = Math.max(20, Math.min(H - 30, d.y)); });
      link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y).attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
    const dim = (t) => {
      node.classed("n-dim", (d) => !!t && (d.kind === "topic" ? d.id !== t : !d.p.topics.includes(t)));
      link.classed("n-dim", (l) => !!t && l.target.id !== t);
    };
    dim(state.topic);
    onTopic(dim);
  }

  // ---- research timeline: grants and key papers on one vertical line
  function renderCareer(el) {
    const items = CAREER.slice().sort((a, b) => b.start - a.start);
    el.innerHTML = items.map((c) => `<li class="cr cr-${c.kind}">
      <span class="cr-when">${c.start}${c.end !== c.start ? "&ndash;" + c.end : ""}</span>
      <span class="cr-what"><b>${esc(c.title)}</b>${c.where ? `<span>${esc(c.where)}</span>` : ""}</span>
      <span class="cr-kind">${{ grant: "Grant", paper: "Key paper" }[c.kind]}</span></li>`).join("");
  }

  window.Viz = { onTopic, renderPubs, renderMatrix, renderNetwork, renderCareer, setTopic, topicColor, topicLabel };
})();
