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
      item.classList.toggle("active");
    });
  });

});
// Menú de tres rayas (móvil y pantallas pequeñas)
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".top-navbar");
  const toggle = document.querySelector(".menu-toggle");
  if (!header || !toggle) return;

  const setOpen = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("menu-open")));

  header.querySelectorAll(".nav-links a").forEach(a =>
    a.addEventListener("click", () => setOpen(false))
  );

  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100) setOpen(false);
  });
});
