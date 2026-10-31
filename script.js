document.addEventListener("DOMContentLoaded", () => {

  // ---------- Menú en móvil ----------
  const menuBtn = document.querySelector(".menu-btn");
  const menu = document.getElementById("menu-principal");
  const setMenu = open => {
    document.body.classList.toggle("menu-open", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    }
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
    window.matchMedia("(min-width: 901px)").addEventListener("change", e => { if (e.matches) setMenu(false); });
  }

  // ---------- Botón fijo de WhatsApp (móvil) ----------
  const toggleWa = () => document.body.classList.toggle("show-wa", window.scrollY > 320);
  window.addEventListener("scroll", toggleWa, { passive: true });
  toggleWa();

  // ---------- Preguntas frecuentes ----------
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item, i) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    if (!question || !answer) return;
    answer.id = answer.id || "faq-respuesta-" + (i + 1);
    question.setAttribute("aria-controls", answer.id);

    question.addEventListener("click", () => {
      const open = item.classList.toggle("active");
      question.setAttribute("aria-expanded", open ? "true" : "false");
      answer.style.maxHeight = open ? answer.scrollHeight + "px" : "";
    });
  });

});

// =========================================================
// Datos desde Google Sheets (pestañas «Web» publicadas como CSV).
// Se actualizan solos al llegar nuevas respuestas a los formularios.
// =========================================================
const KIRU_DATA = {
  // Hoja «Nuestro Equipo (respuestas)» › pestaña Web
  equipo: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ-tT6GsDSnTJTE_ZYwLA9aV8hHO3mXMWmfm30Cuesp4AZASTNnwobgowbpdTUq7r6OfvB5N0N_bCm/pub?gid=70570631&single=true&output=csv",
  // Hoja «Testimonios Método Kiru» › pestaña Web
  opiniones: "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9fcG5Gis_dfePaGpGKt2O39dQhKISsUhEy0lMpV5Xd_FuMrYeavfqoXf-_HVDYgq4W2G2KbZzePmL/pub?gid=625830375&single=true&output=csv"
};

function kiruParseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function kiruLoad(url) {
  if (!url) throw new Error("sin enlace");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(res.status);
  const [header, ...rows] = kiruParseCSV(await res.text());
  const keys = header.map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

function kiruEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function kiruDriveImage(url) {
  const m = (url || "").match(/[?&]id=([\w-]+)|\/d\/([\w-]+)/);
  const id = m && (m[1] || m[2]);
  return id ? "https://drive.google.com/thumbnail?id=" + id + "&sz=w600" : "";
}

// ---------- Equipo ----------
// Cada persona sale en el apartado de su «Puesto» (columna del formulario).
// Si alguien marca varios puestos, aparece en cada uno; si lo deja vacío, va a Mentores.
const KIRU_EQUIPOS = [
  { id: "mentores", titulo: "Mentores", texto: "Acompañan a cada alumno en casa, con la metodología Método Kiru.", clave: /mentor/i },
  { id: "coordinadores", titulo: "Coordinadores", texto: "Organizan las clases y están en contacto con las familias.", clave: /coordin/i,
    tareas: "Familias y mentores · Seguimiento de clases" },
  { id: "rrhh", titulo: "RRHH", texto: "Seleccionan y forman a los nuevos mentores.", clave: /rrhh|recursos humanos/i,
    tareas: "Selección y formación de mentores" },
  { id: "desarrolladores", titulo: "Desarrolladores", texto: "Crean la web, la plataforma y las herramientas de Método Kiru.", clave: /desarroll|program|tecnolog/i,
    tareas: "Perfiles de la plataforma · Web" }
];

// Respuestas como «No soy mentora» no se muestran en la web.
function kiruDato(v) {
  return /^no soy mentor/i.test(v || "") ? "" : (v || "");
}

function kiruTeamCard(p, eq) {
  const card = kiruEl("article", "team-card");
  const avatar = kiruEl("div", "team-photo");
  const initials = p.nombre.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  const src = kiruDriveImage(p.foto);
  if (src) {
    const img = kiruEl("img");
    img.src = src; img.alt = p.nombre; img.loading = "lazy";
    const fallback = () => { img.remove(); avatar.textContent = initials; };
    img.onerror = fallback;
    img.onload = () => { if (img.naturalWidth < 40) fallback(); };
    setTimeout(() => { if (!img.complete || !img.naturalWidth) fallback(); }, 6000);
    avatar.appendChild(img);
  } else avatar.textContent = initials;
  card.appendChild(avatar);
  card.appendChild(kiruEl("h3", "team-name", p.nombre));
  if (p.estudios) card.appendChild(kiruEl("p", "team-studies", p.estudios));
  // Mentores: especialidad, días y zonas. Resto de puestos: de qué se encarga.
  const datos = eq.tareas ? [
    ["Se encarga de", eq.tareas]
  ] : [
    ["Especialidad", kiruDato(p.experiencia).split(",").map(s => s.trim()).filter(Boolean).join(" · ")],
    ["Disponible", kiruDato(p.disponibilidad)],
    ["Zonas", kiruDato(p.zona)]
  ].filter(d => d[1]);
  if (datos.length) {
    const dl = kiruEl("dl", "team-info");
    datos.forEach(([k, v]) => { dl.appendChild(kiruEl("dt", "", k + ":")); dl.appendChild(kiruEl("dd", "", v)); });
    card.appendChild(dl);
  }
  return card;
}

async function kiruTeam() {
  const box = document.getElementById("team-grid");
  if (!box) return;
  let people = [];
  try { people = (await kiruLoad(KIRU_DATA.equipo)).filter(p => p.nombre); } catch (e) {}
  KIRU_EQUIPOS.forEach(eq => {
    const miembros = people.filter(p => eq.clave.test(p.puesto || "") || (eq.id === "mentores" && !KIRU_EQUIPOS.some(o => o.clave.test(p.puesto || ""))));
    const sec = kiruEl("section", "team-section");
    sec.id = eq.id;
    sec.appendChild(kiruEl("h2", "team-section-title", eq.titulo));
    sec.appendChild(kiruEl("p", "team-section-intro", eq.texto));
    const grid = kiruEl("div", "team-grid");
    if (miembros.length) miembros.forEach(p => grid.appendChild(kiruTeamCard(p, eq)));
    else grid.appendChild(kiruEl("p", "team-empty", "Muy pronto presentaremos aquí a este equipo."));
    sec.appendChild(grid);
    box.appendChild(sec);
  });
}

// ---------- Opiniones ----------
async function kiruReviews() {
  const grid = document.getElementById("reviews-grid");
  const stats = document.querySelectorAll(".review-stats");
  if (!grid && !stats.length) return;
  let rows;
  try { rows = await kiruLoad(KIRU_DATA.opiniones); } catch (e) { return; }

  // Nota media de todas las respuestas (solo se muestra a partir de 3 opiniones)
  const media = parseFloat(String(rows[0] && rows[0].nota_media || "").replace(",", "."));
  const total = parseInt(rows[0] && rows[0].num_opiniones, 10);
  if (media && total >= 3) {
    const txt = "Nota media de las familias: " + media.toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " / 10 · " + total + " opiniones";
    stats.forEach(p => { p.textContent = txt; p.hidden = false; });
  }

  if (!grid) return;
  rows.filter(r => r.texto && !r.texto.startsWith("#")).reverse().forEach(r => {
    const q = kiruEl("blockquote");
    q.appendChild(document.createTextNode("“" + r.texto + "”"));
    q.appendChild(kiruEl("span", "", r.firma || "Familia de Método Kiru"));
    grid.insertBefore(q, grid.firstChild);
  });
}

document.addEventListener("DOMContentLoaded", () => { kiruTeam(); kiruReviews(); });
