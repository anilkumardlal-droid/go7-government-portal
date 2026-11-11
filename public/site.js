(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const brandRow = header.querySelector('.brand-row');
  const menuButton = document.getElementById('menuToggle');
  const navElement = document.getElementById('mainNav');
  if (menuButton && navElement && !menuButton.dataset.go7Bound) {
    menuButton.dataset.go7Bound = '1';
    menuButton.addEventListener('click', () => {
      const opened = navElement.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(opened));
      menuButton.textContent = opened ? '✕ Close' : '☰ Menu';
    });
    navElement.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      navElement.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = '☰ Menu';
    }));
  }
  if (brandRow && !document.getElementById('go7SearchToggle')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'go7SearchToggle';
    toggle.className = 'search-icon-toggle';
    toggle.setAttribute('aria-label', 'Open search');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg>';
    const menu = brandRow.querySelector('.menu-toggle');
    brandRow.insertBefore(toggle, menu || null);
  }

  if (!document.getElementById('go7SearchLayer')) {
    const layer = document.createElement('div');
    layer.id = 'go7SearchLayer';
    layer.className = 'search-layer';
    layer.hidden = true;
    layer.innerHTML = '<div class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="go7SearchTitle"><div class="search-dialog-head"><h2 id="go7SearchTitle">Search GO7 Updates</h2><button type="button" class="search-close" aria-label="Close search">×</button></div><form id="go7GlobalSearch" class="global-search-form"><input id="go7GlobalSearchInput" type="search" placeholder="Search jobs, results, exams…" autocomplete="off" aria-label="Search GO7 updates"><button type="submit">Search</button></form><p class="search-hint">Search by post name, department or examination.</p></div>';
    document.body.appendChild(layer);

    const toggle = document.getElementById('go7SearchToggle');
    const input = document.getElementById('go7GlobalSearchInput');
    const close = () => {
      layer.hidden = true;
      document.body.classList.remove('search-open');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.focus();
    };
    const open = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      layer.hidden = false;
      document.body.classList.add('search-open');
      toggle?.setAttribute('aria-expanded', 'true');
      window.setTimeout(() => input?.focus(), 80);
    };
    toggle?.addEventListener('click', () => layer.hidden ? open() : close());
    layer.querySelector('.search-close')?.addEventListener('click', close);
    layer.addEventListener('click', event => { if (event.target === layer) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !layer.hidden) close(); });
    document.getElementById('go7GlobalSearch')?.addEventListener('submit', event => {
      event.preventDefault();
      const query = input?.value.trim() || '';
      if (query) window.location.href = `/?q=${encodeURIComponent(query)}#latest`;
    });
  }
})();
