// Message Splitter Plugin
// Splits long assistant messages at "\n---" boundaries and renders each
// segment as a separate message bubble using the transform:message filter.

window.ChatAPI.addFilter('transform:message', function (messages) {
  var result = [];
  messages.forEach(function (message) {
    var content = message.content || '';
    // Only split assistant messages that contain the separator
    if (message.role !== 'assistant' || content.indexOf('\n---') === -1) {
      result.push(message);
      return;
    }

    var segments = content.split('\n---');
    segments.forEach(function (segment, index) {
      var trimmed = segment.trim();
      if (!trimmed) return;
      result.push({
        id: message.id ? message.id + ':split-' + index : undefined,
        role: message.role,
        content: trimmed,
        timestamp: message.timestamp,
        senderName: message.senderName,
      });
    });
  });
  return result;
});
