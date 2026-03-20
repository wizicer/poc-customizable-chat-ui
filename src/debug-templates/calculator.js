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
    return { expression, result };
  } catch {
    return null;
  }
}

function createCalculatorMarkup(text) {
  const evaluated = evaluateExpression(text);
  if (!evaluated) return text;
  const { expression, result } = evaluated;
  const encoded = encodeURIComponent(expression);
  return `
    <div class="calculator-bubble" data-calculator-root="true" data-expression="${encoded}">
      <div class="calculator-expression">${expression}=</div>
      <div class="calculator-display" data-calculator-display="true">${result}</div>
      <div class="calculator-keypad">
        <div class="calculator-row">
          <button class="calculator-key" data-calculator-value="7">7</button>
          <button class="calculator-key" data-calculator-value="8">8</button>
          <button class="calculator-key" data-calculator-value="9">9</button>
          <button class="calculator-key operator" data-calculator-value="/">/</button>
        </div>
        <div class="calculator-row">
          <button class="calculator-key" data-calculator-value="4">4</button>
          <button class="calculator-key" data-calculator-value="5">5</button>
          <button class="calculator-key" data-calculator-value="6">6</button>
          <button class="calculator-key operator" data-calculator-value="*">*</button>
        </div>
        <div class="calculator-row">
          <button class="calculator-key" data-calculator-value="1">1</button>
          <button class="calculator-key" data-calculator-value="2">2</button>
          <button class="calculator-key" data-calculator-value="3">3</button>
          <button class="calculator-key operator" data-calculator-value="-">-</button>
        </div>
        <div class="calculator-row">
          <button class="calculator-key" data-calculator-value="0">0</button>
          <button class="calculator-key" data-calculator-value="(">(</button>
          <button class="calculator-key" data-calculator-value=")">)</button>
          <button class="calculator-key operator" data-calculator-value="+">+</button>
        </div>
        <div class="calculator-row">
          <button class="calculator-key" data-calculator-value=".">.</button>
          <button class="calculator-key" data-calculator-value="%">%</button>
          <button class="calculator-key operator" data-calculator-action="clear">C</button>
          <button class="calculator-key equal" data-calculator-action="solve">=</button>
        </div>
      </div>
    </div>
  `;
}

window.ChatAPI.addFilter('render:text', (text) => {
  return createCalculatorMarkup(text);
});

window.ChatAPI.on('core:mounted', () => {
  if (window.__calculatorBubbleHandlerInstalled) return;
  window.__calculatorBubbleHandlerInstalled = true;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-calculator-value], [data-calculator-action]');
    if (!button) return;
    const root = button.closest('[data-calculator-root="true"]');
    if (!root) return;
    const display = root.querySelector('[data-calculator-display="true"]');
    if (!display) return;
    const currentExpression = decodeURIComponent(root.dataset.expression || '');
    if (button.dataset.calculatorAction === 'clear') {
      root.dataset.expression = '';
      display.textContent = '0';
      const expressionNode = root.querySelector('.calculator-expression');
      if (expressionNode) expressionNode.textContent = '0=';
      return;
    }
    if (button.dataset.calculatorAction === 'solve') {
      const next = evaluateExpression(`${currentExpression}=`);
      display.textContent = next ? String(next.result) : 'Error';
      const expressionNode = root.querySelector('.calculator-expression');
      if (expressionNode) expressionNode.textContent = `${currentExpression || '0'}=`;
      return;
    }
    const nextExpression = `${currentExpression}${button.dataset.calculatorValue || ''}`;
    root.dataset.expression = encodeURIComponent(nextExpression);
    const expressionNode = root.querySelector('.calculator-expression');
    if (expressionNode) expressionNode.textContent = `${nextExpression}=`;
    const next = evaluateExpression(`${nextExpression}=`);
    display.textContent = next ? String(next.result) : nextExpression || '0';
  });
});
