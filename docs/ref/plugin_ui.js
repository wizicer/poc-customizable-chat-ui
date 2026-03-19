// plugin_ui.js

// 第一步：向 Alpine 注册插件专属的数据组件
document.addEventListener('alpine:init', () => {
    Alpine.data('dangerActionPlugin', () => ({
        alertCount: 0,
        
        triggerAlert() {
            this.alertCount++;
            // 直接调用核心引擎的通信接口发消息
            window.ChatAPI.sendToHost('sendMessage', { 
                text: `[系统警报] 我已点击了 ${this.alertCount} 次紧急按钮！` 
            });
        }
    }));
});

// 第二步：监听核心引擎的就绪事件，并进行原生 DOM 注入
window.ChatAPI.on('core:mounted', () => {
    console.log("UI 插件开始挂载 DOM");

    const inputArea = document.getElementById('bottom-injection-anchor');
    if (inputArea) {
        // 利用 insertAdjacentHTML 注入原生的 HTML 字符串
        // Alpine 会自动识别里面的 x-data="dangerActionPlugin" 并进行实例化
        const pluginHTML = `
            <button 
                x-data="dangerActionPlugin" 
                @click="triggerAlert()" 
                class="plugin-ui-btn">
                🚨 紧急报警 <span x-show="alertCount > 0" x-text="'(' + alertCount + ')'"></span>
            </button>
        `;
        
        inputArea.insertAdjacentHTML('beforeend', pluginHTML);
    }
});