// 音效管理器
export class Audio {
  constructor() {
    this.sounds = {}
    this.enabled = true
  }

  // 加载音效
  load(name, src) {
    try {
      const audio = wx.createInnerAudioContext()
      audio.src = src
      this.sounds[name] = audio
    } catch (e) {
      // 音效加载失败不影响游戏运行
      console.warn('Audio load failed:', name, e)
    }
  }

  // 播放音效
  play(name) {
    if (!this.enabled) return
    const sound = this.sounds[name]
    if (sound) {
      try {
        sound.stop()
        sound.play()
      } catch (e) {
        // 忽略播放错误
      }
    }
  }

  // 静音切换
  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }
}
