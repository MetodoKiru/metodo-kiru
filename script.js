document.addEventListener("DOMContentLoaded", () => {

  const menuBtn = document.querySelector(".menu-btn");
  const closeBtn = document.querySelector(".close-menu");
  const overlay = document.querySelector(".menu-overlay");

  if (menuBtn && closeBtn && overlay) {
    menuBtn.addEventListener("click", () => {
      overlay.classList.add("active");
    });

    closeBtn.addEventListener("click", () => {
      overlay.classList.remove("active");
    });
  }

  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {
      const open = item.classList.toggle("active");
      question.setAttribute("aria-expanded", open ? "true" : "false");
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
  opiniones: ""
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
async function kiruTeam() {
  const grid = document.getElementById("team-grid");
  if (!grid) return;
  try {
    const people = (await kiruLoad(KIRU_DATA.equipo)).filter(p => p.nombre);
    if (!people.length) throw new Error("vacío");
    people.forEach(p => {
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
      card.appendChild(kiruEl("h2", "team-name", p.nombre));
      if (p.estudios) card.appendChild(kiruEl("p", "team-studies", p.estudios));
      if (p.experiencia) card.appendChild(kiruEl("p", "team-exp", p.experiencia.split(",").map(s => s.trim()).filter(Boolean).join(" · ")));
      if (p.disponibilidad || p.zona) {
        const dl = kiruEl("dl", "team-info");
        if (p.disponibilidad) { dl.appendChild(kiruEl("dt", "", "Días")); dl.appendChild(kiruEl("dd", "", p.disponibilidad)); }
        if (p.zona) { dl.appendChild(kiruEl("dt", "", "Zona")); dl.appendChild(kiruEl("dd", "", p.zona)); }
        card.appendChild(dl);
      }
      grid.appendChild(card);
    });
  } catch (e) {
    grid.appendChild(kiruEl("p", "team-empty", "Muy pronto presentaremos aquí a nuestro equipo."));
  }
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
