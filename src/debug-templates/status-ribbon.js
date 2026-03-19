window.ChatAPI.addFilter('render:text', (text) => {
  return String(text).replace(/(TODO|NOTE)/gi, "<mark style='background:#fde68a;color:#92400e;padding:0 4px;border-radius:4px;'>$1</mark>");
});
window.ChatAPI.on('core:mounted', () => {
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('status-ribbon-plugin')) {
    const ribbon = document.createElement('div');
    ribbon.id = 'status-ribbon-plugin';
    ribbon.className = 'plugin-ribbon';
    ribbon.textContent = 'Status Ribbon template is active';
    topAnchor.appendChild(ribbon);
  }
  const bottomAnchor = document.getElementById('bottom-injection-anchor');
  if (bottomAnchor && !document.getElementById('status-ribbon-button')) {
    const button = document.createElement('button');
    button.id = 'status-ribbon-button';
    button.className = 'plugin-mini-btn';
    button.textContent = 'Summarize status';
    button.addEventListener('click', () => {
      window.ChatAPI.sendToHost('sendMessage', { text: '[Template 1] Please summarize the current status.' });
    });
    bottomAnchor.appendChild(button);
  }
});
