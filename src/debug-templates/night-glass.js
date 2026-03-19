window.ChatAPI.addFilter('render:text', (text) => {
  return String(text).replace(/\b(idea|brainstorm|concept)\b/gi, "<strong style='color:#a78bfa;'>$1</strong>");
});
window.ChatAPI.on('core:mounted', () => {
  document.body.classList.add('plugin-night-glass');
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('night-glass-chip')) {
    const chip = document.createElement('div');
    chip.id = 'night-glass-chip';
    chip.className = 'plugin-glass-chip';
    chip.textContent = 'Night Glass template enabled';
    topAnchor.appendChild(chip);
  }
  const bottomAnchor = document.getElementById('bottom-injection-anchor');
  if (bottomAnchor && !document.getElementById('night-glass-button')) {
    const button = document.createElement('button');
    button.id = 'night-glass-button';
    button.className = 'plugin-glass-btn';
    button.textContent = 'Brainstorm';
    button.addEventListener('click', () => {
      window.ChatAPI.sendToHost('sendMessage', { text: '[Template 2] Give me three brainstorming directions.' });
    });
    bottomAnchor.appendChild(button);
  }
});
