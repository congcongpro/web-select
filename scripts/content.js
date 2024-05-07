const webSelectI18n = () =>{
  return text = {
    // 选择中文字
    selecting : chrome.i18n.getMessage("selecting"),
    // 复制文字
    copy : chrome.i18n.getMessage("copy"),
    // 取消文字
    cancel : chrome.i18n.getMessage("cancel"),
    // 开启元素选择
    enableElementSelection : chrome.i18n.getMessage("enableElementSelection"),
    // 关闭元素选择
    disableElementSelection : chrome.i18n.getMessage("disableElementSelection"),
    // 已复制
    copied : chrome.i18n.getMessage("copied"),
    // 复制失败
    copyFailed : chrome.i18n.getMessage("copyFailed"),
  };
};

class WebSelect {
  constructor() {
    this.instance = null;
    this.isDragging = false;
    this.initialX;
    this.initialY;
    this.currentX;
    this.currentY;
    this.selectedSet = new Set(); // 使用Set存储被高亮的元素
    this.hisSet = new Set(); // 历史集合
    this.webSelectRun = false; // 切换是否进行网页选择
    this.selectionBox;
    this.multiSelect = true; // 开启多选
    this.allowed; // 插件控制是否激活功能
    this.mouseDown = (e)=>{this.mouseDownHandler(e,this);}
    this.mouseMove = (e)=>{this.mouseMoveHandler(e,this);}
    this.mouseUp = (e)=>{this.mouseUpHandler(e,this);}
    if (!WebSelect.instance) {
      WebSelect.instance = this;
    }
    return WebSelect.instance;
  }

  // 开始拖动事件
  mouseDownHandler(e,that) {
    e.preventDefault();
    that.isDragging = true;
    that.initialX = that.currentX = e.clientX;
    that.initialY = that.currentY = e.clientY;
    that.selectionBox.style.display = 'block';
    that.selectionBox.style.left = that.initialX+'px';
    that.selectionBox.style.top = that.initialY+'px';
    that.selectionBox.style.width = '0';
    that.selectionBox.style.height = '0';
  }

  // 鼠标移动事件
  mouseMoveHandler(e,that) {
    if (that.isDragging) {
      that.currentX = e.clientX;
      that.currentY = e.clientY;
      // 更新选择框的位置和大小
      that.selectionBox.style.width = Math.abs(that.currentX - that.initialX)+'px';
      that.selectionBox.style.height = Math.abs(that.currentY - that.initialY)+'px';
      that.selectionBox.style.left = Math.min(that.initialX, that.currentX)+'px';
      that.selectionBox.style.top = Math.min(that.initialY, that.currentY)+'px';
      // 检查并高亮当前区域内的元素
      let selectionArea = that.selectionBox.getBoundingClientRect();
      let font_element = document.getElementsByTagName('ff');
      Array.from(font_element).forEach(function (el) {
          let elRect = el.getBoundingClientRect();
          let isInside = !(
              elRect.right < selectionArea.left ||
              elRect.left > selectionArea.right ||
              elRect.bottom < selectionArea.top ||
              elRect.top > selectionArea.bottom
          );
          // 1、重复选，去掉高亮；2、选上或在历史列表中；3、未选上，但是选框列表中
          if(isInside && that.hisSet.has(el)){
            el.classList.remove('highlighted');
          } else if ((isInside && !that.selectedSet.has(el)) || that.hisSet.has(el)) {
            el.classList.add('highlighted');
            that.selectedSet.add(el);
          } else if (!isInside && that.selectedSet.has(el)) {
            el.classList.remove('highlighted');
            that.selectedSet.delete(el);
          }
      });
    }
  }

  // 结束拖动事件
  mouseUpHandler(e,that) {
    let outputArry = Array();
    that.isDragging = false;
    that.selectionBox.style.display = 'none';
    that.selectionBox.style.width = '0';
    that.selectionBox.style.height = '0';
    // 判断是否开启多选模式
    if (that.multiSelect){
      // 历史集合中删除没有高亮的
      that.hisSet.forEach(
        (el)=>{
          if (!el.classList.contains('highlighted')) {
            that.hisSet.delete(el);
          }
        }
      )
      // 把已选集合中，已经高亮的，加到历史集合里
      that.selectedSet.forEach(function (el) {
        if (el.classList.contains('highlighted')) {
          that.hisSet.add(el);
        }
      });
    } else {
      // 清除所有高亮
      that.selectedSet.forEach(function (el) {
        outputArry.push(el);
        el.classList.remove('highlighted');
      });
      that.selectedSet.clear(); // 清空Set
      that.toggleSelectionRun(false); // 关闭选择功能
      // 排序，根据页面元素顺序排序
      outputArry.sort(that.sortByDOMOrder);
      let textArray = outputArry.map(element => element.innerText);
      // console.log(textArray);
      if (textArray.length > 0){
        that.writeToClipboard(textArray.join('\n'));
      }
    }
  }

  // 启动web选择
  toggleSelectionRun(enable) {
    if (this.allowed != true) return;
    this.webSelectRun = enable;
    if (enable) {
      // 从body节点开始包裹所有文本节点  
      this.wrapTextWithDiv(document.body);
      // 创建初始化元素
      this.createElement();     
      // 多选模式
      if (this.multiSelect){
        this.showMultiSeleBox();
      }
      this.showFloatingBox(webSelectI18n().enableElementSelection);
      document.body.style.cursor = 'crosshair';
    } else {
      // 多选模式的情况
      if (this.multiSelect){
        // 清除所有高亮
        this.hisSet.forEach(function (el) {
          el.classList.remove('highlighted');
        });
        this.hisSet.clear(); // 清空Set
        if (this.multiSeleBox) {
          this.multiSeleBox.remove(); // 关闭多选提示框
        }
      } 
      this.showFloatingBox(webSelectI18n().disableElementSelection);
      document.body.style.cursor = 'auto';
    }
    // 根据模式切换，启用或禁用其他鼠标事件
    if (enable) {
      document.addEventListener('mousedown', this.mouseDown);
      document.addEventListener('mousemove', this.mouseMove);
      document.addEventListener('mouseup', this.mouseUp);
    } else {
      document.removeEventListener('mousedown', this.mouseDown);
      document.removeEventListener('mousemove', this.mouseMove);
      document.removeEventListener('mouseup', this.mouseUp);
    }
  }

  //显示多选提示框
  showMultiSeleBox() {
    let multiSeleBox = document.getElementById('multiSeleBox');
    if (multiSeleBox === null){
      multiSeleBox = document.createElement('div');
      multiSeleBox.id = 'multiSeleBox';
      multiSeleBox.style.display = 'flex';
      multiSeleBox.style.position = 'fixed';
      multiSeleBox.style.top = '12%';
      multiSeleBox.style.left = '50%';
      multiSeleBox.style.transform = 'translate(-50%, -50%)';
      multiSeleBox.style.padding = '8px 20px';
      multiSeleBox.style.backgroundColor = 'rgba(0, 51, 113, 0.8)';
      multiSeleBox.style.color = 'white';
      multiSeleBox.style.borderRadius = '8px';
      multiSeleBox.style.zIndex = '1000';
      multiSeleBox.style.fontSize = '16px';
      multiSeleBox.style.fontWeight = '500';
      multiSeleBox.innerHTML = `
      <div style="margin:0;padding:6px;">${webSelectI18n().selecting}</div>
      <div style="display:flex;margin:0 0 0 10px;">
      <div id="copyButton" style="margin:0 10px 0 0;padding:5px 8px 5px 8px;border:1px solid white;border-radius:5px;cursor:pointer;">${webSelectI18n().copy}</div>
      <div id="cancelButton" style="margin:0 0 0 10px;padding:5px 8px 5px 8px;border:1px solid white;border-radius:5px;cursor:pointer;">${webSelectI18n().cancel}</div>
      </div>
      `;
      document.body.appendChild(multiSeleBox);
      this.multiSeleBox = multiSeleBox;
      let copyButton = document.getElementById('copyButton');
      let cancelButton = document.getElementById('cancelButton');
      copyButton.addEventListener('click', (e)=>{this.copyButtonClickHandler(e,this,multiSeleBox);});
      cancelButton.addEventListener('click', (e)=>{this.cancelButtonClickHandler(e,this,multiSeleBox);});
    }
  }
  // 多选模式-点击复制按钮
  copyButtonClickHandler(e,that,multiSeleBox) {
    let outputArry = Array.from(that.hisSet);
    // 排序，根据页面元素顺序排序
    outputArry.sort(that.sortByDOMOrder);
    let textArray = outputArry.map(element => element.innerText);
    // console.log(textArray);
    if (textArray.length > 0){
      that.writeToClipboard(textArray.join('\n'));
    } 
    multiSeleBox.remove();
    that.toggleSelectionRun(false);
  }
  // 多选模式-点击关闭按钮
  cancelButtonClickHandler(e,that,multiSeleBox) {
    multiSeleBox.remove();
    that.toggleSelectionRun(false);
  }

  sortByDOMOrder(a, b) {
    // 如果a在b之前，返回一个负数,如果b在a之前，返回一个正数,如果它们是相同的元素，返回0
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  // 创建一个元素包裹文字
  wrapTextWithDiv(node) {
    // 使用TreeWalker遍历所有文本节点
    const treeWalker = document.createTreeWalker(node,NodeFilter.SHOW_TEXT,null,false);
    let currentTextNode = treeWalker.nextNode();
    while (currentTextNode) {
        // 没有内容的不创建，父标签为<ff>不创建
        if (currentTextNode.nodeValue.trim() != "" && currentTextNode.parentNode.nodeName != 'FF'){
          const newDiv = document.createElement('ff');
          // 将当前文本节点包裹进新创建的div中
          currentTextNode.parentNode.insertBefore(newDiv, currentTextNode);
          newDiv.appendChild(currentTextNode);
        }
        // 继续遍历下一个文本节点
        currentTextNode = treeWalker.nextNode();
    }
  }

  //显示Tip浮动框
  showFloatingBox(text) {
    let floatingBox = document.getElementById('floatingBox');
    if (floatingBox === null){
        floatingBox = document.createElement('div');
        floatingBox.id = 'floatingBox';
        floatingBox.textContent = text;
        floatingBox.style.display = 'block';
        floatingBox.style.position = 'fixed';
        floatingBox.style.top = '5%';
        floatingBox.style.left = '50%';
        floatingBox.style.transform = 'translate(-50%, -50%)';
        floatingBox.style.padding = '8px 20px';
        floatingBox.style.backgroundColor = 'rgba(0, 51, 113, 0.8)';
        floatingBox.style.color = 'white';
        floatingBox.style.borderRadius = '8px';
        floatingBox.style.zIndex = '1000';
        floatingBox.style.fontSize = '16px';
        floatingBox.style.fontWeight = '500';
        document.body.appendChild(floatingBox);
    } else {
        floatingBox.textContent = text;
    }
    setTimeout(function() {
      floatingBox.remove();
    }, 2000);
  }

  // 复制文本到剪切板
  async writeToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.showFloatingBox(webSelectI18n().copied);
      } else {
        // 创建text area
        const textArea = document.createElement('textarea');
        textArea.value = text;
        // 使text area不在viewport，同时设置不可见
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        this.showFloatingBox(webSelectI18n().copied);
        new Promise((res, rej) => {
          // 执行复制命令并移除文本框
          document.execCommand('copy') ? res() : rej();
          textArea.remove();
        });
      }
    } catch (err) {
      console.error('error: ', err);
      prompt(webSelectI18n().copyFailed, text);
    }
  }

  // 创建元素
  createElement(){
    // 创建选择矩阵
    if (document.getElementById('selection-box') === null){
      this.selectionBox = document.createElement('div');
      this.selectionBox.setAttribute('id', 'selection-box');
      this.selectionBox.style.position = 'fixed';
      this.selectionBox.style.border = '1px dashed #000';
      this.selectionBox.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
      this.selectionBox.style.zIndex = '999';
      this.selectionBox.style.pointerEvents = 'auto';
      this.selectionBox.style.display = 'none';
      document.body.appendChild(this.selectionBox);
    } 
    // 创建高亮选框
    if (document.getElementById('highlighted-style') === null){
      let styleElement = document.createElement('style');
      styleElement.setAttribute('id','highlighted-style');
      styleElement.textContent = `.highlighted {
      outline: 2px solid; 
      outline-color: rgba(0,105,255,0.8);
      position: relative;
      z-index: 10;
      background: rgba(150,200,255,0.7);
      }`;
      document.head.appendChild(styleElement);
    }
  }
}

// 初始化数据
let webse = null;
chrome.storage.sync.get({ runSwitch: true, modeRadio: '0' }).then((result) => {
  if (result.runSwitch === true){
    if (document.readyState === 'interactive' || document.readyState === 'complete'){
      webse = new WebSelect(); // 页面已加载完成，直接调用函数
      webse.allowed = result.runSwitch;
    } else {
      webse = new WebSelect();
      webse.allowed = result.runSwitch;
      document.addEventListener('DOMContentLoaded', webse);
    }
    if (webse && result.modeRadio === '0'){
      webse.multiSelect = false;
    } else if(webse && result.modeRadio === '1') {
      webse.multiSelect = true;
    }  
  }
});

// 接收消息
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // console.log("接收到来自popup的消息...runSwitch",request.runSwitch);
    // console.log("接收到来自popup的消息...modeRadio",request.modeRadio);
    // console.log("接收到来自popup的消息...selectBtn",request.selectBtn);
    // console.log("接收到来自service-worker的消息...commandRun",request.commandRun);
    if (request.runSwitch != null || request.modeRadio != null || 
      request.selectBtn != null){
      if (this.multiSeleBox != null) {
        this.multiSeleBox.remove();
      }
      if (webse){
        webse.toggleSelectionRun(false);
      }
    }
    if (request.runSwitch === true || request.runSwitch === false){
      if (webse === null){
        webse = new WebSelect();
      }
      webse.allowed = request.runSwitch;
    }
    if (webse && request.modeRadio === '0'){
      webse.multiSelect = false;
    } else if (webse && request.modeRadio === '1'){
      webse.multiSelect = true;
    }
    if (webse && request.selectBtn === true){
      webse.toggleSelectionRun(true);
    }
    if (webse && request.commandRun === true){
      webse.toggleSelectionRun(!webse.webSelectRun);
    }
    if (request.runSwitch != null || request.modeRadio != null || 
      request.selectBtn != null || request.commandRun != null){
      sendResponse({isend: "ok"});
    }
    return true;
  }
);
