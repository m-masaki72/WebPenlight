// --- DOM要素の取得 ---
const lightStickScreen = document.getElementById('light-stick-screen');
const displayText = document.getElementById('display-text');
const controls = document.getElementById('controls');
const dragHandle = document.getElementById('drag-handle');
const colorPicker = document.getElementById('color-picker');
const hexInput = document.getElementById('hex-input');
const textInput = document.getElementById('text-input');
const colorPalette = document.getElementById('color-palette');
const orientationToggle = document.getElementById('orientation-toggle');
const fontSelect = document.getElementById('font-select');
const sizeControls = document.getElementById('size-controls');
const shareButton = document.getElementById('share-button');
const qrcodeModal = document.getElementById('qrcode-modal');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const closeModalButton = document.getElementById('close-modal-button');
const shareUrlInput = document.getElementById('share-url-input');
const copyUrlButton = document.getElementById('copy-url-button');
const presetContainer = document.getElementById('preset-container');
const savePresetButton = document.getElementById('save-preset-button');
const presetMessage = document.getElementById('preset-message');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const fullscreenText = document.getElementById('fullscreen-text');

// --- 状態管理 ---
let isVertical = false;
let currentSize = 'medium';
let isControlsVisible = true;
let isSaveMode = false;
const PRESET_KEY = 'lightStickPresets';
const NUM_PRESETS = 5;

// --- イベントリスナー ---
colorPicker.addEventListener('input', (e) => updateColor(e.target.value));
hexInput.addEventListener('input', (e) => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateColor(e.target.value);
});
textInput.addEventListener('input', (e) => updateText(e.target.value));
fontSelect.addEventListener('change', (e) => updateFont(e.target.value));
sizeControls.addEventListener('click', (e) => {
    const button = e.target.closest('.size-button');
    if (button) updateSize(button.dataset.size);
});
orientationToggle.addEventListener('click', () => updateOrientation(!isVertical));
lightStickScreen.addEventListener('click', toggleControls);
dragHandle.addEventListener('click', toggleControls);
shareButton.addEventListener('click', generateShareQr);
closeModalButton.addEventListener('click', () => qrcodeModal.classList.add('hidden'));
copyUrlButton.addEventListener('click', copyShareUrl);
savePresetButton.addEventListener('click', toggleSaveMode);
presetContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('preset-slot')) {
        const index = parseInt(e.target.dataset.index, 10);
        if (isSaveMode) savePreset(index);
        else loadPreset(index);
    }
});

// フルスクリーン機能のイベントリスナー
fullscreenToggle.addEventListener('click', toggleFullScreen);
document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
document.addEventListener('mozfullscreenchange', updateFullscreenUI);
document.addEventListener('MSFullscreenChange', updateFullscreenUI);

// --- 補助関数 ---
function updateColor(color) {
    lightStickScreen.style.backgroundColor = color;
    colorPicker.value = color;
    hexInput.value = color;
    saveCurrentSettings();
}
function updateText(text) {
    displayText.textContent = text;
    textInput.value = text;
    saveCurrentSettings();
}
function updateFont(font) {
    displayText.style.fontFamily = font;
    fontSelect.value = font;
    saveCurrentSettings();
}
function updateSize(size) {
    currentSize = size;
    const sizeMap = { small: '10vw', medium: '15vw', large: '20vw' };
    displayText.style.fontSize = sizeMap[size] || sizeMap['medium'];
    document.querySelectorAll('.size-button').forEach(btn => {
        btn.classList.toggle('active-size-button', btn.dataset.size === size);
    });
    saveCurrentSettings();
}
function updateOrientation(isVerticalFlag) {
    isVertical = isVerticalFlag;
    displayText.classList.toggle('vertical-text', isVertical);
    orientationToggle.textContent = isVertical ? '横書きにする' : '縦書きにする';
    saveCurrentSettings();
}
function toggleControls() {
    isControlsVisible = !isControlsVisible;
    controls.classList.toggle('controls-hidden', !isControlsVisible);
}
function saveCurrentSettings() {
  const settings = {
    color: hexInput.value, text: textInput.value, font: fontSelect.value,
    size: currentSize, isVertical: isVertical
  };
  localStorage.setItem('penlightSettings', JSON.stringify(settings));
}

// --- フルスクリーン機能 ---
function toggleFullScreen() {
    try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const element = document.documentElement;
            const requestFS = element.requestFullscreen || element.webkitRequestFullscreen || element.msRequestFullscreen;
            if (requestFS) {
                requestFS.call(element).catch(err => {
                     console.error(`フルスクリーンモードへの移行に失敗しました: ${err.name} - ${err.message}`);
                });
            }
        } else {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exitFS) {
                 exitFS.call(document).catch(err => {
                    console.error(`フルスクリーンモードの終了に失敗しました: ${err.name} - ${err.message}`);
                 });
            }
        }
    } catch (e) {
        console.error("フルスクリーン機能の実行に失敗しました。ブラウザの権限ポリシーによりブロックされた可能性があります。", e);
    }
}

function updateFullscreenUI() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        fullscreenText.textContent = 'フルスクリーンを解除';
    } else {
        fullscreenText.textContent = 'フルスクリーンにする';
    }
}

// --- 共有機能 ---
function generateShareQr() {
    const settings = {
        c: hexInput.value.replace('#', ''), t: textInput.value, f: fontSelect.value, 
        s: Object.keys({small:'s',medium:'m',large:'l'}).find(k=>currentSize===k) || 'm', 
        v: isVertical ? '1' : '0'
    };
    const params = new URLSearchParams();
    if(settings.c) params.append('c', settings.c);
    if(settings.t) params.append('t', settings.t);
    if(settings.f) params.append('f', settings.f);
    if(settings.s) params.append('s', settings.s);
    if(settings.v) params.append('v', settings.v);
    const presets = getPresets();
    const fontOptions = Array.from(fontSelect.options).map(opt => opt.value);
    const presetStrings = presets.map(p => {
        if (!p) return '';
        const fontIndex = fontOptions.indexOf(p.font);
        if (fontIndex === -1) return '';
        const textBase64 = btoa(unescape(encodeURIComponent(p.text)));
        return `${p.color.replace('#', '')}~${textBase64}~${fontIndex}~${p.isVertical ? '1' : '0'}`;
    }).join('|');
    if (presetStrings) params.append('p', presetStrings);
    const url = `${location.protocol}//${location.host}${location.pathname}?${params.toString()}`;
    shareUrlInput.value = url;
    QRCode.toCanvas(qrcodeCanvas, url, { width: 200, errorCorrectionLevel: 'H' }, (error) => {
        if (error) console.error(error);
    });
    qrcodeModal.classList.remove('hidden');
}
function copyShareUrl() {
    shareUrlInput.select();
    document.execCommand('copy');
    const originalText = copyUrlButton.textContent;
    copyUrlButton.textContent = 'コピー完了';
    setTimeout(() => { copyUrlButton.textContent = originalText; }, 2000);
}

// --- プリセット機能 ---
function getPresets() {
    const presets = localStorage.getItem(PRESET_KEY);
    return presets ? JSON.parse(presets) : new Array(NUM_PRESETS).fill(null);
}
function savePreset(index) {
    const presets = getPresets();
    presets[index] = { color: hexInput.value, text: textInput.value, font: fontSelect.value, isVertical: isVertical };
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    showMessage(`プリセット ${index + 1} に保存しました`);
    renderPresetSlots();
    toggleSaveMode();
}
function loadPreset(index) {
    const preset = getPresets()[index];
    if (preset) {
        updateColor(preset.color);
        updateText(preset.text);
        updateFont(preset.font);
        updateOrientation(preset.isVertical);
        showMessage(`プリセット ${index + 1} を読み込みました`);
    }
}
function toggleSaveMode() {
    isSaveMode = !isSaveMode;
    presetContainer.classList.toggle('preset-save-mode', isSaveMode);
    savePresetButton.textContent = isSaveMode ? '保存先のスロットを選択してください' : '現在の設定を保存';
}
function getTextColorForBg(hexColor) {
    if (!hexColor || hexColor.length < 7) return 'text-white';
    const r = parseInt(hexColor.substr(1, 2), 16), g = parseInt(hexColor.substr(3, 2), 16), b = parseInt(hexColor.substr(5, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? 'text-black' : 'text-white';
}
function renderPresetSlots() {
    presetContainer.innerHTML = '';
    const presets = getPresets();
    for (let i = 0; i < NUM_PRESETS; i++) {
        const slot = document.createElement('button');
        slot.textContent = i + 1;
        slot.dataset.index = i;
        const baseClasses = 'preset-slot w-full aspect-square rounded-lg cursor-pointer transition-all duration-200 font-bold border-2';
        const preset = presets[i];
        if (preset) {
            slot.style.backgroundColor = preset.color;
            slot.className = `${baseClasses} ${getTextColorForBg(preset.color)} border-gray-400 hover:opacity-80`;
        } else {
            slot.className = `${baseClasses} text-white bg-gray-700 hover:bg-gray-600 border-dashed border-gray-600`;
        }
        presetContainer.appendChild(slot);
    }
}
function showMessage(text) {
    presetMessage.textContent = text;
    if(text) setTimeout(() => { if (presetMessage.textContent === text) presetMessage.textContent = ''; }, 3000);
}

// --- 初期化処理 ---
function initApp() {
    const templateColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#fca5a5', '#818cf8', '#ffffff', '#94a3b8'];
    templateColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'w-full aspect-square rounded-lg cursor-pointer transition transform hover:scale-110 shadow-md border-2 border-gray-700/50';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        colorPalette.appendChild(swatch);
    });
    colorPalette.addEventListener('click', (e) => { if (e.target.dataset.color) updateColor(e.target.dataset.color); });

    const savedSettings = JSON.parse(localStorage.getItem('penlightSettings') || '{}');
    updateColor(savedSettings.color || '#00aaff');
    updateText(savedSettings.text || '');
    updateFont(savedSettings.font || fontSelect.options[0].value);
    updateSize(savedSettings.size || 'medium');
    updateOrientation(savedSettings.isVertical || false);
    
    const params = new URLSearchParams(window.location.search);
    if (params.has('p')) {
        try {
            const fontOptions = Array.from(fontSelect.options).map(opt => opt.value);
            const presetStrings = params.get('p').split('|');
            const newPresets = presetStrings.map(s => {
                if (!s) return null;
                const parts = s.split('~');
                const fontIndex = parseInt(parts[2], 10);
                return {
                    color: `#${parts[0]}`,
                    text: decodeURIComponent(escape(atob(parts[1]))),
                    font: fontOptions[fontIndex],
                    isVertical: parts[3] === '1'
                };
            });
            localStorage.setItem(PRESET_KEY, JSON.stringify(newPresets));
            showMessage('プリセットを共有URLから復元しました！');
        } catch (e) { showMessage('プリセットの復元に失敗'); }
    }

    if (params.has('c')) updateColor(`#${params.get('c')}`);
    if (params.has('t')) updateText(params.get('t'));
    if (params.has('f')) updateFont(params.get('f'));
    if (params.has('v')) updateOrientation(params.get('v') === '1');
    if (params.has('s')) updateSize({s:'small', m:'medium', l:'large'}[params.get('s')] || 'medium');

    // ★★★ URL履歴の操作をエラーハンドリング（修正） ★★★
    try {
        if (window.history.replaceState) {
            const url = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: url }, '', url);
        }
    } catch (e) {
        console.warn("URLのクリーンアップに失敗しました。サンドボックス環境では動作しない場合があります。", e);
    }

    renderPresetSlots();
    
    const setControlsHeight = () => {
        const vh = window.innerHeight;
        const panelContent = controls.querySelector('.overflow-y-auto');
        if (panelContent) {
            const headerHeight = 80;
            panelContent.style.maxHeight = `${vh * 0.7 - headerHeight}px`;
        }
    };
    window.addEventListener('resize', setControlsHeight);
    setControlsHeight();
    
    // フルスクリーンボタンのサポートチェック
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) {
        if (fullscreenToggle) {
            fullscreenToggle.parentElement.style.display = 'none';
        }
    }
}
document.addEventListener('DOMContentLoaded', initApp);
