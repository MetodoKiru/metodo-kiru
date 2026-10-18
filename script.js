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
