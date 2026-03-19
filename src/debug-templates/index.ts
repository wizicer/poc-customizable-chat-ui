import type { ChatTemplate } from "@/types";
import referenceThemeCss from "./reference-theme.css?raw";
import referenceThemeJs from "./reference-theme.js?raw";
import statusRibbonCss from "./status-ribbon.css?raw";
import statusRibbonJs from "./status-ribbon.js?raw";
import nightGlassCss from "./night-glass.css?raw";
import nightGlassJs from "./night-glass.js?raw";

export const DEBUG_HTML_TEMPLATE: ChatTemplate = {
  id: "debug-html-template",
  name: "Reference Theme Plugin",
  description: "Filter + UI injection plugin, following the reference plugin architecture.",
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

export const DEBUG_TEMPLATE_COMMANDS: Record<string, ChatTemplate> = {
  HTML: DEBUG_HTML_TEMPLATE,
  HTML1: DEBUG_HTML_TEMPLATE_1,
  HTML2: DEBUG_HTML_TEMPLATE_2,
};
