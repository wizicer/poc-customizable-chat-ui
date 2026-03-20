// Message Splitter Plugin
// Splits long assistant messages at "\n---" boundaries and renders each
// segment as a visually separate block inside the same bubble.

console.log('[message-splitter] plugin loaded');

window.ChatAPI.addFilter('render:text', function (text) {
  console.log('[message-splitter] render:text', text);
  var raw = String(text ?? '');

  if (raw.indexOf('<br />---') === -1) {
    return text;
  }

  console.log('[message-splitter] splitting message, segments:', raw.split('<br />---').length);

  var segments = raw.split('<br />---');
  return segments
    .map(function (segment) {
      var trimmed = segment.trim();
      if (!trimmed) return '';
      var div = document.createElement('div');
      div.textContent = trimmed;
      var escaped = div.innerHTML.replace(/\n/g, '<br />');
      return '<div class="splitter-segment">' + escaped + '</div>';
    })
    .filter(Boolean)
    .join('');
});
