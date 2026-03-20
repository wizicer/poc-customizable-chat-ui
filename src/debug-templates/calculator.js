function normalizeExpression(input) {
  return String(input || '').replace(/\s+/g, '');
}

function isSafeExpression(input) {
  return /^[0-9()+\-*/%.]+=$/.test(input);
}

function evaluateExpression(input) {
  const normalized = normalizeExpression(input);
  if (!isSafeExpression(normalized)) return null;
  const expression = normalized.slice(0, -1);
  if (!expression) return null;
  try {
    const result = Function(`return (${expression})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return null;
    return `${expression} = ${result}`;
  } catch {
    return null;
  }
}

window.ChatAPI.addFilter('render:text', (text) => {
  const calculated = evaluateExpression(text);
  if (!calculated) return text;
  return `${text}\n${calculated}`;
});

window.ChatAPI.on('core:mounted', () => {
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('calculator-chip')) {
    const chip = document.createElement('div');
    chip.id = 'calculator-chip';
    chip.className = 'calculator-chip';
    chip.textContent = 'Calculator template active';
    topAnchor.appendChild(chip);
  }

  const bottomAnchor = document.getElementById('bottom-injection-anchor');
  if (bottomAnchor && !document.getElementById('calculator-panel')) {
    const panel = document.createElement('div');
    panel.id = 'calculator-panel';
    panel.className = 'calculator-panel';
    panel.innerHTML = `
      <div class="calculator-display" id="calculator-display">0</div>
      <div class="calculator-row">
        <button class="calculator-key">7</button>
        <button class="calculator-key">8</button>
        <button class="calculator-key">9</button>
        <button class="calculator-key operator">/</button>
      </div>
      <div class="calculator-row">
        <button class="calculator-key">4</button>
        <button class="calculator-key">5</button>
        <button class="calculator-key">6</button>
        <button class="calculator-key operator">*</button>
      </div>
      <div class="calculator-row">
        <button class="calculator-key">1</button>
        <button class="calculator-key">2</button>
        <button class="calculator-key">3</button>
        <button class="calculator-key operator">-</button>
      </div>
      <div class="calculator-row">
        <button class="calculator-key">0</button>
        <button class="calculator-key">(</button>
        <button class="calculator-key">)</button>
        <button class="calculator-key operator">+</button>
      </div>
      <div class="calculator-row">
        <button class="calculator-key">.</button>
        <button class="calculator-key">%</button>
        <button class="calculator-key operator" data-action="clear">C</button>
        <button class="calculator-key equal" data-action="send">=</button>
      </div>
    `;

    const display = panel.querySelector('#calculator-display');
    let value = '';

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'clear') {
        value = '';
        display.textContent = '0';
        return;
      }
      if (action === 'send') {
        if (!value) return;
        window.ChatAPI.sendToHost('sendMessage', { text: `${value}=` });
        value = '';
        display.textContent = '0';
        return;
      }
      value += button.textContent || '';
      display.textContent = value;
    });

    bottomAnchor.appendChild(panel);
  }
});
