import type { ChatTemplate } from "@/types";
import referenceThemeCss from "./reference-theme.css?raw";
import referenceThemeJs from "./reference-theme.js?raw";
import statusRibbonCss from "./status-ribbon.css?raw";
import statusRibbonJs from "./status-ribbon.js?raw";
import nightGlassCss from "./night-glass.css?raw";
import nightGlassJs from "./night-glass.js?raw";
import calculatorCss from "./calculator.css?raw";
import calculatorJs from "./calculator.js?raw";
import messageSplitterCss from "./message-splitter.css?raw";
import messageSplitterJs from "./message-splitter.js?raw";
import ttsReaderCss from "./tts-reader.css?raw";
import ttsReaderJs from "./tts-reader.js?raw";

export const DEBUG_HTML_TEMPLATE: ChatTemplate = {
  id: "debug-html-template",
  name: "Starter Template Plugin",
  description: "Minimal starter template with a simple host action button for future prompting experiments.",
  css: referenceThemeCss,
  js: referenceThemeJs,
};

export const DEBUG_HTML_TEMPLATE_1: ChatTemplate = {
  id: "debug-html-template-1",
  name: "Status Ribbon Plugin",
  description: "Adds a status ribbon and highlights TODO or NOTE text inside assistant replies.",
  css: statusRibbonCss,
  js: statusRibbonJs,
};

export const DEBUG_HTML_TEMPLATE_2: ChatTemplate = {
  id: "debug-html-template-2",
  name: "Night Glass Plugin",
  description: "Applies a dark glass visual treatment and adds a quick brainstorming action.",
  css: nightGlassCss,
  js: nightGlassJs,
};

export const DEBUG_HTML_TEMPLATE_3: ChatTemplate = {
  id: "debug-html-template-3",
  name: "Calculator Plugin",
  description: "Adds a calculator panel and evaluates messages that end with '=' using safe arithmetic expressions.",
  css: calculatorCss,
  js: calculatorJs,
};

export const DEBUG_HTML_TEMPLATE_4: ChatTemplate = {
  id: "debug-html-template-4",
  name: "Message Splitter Plugin",
  description: "Splits long assistant messages at \\n---\\n boundaries and displays each segment as a visually separate block.",
  css: messageSplitterCss,
  js: messageSplitterJs,
};

export const DEBUG_HTML_TEMPLATE_5: ChatTemplate = {
  id: "debug-html-template-5",
  name: "TTS Read-Aloud Plugin",
  description: "Adds a speaker icon to assistant messages. Click to read the text aloud with auto language detection.",
  css: ttsReaderCss,
  js: ttsReaderJs,
};

export const DEBUG_TEMPLATE_COMMANDS: Record<string, ChatTemplate> = {
  HTML: DEBUG_HTML_TEMPLATE,
  HTML1: DEBUG_HTML_TEMPLATE_1,
  HTML2: DEBUG_HTML_TEMPLATE_2,
  HTML3: DEBUG_HTML_TEMPLATE_3,
  HTML4: DEBUG_HTML_TEMPLATE_4,
  HTML5: DEBUG_HTML_TEMPLATE_5,
};
