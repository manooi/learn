// Theme toggle for landing page
const themeBtn = document.getElementById('theme-btn');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    localStorage.setItem('lr-theme', next);
  });
}
