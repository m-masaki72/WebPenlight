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

const shareButton = document.getElementById('share-button');
const qrcodeModal = document.getElementById('qrcode-modal');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const closeModalButton = document.getElementById('close-modal-button');
const shareUrlInput = document.getElementById('share-url-input');
const copyUrlButton = document.getElementById('copy-url-button');

const presetContainer = document.getElementById('preset-container');
const savePresetButton = document.getElementById('save-preset-button');
const presetMessage = document.getElementById('preset-message');

// --- 状態管理 ---
let isVertical = false;
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
orientationToggle.addEventListener('click', () => {
    isVertical = !isVertical;
    updateOrientation(isVertical);
});
lightStickScreen.addEventListener('click', toggleControls);
dragHandle.addEventListener('click', toggleControls);
shareButton.addEventListener('click', generateShareQr);
closeModalButton.addEventListener('click', () => qrcodeModal.classList.add('hidden'));
copyUrlButton.addEventListener('click', copyShareUrl);
savePresetButton.addEventListener('click', toggleSaveMode);

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
    color: hexInput.value,
    text: textInput.value,
    font: fontSelect.value,
    isVertical: isVertical
  };
  // オブジェクトをJSON文字列に変換して保存
  localStorage.setItem('penlightSettings', JSON.stringify(settings));
}

// --- 共有機能 ---
function generateShareQr() {
    // 1. 現在の表示設定をパラメータに追加
    const settings = {
        c: hexInput.value.replace('#', ''), t: textInput.value,
        f: fontSelect.value, v: isVertical ? '1' : '0'
    };
    const params = new URLSearchParams();
    if(settings.c) params.append('c', settings.c);
    if(settings.t) params.append('t', settings.t);
    if(settings.f) params.append('f', settings.f);
    if(settings.v) params.append('v', settings.v);

    // 2. プリセット情報をパラメータに追加
    const presets = getPresets();
    const fontOptions = Array.from(fontSelect.options).map(opt => opt.value);
    
    const presetStrings = presets.map(p => {
        if (!p) return '';
        const fontIndex = fontOptions.indexOf(p.font);
        if (fontIndex === -1) return '';
        
        const color = p.color.replace('#', '');
        // UTF-8文字列を安全にBase64エンコードする
        const textBase64 = btoa(unescape(encodeURIComponent(p.text)));
        const vertical = p.isVertical ? '1' : '0';
        
        return `${color}~${textBase64}~${fontIndex}~${vertical}`;
    }).join('|');

    if (presetStrings) {
        params.append('p', presetStrings);
    }

    const url = `${location.protocol}//${location.host}${location.pathname}?${params.toString()}`;
    shareUrlInput.value = url;
    QRCode.toCanvas(qrcodeCanvas, url, { width: 200, errorCorrectionLevel: 'H' }, (error) => {
        if (error) console.error(error);
    });
    qrcodeModal.classList.remove('hidden');
}
function copyShareUrl() {
    shareUrlInput.select();
    shareUrlInput.setSelectionRange(0, 99999);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
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
    presets[index] = {
        color: hexInput.value, text: textInput.value,
        font: fontSelect.value, isVertical: isVertical
    };
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
    showMessage(`プリセット ${index + 1} に保存しました`);
    renderPresetSlots();
    toggleSaveMode();
}
function loadPreset(index) {
    const presets = getPresets();
    const preset = presets[index];
    if (preset) {
        updateColor(preset.color);
        updateText(preset.text);
        updateFont(preset.font);
        updateOrientation(preset.isVertical);
        showMessage(`プリセット ${index + 1} を読み込みました`);
    } else {
        showMessage(`プリセット ${index + 1} は空です`);
    }
}
function toggleSaveMode() {
    isSaveMode = !isSaveMode;
    presetContainer.classList.toggle('preset-save-mode', isSaveMode);
    savePresetButton.textContent = isSaveMode ? '保存先のスロットを選択してください' : '現在の設定を保存';
    if (isSaveMode) {
        showMessage('保存したいスロットをタップ (もう一度押すとキャンセル)');
    } else {
         showMessage('');
    }
}
function getTextColorForBg(hexColor) {
    if (!hexColor || hexColor.length < 7) return 'text-white';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'text-black' : 'text-white';
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
            const textColorClass = getTextColorForBg(preset.color);
            slot.className = `${baseClasses} ${textColorClass} border-gray-400 hover:opacity-80`;
        } else {
            slot.className = `${baseClasses} text-white bg-gray-700 hover:bg-gray-600 border-dashed border-gray-600`;
        }
        presetContainer.appendChild(slot);
    }
}
function showMessage(text) {
    presetMessage.textContent = text;
    if(text) {
        setTimeout(() => {
            if (presetMessage.textContent === text) presetMessage.textContent = '';
        }, 3000);
    }
}
presetContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('preset-slot')) {
        const index = parseInt(e.target.dataset.index, 10);
        if (isSaveMode) savePreset(index);
        else loadPreset(index);
    }
});

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
    colorPalette.addEventListener('click', (e) => {
        if (e.target.dataset.color) updateColor(e.target.dataset.color);
    });

     // localStorageから前回保存した設定を読み込む
    const savedSettings = localStorage.getItem('penlightSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        // 保存された設定がnullでないことを確認してから適用
        if(settings.color) updateColor(settings.color);
        if(settings.text) updateText(settings.text);
        if(settings.font) updateFont(settings.font);
        // isVerticalはブーリアンなので存在チェックのみ
        if(typeof settings.isVertical !== 'undefined') updateOrientation(settings.isVertical);
    }
    
    const params = new URLSearchParams(window.location.search);

    // URLからプリセット情報を復元（最優先）
    const presetsParam = params.get('p');
    if (presetsParam) {
        try {
            const fontOptions = Array.from(fontSelect.options).map(opt => opt.value);
            const presetStrings = presetsParam.split('|');
            const newPresets = presetStrings.map(s => {
                if (!s) return null;
                const parts = s.split('~');
                if (parts.length !== 4) return null;
                
                const fontIndex = parseInt(parts[2], 10);
                if (isNaN(fontIndex) || fontIndex >= fontOptions.length) return null;

                return {
                    color: `#${parts[0]}`,
                    text: decodeURIComponent(escape(atob(parts[1]))),
                    font: fontOptions[fontIndex],
                    isVertical: parts[3] === '1'
                };
            });
            localStorage.setItem(PRESET_KEY, JSON.stringify(newPresets));
            showMessage('プリセットを共有URLから復元しました！');
        } catch (e) {
            console.error("Failed to parse presets from URL", e);
            showMessage('プリセットの復元に失敗しました');
        }
    }

    // URLから現在の表示設定を復元
    if (params.has('c') || params.has('t') || params.has('f') || params.has('v')) {
        updateColor(`#${params.get('c') || '00aaff'}`);
        updateText(params.get('t') || '');
        updateFont(params.get('f') || fontSelect.options[0].value);
        updateOrientation(params.get('v') === '1');
    } else {
        displayText.style.fontFamily = fontSelect.value;
    }

    // URLをきれいにする
    try {
        if (window.history.replaceState) {
            const url = `${location.protocol}//${location.host}${location.pathname}`;
            window.history.replaceState({ path: url }, '', url);
        }
    } catch (e) { console.warn("Could not clean URL:", e); }

    renderPresetSlots();
    
    // パネルの高さを動的に調整
    const setControlsHeight = () => {
        const vh = window.innerHeight;
        const panelContent = controls.querySelector('.overflow-y-auto');
        if (panelContent) {
            // つまみと説明文の高さを考慮
            const headerHeight = 80; // おおよその高さ
            panelContent.style.maxHeight = `${vh * 0.6 - headerHeight}px`;
        }
    };
    
    window.addEventListener('resize', setControlsHeight);
    setControlsHeight();
}

document.addEventListener('DOMContentLoaded', initApp);
