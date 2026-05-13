// 输入处理模块
export class Input {
  constructor(canvas) {
    this.canvas = canvas
    this.onTap = null
    this._bindEvents()
  }

  _bindEvents() {
    wx.onTouchStart((e) => {
      if (this.onTap) {
        this.onTap(e.touches[0])
      }
    })
  }

  // 设置点击回调
  setTapHandler(handler) {
    this.onTap = handler
  }
}
