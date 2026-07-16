const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const accordionButtons = document.querySelectorAll('.accordion-trigger');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

accordionButtons.forEach((button) => {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const box = button.closest('.accordion-box');
  button.setAttribute('aria-expanded', 'false');
  if (panel) panel.hidden = true;
  if (box) box.classList.remove('is-open');
});

function setAccordionState(button, expanded) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const box = button.closest('.accordion-box');
  button.setAttribute('aria-expanded', String(expanded));
  panel.hidden = !expanded;
  box.classList.toggle('is-open', expanded);
}

accordionButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    setAccordionState(button, !expanded);
  });
});
