// 获取当前标签
let tab;
let httpTab;
let i18nText = {};
(async () => {
  [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
  httpTab = tab.url.startsWith('http');
})();

// 保存设定的参数
const savePopup = async () => {
  let runSwitch = document.getElementById('runSwitch').checked;
  let modeRadio = document.querySelector('input[name="modeRadio"]:checked').value;
  // 保存到本地
  chrome.storage.sync.set(
    { runSwitch: runSwitch, modeRadio: modeRadio },
    () => {
      // nope
    }
  );

  if (tab != null && httpTab){
    // 往页面发送
    const response = await chrome.tabs.sendMessage(tab.id, { runSwitch: runSwitch, modeRadio: modeRadio });
    console.log(response);
  }
  domControl();
};

// 还原保存的参数
const restoreOptions = () => {
  chrome.storage.sync.get(
    { runSwitch: true, modeRadio: '0' },
    (items) => {
      document.getElementById('runSwitch').checked = items.runSwitch;
      if (items.modeRadio === '0'){
        document.getElementById('singleMode').checked = true;
      } else {
        document.getElementById('multiMode').checked = true;
      }
      // disable 相关元素
      domControl(); 
      // 设置快捷键
      chrome.commands.getAll().then((data) => {
        let command = null;
        data.forEach((el) => {
          if (el.name === 'run-select'){
            command = el.shortcut;
          }
        });
        document.getElementById('command').value = command != '' ?command : '[' + i18nText.unset + ']';
      });
    }
  );
};

const domControl = () => {
  let runSwitch = document.getElementById('runSwitch').checked
  if (runSwitch){
    // 选择页面上所有名为'modeRadio'的radio按钮
    const modeRadios = document.querySelectorAll('input[name="modeRadio"]');
    // 遍历并设置每个radio按钮为disabled
    modeRadios.forEach(radio => {
      radio.disabled = false;
    });
    let btn = document.getElementById('selectBtn');
    btn.disabled = false;
    if (!httpTab){
      btn.setAttribute('data-tooltip', i18nText.pageDisabled);
    }
  } else {
    // 选择页面上所有名为'modeRadio'的radio按钮
    const modeRadios = document.querySelectorAll('input[name="modeRadio"]');
    // 遍历并设置每个radio按钮为disabled
    modeRadios.forEach(radio => {
      radio.disabled = true;
    });
    let btn = document.getElementById('selectBtn');
    btn.disabled = true;
    if (httpTab){
      btn.removeAttribute('data-tooltip');
    }
  }
};

const initI18n = () => {
  // 选择按钮
  document.getElementById('selectBtn').textContent = '[+] ' + chrome.i18n.getMessage("selectBtn");
  // 启用功能选框
  document.getElementById('runSwitchText').textContent = chrome.i18n.getMessage("enableFeature");
  // 选择模式文字
  document.getElementById('modeText').textContent = chrome.i18n.getMessage("model");
  // 单次选择文字
  document.getElementById('singleText').textContent = chrome.i18n.getMessage("singleModel");
  // 多次选择文字
  document.getElementById('multiText').textContent = chrome.i18n.getMessage("multiMode");
  // 快捷键文字
  document.getElementById('commandText').textContent = chrome.i18n.getMessage("shortcutKey");
  // 说明文字
  document.getElementById('options').textContent = '[' + chrome.i18n.getMessage("readme") + ']';
  // 未设置文字
  i18nText.unset = chrome.i18n.getMessage("unset");
  // 页面禁用文字
  i18nText.pageDisabled = chrome.i18n.getMessage("pageDisabled");
};

// 添加参数变化监听
document.addEventListener('DOMContentLoaded', initI18n);
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('runSwitch').addEventListener('change', savePopup);
document.getElementById('singleMode').addEventListener('change', savePopup);
document.getElementById('multiMode').addEventListener('change', savePopup);

// 跳转设置
document.querySelector('#options').addEventListener('click', function() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('interface/options/options.html'));
  }
});

// 点击选择按钮
document.querySelector('#selectBtn').addEventListener('click', async function() {
  if (!httpTab) return;
  const response = await chrome.tabs.sendMessage(tab.id, {selectBtn: true});
  window.close();
  console.log(response);
});
