(() => {
  document.documentElement.classList.add("js");

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#site-nav");
  const header = document.querySelector(".site-header");
  const form = document.querySelector("#contact-form");
  const thanks = document.querySelector("#form-thanks");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeMenu = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    nav.classList.remove("is-open");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
      nav.classList.toggle("is-open", !isOpen);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);

    const fromTop = window.scrollY + 120;
    const links = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
    let current = "";
    links.forEach((link) => {
      const id = link.getAttribute("href");
      const section = id && id !== "#" ? document.querySelector(id) : null;
      if (section && section.offsetTop <= fromTop) current = id;
    });
    links.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === current);
    });
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      const play = () => heroVideo.play().catch(() => {});
      if (heroVideo.readyState >= 2) play();
      else heroVideo.addEventListener("canplay", play, { once: true });
    }
  }

  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 18% 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  }

  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      document.querySelectorAll(".faq-item").forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  if (form && thanks) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const note = form.querySelector(".form-note");
      if (note) note.hidden = true;
      thanks.hidden = false;
      form.querySelectorAll("input, textarea, button").forEach((field) => {
        field.disabled = true;
      });
      thanks.focus?.();
    });
  }
})();
