// TTS Read-Aloud Plugin
// Adds a speaker icon next to assistant message bubbles.
// Clicking it reads the message content aloud using the Web Speech API.

var ttsCurrentBtn = null;

function ttsDetectLanguage(text) {
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja-JP';
  if (/[\u4E00-\u9FA5]/.test(text)) return 'zh-CN';
  if (/^[a-zA-Z0-9\s.,!?'"()\-]+$/.test(text)) return 'en-US';
  return 'zh-CN';
}

function ttsStop() {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  if (ttsCurrentBtn) {
    ttsCurrentBtn.innerText = '🔊';
    ttsCurrentBtn.classList.remove('tts-playing');
    ttsCurrentBtn = null;
  }
}

// Keep a global reference to the utterance so it isn't garbage collected in Chrome
var currentUtterance = null;
var keepAliveInterval = null;

function ttsPlay(text, btn) {
  // Always stop anything currently playing and clear intervals
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (ttsCurrentBtn) {
    ttsCurrentBtn.innerText = '🔊';
    ttsCurrentBtn.classList.remove('tts-playing');
  }
  ttsCurrentBtn = null;
  currentUtterance = null;
  if (!text) return;

  btn.innerText = '⏹️';
  btn.classList.add('tts-playing');
  ttsCurrentBtn = btn;

  // Small delay to let cancel() finish in Chrome
  setTimeout(function () {
    currentUtterance = new SpeechSynthesisUtterance(text);
    var detectedLang = ttsDetectLanguage(text);
    currentUtterance.lang = detectedLang;

    // Let the browser auto-select the voice based on the lang property.
    // Forcing a specific Voice object in Chrome can cause 'synthesis-failed'
    // if the voice isn't fully initialized or compatible.
    
    currentUtterance.onend = function () {
      btn.innerText = '🔊';
      btn.classList.remove('tts-playing');
      ttsCurrentBtn = null;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
    currentUtterance.onerror = function (e) {
      console.warn('TTS Error:', e);
      btn.innerText = '🔊';
      btn.classList.remove('tts-playing');
      ttsCurrentBtn = null;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };

    window.speechSynthesis.speak(currentUtterance);

    // Chrome pauses long utterances after ~15s; keep it alive
    keepAliveInterval = setInterval(function () {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAliveInterval);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
  }, 50);
}

window.ChatAPI.on('message:rendered', function (data) {
  var node = data.node;
  var message = data.message;

  // Only add TTS to assistant messages
  if (message.role !== 'assistant') return;
  // Skip template cards
  if (message.isTemplate) return;

  var bubble = node.querySelector('.msg-bubble');
  if (!bubble) return;

  // Wrap bubble in a row container for side-by-side layout
  var existingRow = node.querySelector('.msg-bubble-row');
  if (!existingRow) {
    var row = document.createElement('div');
    row.className = 'msg-bubble-row';
    bubble.parentNode.insertBefore(row, bubble);
    row.appendChild(bubble);

    var btn = document.createElement('button');
    btn.className = 'tts-btn';
    btn.type = 'button';
    btn.innerText = '🔊';
    btn.title = 'Read aloud';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (ttsCurrentBtn === btn) {
        ttsStop();
        return;
      }
      var textContent = bubble.textContent.trim();
      ttsPlay(textContent, btn);
    });
    row.appendChild(btn);
  }
});
