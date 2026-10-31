// Pruebas de protección de la web pública de Método Kiru.
// Comprueban que ningún cambio altera precios, descuentos, formularios,
// enlaces de contacto ni las integraciones con Google Sheets.
//
// Uso:  node tests/proteccion.js
// Requiere Playwright (npm i -g playwright o el que tenga el entorno).
// La carpeta tests/ no se publica (ver .vercelignore).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PAGES = ["index", "programas", "tarifas", "descuentos", "equipo", "testimonios", "faq", "voluntariado", "trabaja-con-nosotros"];

// ---------- Valores comerciales vigentes (NO cambiar sin autorización) ----------
const PRECIOS = {
  base: { 1: 150, 2: 300, 3: 480 },
  kiru: { 1: 175, 2: 350, 3: 500 },
};
const WELCOME_PACK = "25 €";
// Opciones de la calculadora: meses -> descuento por pago anticipado.
const TRAMOS = { 1: 0, 3: 0.05, 6: 0.10, 10: 0.15 };

// ---------- Integraciones (NO cambiar) ----------
const WHATSAPP = "https://wa.me/34651382833";
const CAMPUS = "https://campus.metodokiru.es/";
const FORM_MENTORES = "https://forms.gle/Yh8Yrp8bvanPEbjY7";
const FORM_ENTIDADES = "https://form.jotform.com/262994875550069";
const HOJA_EQUIPO = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ-tT6GsDSnTJTE_ZYwLA9aV8hHO3mXMWmfm30Cuesp4AZASTNnwobgowbpdTUq7r6OfvB5N0N_bCm/pub?gid=70570631&single=true&output=csv";
const HOJA_OPINIONES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9fcG5Gis_dfePaGpGKt2O39dQhKISsUhEy0lMpV5Xd_FuMrYeavfqoXf-_HVDYgq4W2G2KbZzePmL/pub?gid=625830375&single=true&output=csv";

// Datos ficticios para simular las hojas (no se usa ningún dato real).
const CSV_EQUIPO = "nombre,foto,estudios,experiencia,disponibilidad,zona,puesto\nPersona Prueba,,Grado de prueba,Primaria,Lunes,Zona,Mentor\n";
const CSV_OPINIONES = "texto,firma,nota_media,num_opiniones\nOpinión ficticia de prueba,Familia de prueba,9,3\n#oculta,x,,\n";

let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? "  ✓ " : "  ✗ ") + msg); if (!cond) fallos++; };

const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain" };

// Servidor local que imita cleanUrls de Vercel.
function servidor() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    let file = path.join(ROOT, p);
    if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

(async () => {
  const srv = servidor();
  await new Promise(r => srv.listen(0, r));
  const BASE = "http://127.0.0.1:" + srv.address().port;
  const browser = await chromium.launch();

  async function pagina(width = 390) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    page.errores = [];
    page.on("pageerror", e => page.errores.push(e.message));
    await page.route("**/*", route => {
      const u = route.request().url();
      if (u.startsWith(BASE)) return route.continue();
      if (u === HOJA_EQUIPO) return route.fulfill({ status: 200, contentType: "text/csv", body: CSV_EQUIPO });
      if (u === HOJA_OPINIONES) return route.fulfill({ status: 200, contentType: "text/csv", body: CSV_OPINIONES });
      return route.abort();
    });
    return page;
  }

  console.log("Código fuente");
  const src = Object.fromEntries(PAGES.map(n => [n, fs.readFileSync(path.join(ROOT, n + ".html"), "utf8")]));
  const script = fs.readFileSync(path.join(ROOT, "script.js"), "utf8");
  ok(script.includes(HOJA_EQUIPO), "script.js conserva la hoja de Equipo");
  ok(script.includes(HOJA_OPINIONES), "script.js conserva la hoja de Opiniones");
  ok(src["trabaja-con-nosotros"].includes(FORM_MENTORES), "Trabaja con nosotros conserva el formulario de mentores");
  ok(src.voluntariado.includes(FORM_ENTIDADES), "Voluntariado conserva el formulario de entidades");
  ok(/async function kiruTeam\(/.test(script) && script.includes('getElementById("team-grid")'), "script.js conserva la lectura de la hoja de Equipo (desactivada mientras no haya #team-grid)");
  ok(src.testimonios.includes('id="reviews-grid"'), "Opiniones conserva #reviews-grid");
  for (const n of PAGES) {
    const wa = src[n].match(/https:\/\/wa\.me\/\d+/g) || [];
    ok(wa.length > 0 && wa.every(u => u === WHATSAPP), `${n}: WhatsApp presente y con el número correcto`);
    ok(src[n].includes(CAMPUS), `${n}: enlace al campus`);
  }
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  ok(vercel.cleanUrls === true && vercel.redirects.length >= 8, "vercel.json conserva cleanUrls y las redirecciones antiguas");

  console.log("Tarifas");
  {
    const page = await pagina();
    await page.goto(BASE + "/tarifas");
    const tarjetas = await page.$$eval(".tarifa-card", cs => cs.map(c => [...c.querySelectorAll(".precio-item strong")].map(s => s.textContent.trim())));
    ok(JSON.stringify(tarjetas[0]) === JSON.stringify([1, 2, 3].map(f => PRECIOS.base[f] + " €/mes")), "Precios del Programa Base sin cambios");
    ok(JSON.stringify(tarjetas[1]) === JSON.stringify([1, 2, 3].map(f => PRECIOS.kiru[f] + " €/mes")), "Precios de Método Kiru sin cambios");
    ok((await page.textContent(".welcome-pack-row strong")).trim() === WELCOME_PACK, "Welcome Pack sin cambios");
    ok(page.errores.length === 0, "Sin errores de JavaScript");
    await page.close();
  }

  console.log("Calculadora de descuentos");
  {
    const page = await pagina();
    await page.goto(BASE + "/descuentos");
    const euro = v => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
    let bien = true;
    const opciones = await page.$$eval("[data-months]", bs => bs.map(b => Number(b.dataset.months)));
    ok(JSON.stringify(opciones) === "[1,3,6,10]", "La calculadora ofrece solo 1, 3, 6 y 10 meses");
    ok(await page.$("input[type=range]") === null, "Sin opciones intermedias (no hay deslizador)");
    for (const prog of ["base", "kiru"]) for (const f of [1, 2, 3]) for (const m of [1, 3, 6, 10]) {
      await page.selectOption("#program", prog);
      await page.selectOption("#frequency", String(f));
      await page.click(`[data-months="${m}"]`);
      const tasa = TRAMOS[m];
      const total = PRECIOS[prog][f] * m * (1 - tasa);
      const visto = (await page.textContent("#final-total")).trim();
      const sesiones = (await page.textContent("#session-count")).trim();
      if (visto !== euro(total) || !sesiones.startsWith(String(m * 4 * f) + " ")) { bien = false; console.log(`    ${prog} ${f}x ${m}m: ${visto} / ${sesiones}`); }
    }
    ok(bien, "Totales y sesiones correctos en las 24 combinaciones (0 %, 5 %, 10 %, 15 %)");
    await page.click('[data-months="6"]');
    ok(await page.getAttribute('[data-months="6"]', "aria-pressed") === "true", "Los botones rápidos se marcan");
    ok(page.errores.length === 0, "Sin errores de JavaScript" + (page.errores.length ? ": " + page.errores[0] : ""));
    await page.close();
  }

  console.log("Integraciones con Google Sheets (datos ficticios)");
  {
    const page = await pagina();
    await page.goto(BASE + "/equipo");
    await page.waitForTimeout(500);
    const textoEquipo = await page.textContent("main");
    ok(await page.$$eval(".team-card", c => c.length) === 0 && !textoEquipo.includes("Persona Prueba"), "Equipo no publica fichas ni datos personales del formulario");
    await page.goto(BASE + "/testimonios");
    await page.waitForFunction(() => document.querySelector("#reviews-grid").textContent.includes("ficticia"), null, { timeout: 5000 }).catch(() => {});
    const grid = await page.textContent("#reviews-grid");
    ok(grid.includes("Opinión ficticia de prueba") && !grid.includes("#oculta"), "Opiniones añade las de la hoja y oculta las marcadas con #");
    ok(!(await page.$eval(".review-stats", e => e.hidden)), "Se muestra la nota media a partir de 3 opiniones");
    await page.close();
  }

  console.log("Todas las páginas (móvil 390 px)");
  {
    const page = await pagina();
    for (const n of PAGES) {
      page.errores = [];
      const r = await page.goto(BASE + (n === "index" ? "/" : "/" + n));
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      ok(r.status() === 200 && ancho <= 390 && page.errores.length === 0, `${n}: carga sin errores y sin scroll horizontal`);
      ok(await page.$(".wa-bar") !== null, `${n}: botón fijo de WhatsApp en móvil`);
      const pequenos = await page.$$eval("a, button", els => els.filter(e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && !e.closest(".nav-links") && !e.closest("p, li, dd, span") && r.height < 40; }).map(e => e.textContent.trim().slice(0, 30)));
      if (pequenos.length) console.log(`    ${n}: botones de menos de 40 px: ${pequenos.join(" | ")}`);
      const internos = await page.$$eval("a[href^='/']", as => [...new Set(as.map(a => a.getAttribute("href").split("#")[0]))]);
      for (const h of internos) {
        const res = await page.request.get(BASE + h);
        if (res.status() !== 200) ok(false, `${n}: enlace roto ${h}`);
      }
    }
    await page.close();
  }

  console.log("Menú móvil");
  {
    const page = await pagina();
    await page.goto(BASE + "/");
    ok(!(await page.isVisible("#menu-principal a[href='/faq']")), "El menú está cerrado al cargar");
    await page.click(".menu-btn");
    await page.waitForTimeout(300);
    ok(await page.isVisible("#menu-principal a[href='/faq']") && await page.getAttribute(".menu-btn", "aria-expanded") === "true", "El botón abre el menú con todas las páginas");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    ok(!(await page.isVisible("#menu-principal a[href='/faq']")), "Escape cierra el menú");
    await page.close();
  }

  await browser.close();
  srv.close();
  console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : "\nTodo correcto");
  process.exit(fallos ? 1 : 0);
})();
