window.ChatAPI.addFilter('render:text', (text) => {
  return String(text).replace(/\[demo\]/gi, "<strong style='color:#4f46e5;'>[demo]</strong>");
});

window.ChatAPI.on('demo:ping', (payload) => {
  const status = document.getElementById('plugin-demo-status');
  if (status) {
    status.textContent = `Custom event received: ${payload?.label || 'ping'}`;
  }
});

window.ChatAPI.on('core:mounted', () => {
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('plugin-demo-card')) {
    const card = document.createElement('div');
    card.id = 'plugin-demo-card';
    card.className = 'plugin-demo-card';
    card.innerHTML = `
      <div class="plugin-demo-title">Starter template demo</div>
      <div class="plugin-demo-status" id="plugin-demo-status">Mounted via core:mounted</div>
      <div class="plugin-demo-actions">
        <button class="plugin-demo-btn" id="plugin-demo-event">Emit event</button>
        <button class="plugin-demo-btn" id="plugin-demo-send">Send to host</button>
      </div>
    `;
    topAnchor.appendChild(card);
    const eventButton = document.getElementById('plugin-demo-event');
    if (eventButton) {
      eventButton.addEventListener('click', () => {
        window.ChatAPI.emit('demo:ping', { label: 'demo event button' });
      });
    }
    const sendButton = document.getElementById('plugin-demo-send');
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        window.ChatAPI.sendToHost('sendMessage', { text: '[demo] Host message from template sample' });
      });
    }
  }
});
