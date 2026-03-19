// plugin_filter.js
// 这是一个纯逻辑拦截器，用于格式化文本
window.ChatAPI.addFilter('render:text', (text) => {
    // 1. 基础的安全转义防 XSS
    let safeText = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // 2. 插件特有的业务逻辑：将 BUG 标红加粗
    safeText = safeText.replace(/(BUG|报错)/gi, "<strong style='color:red; font-size:1.1em;'>$1</strong>");
    
    // 必须返回处理后的文本，交给下一个插件或最终渲染
    return safeText;
});