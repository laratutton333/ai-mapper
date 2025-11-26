const ICON_PATHS = {
  search: [
    { d: 'm21 21-4.35-4.35' },
    { d: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z' },
  ],
  globe: [
    { d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
    { d: 'M2 12h20' },
    { d: 'M12 2c3 3.5 4.5 7.7 4.5 10s-1.5 6.5-4.5 10c-3-3.5-4.5-7.7-4.5-10s1.5-6.5 4.5-10z' },
  ],
  barChart: [
    { d: 'M3 3v18h18' },
    { d: 'M8 16v-6' },
    { d: 'M12 16v-10' },
    { d: 'M16 16v-4' },
  ],
  activity: [
    { d: 'M22 12h-4l-3 7-4-14-3 7H2' },
  ],
  flame: [
    { d: 'M12 2c2.5 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1.5-4 4-8z' },
    { d: 'M12 22c-3-1.5-5-4-5-7a5 5 0 0 1 10 0c0 3-2 5.5-5 7z' },
  ],
  zap: [
    { d: 'M13 2 3 14h7l-1 8 10-12h-7z' },
  ],
  list: [
    { d: 'M8 6h13' },
    { d: 'M8 12h13' },
    { d: 'M8 18h13' },
    { d: 'M3 6h.01' },
    { d: 'M3 12h.01' },
    { d: 'M3 18h.01' },
  ],
  pin: [
    { d: 'M12 21s-6-4.35-6-9a6 6 0 1 1 12 0c0 4.65-6 9-6 9z' },
    { d: 'M12 13a2.5 2.5 0 1 0-2.5-2.5A2.5 2.5 0 0 0 12 13z' },
  ],
  table: [
    { d: 'M3 3h18v18H3z' },
    { d: 'M3 9h18' },
    { d: 'M9 21V9' },
  ],
  shieldCheck: [
    { d: 'M12 3 4.5 5v6c0 5.2 3.2 9.7 7.5 11 4.3-1.3 7.5-5.8 7.5-11V5z' },
    { d: 'm9 12 2 2 4-4' },
  ],
  lineChart: [
    { d: 'M3 3v18h18' },
    { d: 'm19 9-5 5-4-4-3 3' },
  ],
  infoCircle: [
    { d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z' },
    { d: 'M12 8h.01' },
    { d: 'M11 12h1v5h1' },
  ],
  sparkles: [
    { d: 'M12 3v3' },
    { d: 'M12 18v3' },
    { d: 'M5.2 5.2l2.1 2.1' },
    { d: 'M16.7 16.7l2.1 2.1' },
    { d: 'M3 12h3' },
    { d: 'M18 12h3' },
    { d: 'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z' },
  ],
  brain: [
    { d: 'M9 3a3 3 0 0 0-3 3v1.5' },
    { d: 'M15 3a3 3 0 0 1 3 3v1.5' },
    { d: 'M6 9h12' },
    { d: 'M6 15h12' },
    { d: 'M9 21a3 3 0 0 1-3-3v-1.5' },
    { d: 'M15 21a3 3 0 0 0 3-3v-1.5' },
    { d: 'M9 3v18' },
    { d: 'M15 3v18' },
  ],
  nodes: [
    { d: 'M5 12a5 5 0 1 0 5-5h-1V4H8v3h2a3 3 0 1 1-3 3H5z' },
  ],
};

export function createIconElement(name, label = '', size = 18) {
  const paths = ICON_PATHS[name];
  if (!paths) return document.createComment(`missing icon: ${name}`);
  const wrapper = document.createElement('span');
  wrapper.className = 'ui-icon';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('ui-icon__svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = label;
    svg.appendChild(title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  paths.forEach((attrs) => {
    const type = attrs.type || 'path';
    const el = document.createElementNS('http://www.w3.org/2000/svg', type);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key !== 'type') {
        el.setAttribute(key, value);
      }
    });
    svg.appendChild(el);
  });
  wrapper.appendChild(svg);
  return wrapper;
}

export function iconMarkup(name, label = '', size) {
  const el = createIconElement(name, label, size);
  const container = document.createElement('div');
  container.appendChild(el);
  return container.innerHTML;
}

export function applyIcons(root = document) {
  const slots = root.querySelectorAll('[data-icon]');
  slots.forEach((slot) => {
    const name = slot.dataset.icon;
    const label = slot.dataset.label || '';
    const size = slot.dataset.iconSize ? Number(slot.dataset.iconSize) : undefined;
    const icon = createIconElement(name, label, size);
    slot.replaceWith(icon);
  });
}
