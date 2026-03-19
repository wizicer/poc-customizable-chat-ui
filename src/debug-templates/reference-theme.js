window.ChatAPI.addFilter('render:text', (text) => {
  let safeText = String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  safeText = safeText.replace(/(BUG|报错)/gi, "<strong style='color:#ef4444;font-size:1.05em;'>$1</strong>");
  return safeText;
});
window.ChatAPI.on('core:mounted', () => {
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('reference-plugin-badge')) {
    const badge = document.createElement('div');
    badge.id = 'reference-plugin-badge';
    badge.className = 'plugin-badge';
    badge.textContent = 'Reference plugin loaded';
    topAnchor.appendChild(badge);
  }
  const bottomAnchor = document.getElementById('bottom-injection-anchor');
  if (bottomAnchor && !document.getElementById('reference-plugin-button')) {
    const button = document.createElement('button');
    button.id = 'reference-plugin-button';
    button.className = 'plugin-ui-btn';
    button.textContent = '🚨 Send plugin alert';
    button.addEventListener('click', () => {
      window.ChatAPI.sendToHost('sendMessage', { text: '[Plugin Alert] Reference template button clicked' });
    });
    bottomAnchor.appendChild(button);
  }
});
