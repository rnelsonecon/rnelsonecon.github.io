// Fills the page from data.js and applies the chosen settings.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const P = PROFILE;

  // ---- content
  document.title = P.name;
  $("kicker").textContent = P.kicker;
  $("name").textContent = P.name;
  $("lede").textContent = P.lede;
  $("roles").innerHTML = P.roles.map(esc).join("<br>");
  $("links").innerHTML = P.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("");
  $("stats").innerHTML = P.stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("");
  $("bio").innerHTML = P.bio.map((p) => `<p>${esc(p)}</p>`).join("") +
    `<h3 class="edu-head">Education</h3><ul class="edu">` +
    P.education.map((e) => `<li><b class="edu-deg">${esc(e.degree)}</b><span class="edu-major">${esc(e.major)}</span><span class="edu-inst">${esc(e.institution)}</span></li>`).join("") +
    `</ul>`;
  $("areas").innerHTML = TOPICS.map((t) => `
    <button class="area" data-t="${t.id}" style="--c:var(--c-${t.id})">
      <h3>${esc(t.label)}</h3><p>${esc(t.blurb)}</p>
      <span class="count">${PUBS.filter((p) => p.topics.includes(t.id)).length} papers</span>
    </button>`).join("");
  document.querySelectorAll(".area").forEach((a) => a.onclick = () => {
    Viz.setTopic(a.dataset.t);
    $("pubs").scrollIntoView({ behavior: "smooth" });
  });
  $("grantlist").innerHTML = GRANTS.map((g) => `<article class="grant">
      <div class="g-when">${esc(g.years)}</div>
      <div><div class="g-title">${esc(g.title)}</div><div class="g-meta">${esc(g.funder)}${g.role ? " &middot; " + esc(g.role) : ""}</div></div>
    </article>`).join("");
  Viz.renderCareer($("careerlist"));
  $("contactbody").innerHTML = P.contact.map((c) => `<p>${c}</p>`).join("");
  $("foot").textContent = P.footer;

  Viz.renderMatrix($("matrix"));
  Viz.renderPubs($("publist"));
  const syncAreas = (t) => document.querySelectorAll(".area").forEach((a) => a.classList.toggle("on", a.dataset.t === t));
  Viz.onTopic(syncAreas);

  // ---- settings: layout, color, and which paper map shows first
  const defaults = { layout: "sidebar", pal: "navy", map: "matrix" };
  const root = document.documentElement;
  root.dataset.layout = defaults.layout;
  root.dataset.pal = defaults.pal;

  // Timeline / Network toggle above the paper list
  let map = defaults.map;
  function showMap() {
    const net = map === "net";
    $("matrix").hidden = net;
    $("net").hidden = !net;
    if (net) Viz.renderNetwork($("net"), { height: 520 });
    document.querySelectorAll(".map-seg button").forEach((b) => b.classList.toggle("on", b.dataset.map === map));
  }
  document.querySelectorAll(".map-seg button").forEach((b) => b.onclick = () => { map = b.dataset.map; showMap(); });
  showMap();
})();
