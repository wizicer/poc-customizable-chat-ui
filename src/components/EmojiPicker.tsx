import { useState } from "react";

const EMOJI_GROUPS = {
  faces: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔"],
  objects: ["💬", "💭", "💡", "🔮", "🎯", "🎨", "🎭", "🎪", "🎬", "🎮", "🎲", "🎰", "🎳", "🎯", "🎪", "🎨"],
  symbols: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"],
  tech: ["🤖", "👾", "🎮", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🕹️", "💾", "💿", "📀", "📱", "☎️", "📞", "📟"],
  nature: ["🌟", "⭐", "🌙", "☀️", "⛅", "🌈", "🔥", "💧", "🌊", "🌍", "🌎", "🌏", "🌐", "🗺️", "🏔️", "⛰️"],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  onClose?: () => void;
}

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  const [activeGroup, setActiveGroup] = useState<keyof typeof EMOJI_GROUPS>("faces");
  const [customInput, setCustomInput] = useState(value);

  return (
    <div className="w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="flex border-b border-border bg-muted/30">
        {Object.keys(EMOJI_GROUPS).map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group as keyof typeof EMOJI_GROUPS)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeGroup === group
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="p-3 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {EMOJI_GROUPS[activeGroup].map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onChange(emoji);
              setCustomInput(emoji);
            }}
            className={`text-2xl p-2 rounded hover:bg-accent transition-colors ${
              value === emoji ? "bg-primary/10 ring-2 ring-primary" : ""
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-border space-y-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Or type custom emoji/text..."
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (customInput.trim()) {
                onChange(customInput.trim());
              }
              onClose?.();
            }}
            className="flex-1 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
          >
            Apply
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-md border border-border hover:bg-accent"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
