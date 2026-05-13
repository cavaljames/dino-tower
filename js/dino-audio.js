// 恐龙音效 — 加载真实音频文件
export class DinoAudio {
  constructor() {
    this.enabled = true
    this.sounds = {}
    this.ambientAudio = null
    this._loaded = false
    this._isWx = false
  }

  preload() {
    if (this._loaded) return
    this._loaded = true

    this._isWx = typeof wx !== 'undefined' && typeof wx.createInnerAudioContext === 'function'

    const files = {
      drop: 'audio/block-drop.mp3',
      perfect: 'audio/perfect.mp3',
      cut: 'audio/block-cut.mp3',
      gameOver: 'audio/game-over.mp3',
      roar0: 'audio/roar-trex.mp3',
      roar1: 'audio/roar-bronto.mp3',
      roar2: 'audio/roar-stego.mp3',
      roar3: 'audio/roar-ptero.mp3',
      roar4: 'audio/roar-raptor.mp3',
      combo: 'audio/combo.mp3',
      ambient: 'audio/jungle-ambient.mp3',
    }

    for (const [key, src] of Object.entries(files)) {
      try {
        if (this._isWx) {
          const audio = wx.createInnerAudioContext()
          audio.src = src
          this.sounds[key] = audio
        } else if (typeof Audio !== 'undefined') {
          const audio = new Audio()
          audio.src = src
          audio.preload = true
          this.sounds[key] = audio
        }
      } catch (e) {
        console.warn('Failed to load audio:', src, e)
      }
    }
  }

  _isPlaying(key) {
    const sound = this.sounds[key]
    if (!sound) return false
    if (this._isWx) {
      // 微信没有直接属性，用 _playing 标记跟踪
      return !!sound._playing
    } else {
      return !sound.paused && !sound.ended && sound.currentTime > 0
    }
  }

  _play(key, volume) {
    if (!this.enabled) return
    if (!this._loaded) this.preload()

    const sound = this.sounds[key]
    if (!sound) return

    // 如果正在播放，跳过
    if (this._isPlaying(key)) return

    try {
      if (this._isWx) {
        sound.stop()
        sound.volume = volume || 1
        sound.seek(0)
        sound._playing = true
        // 兼容：模拟环境可能没有 onEnded
        if (typeof sound.onEnded === 'function') {
          sound.onEnded(() => { sound._playing = false })
        }
        if (typeof sound.onStop === 'function') {
          sound.onStop(() => { sound._playing = false })
        }
        sound.play()
        // 兜底：3秒后自动清除播放标记（防止无回调导致永久锁死）
        const maxDur = 3000
        setTimeout(() => { sound._playing = false }, maxDur)
      } else {
        sound.volume = volume || 1
        sound.currentTime = 0
        sound.play().catch(() => {})
      }
    } catch (e) {
      // silent fail
    }
  }

  playDrop() {
    this._play('drop', 0.6)
  }

  playPerfect(dinoType) {
    this._play('roar' + dinoType, 0.8)
    setTimeout(() => this._play('perfect', 0.7), 100)
  }

  playCut() {
    this._play('cut', 0.7)
  }

  playGameOver() {
    this._play('gameOver', 0.9)
  }

  playCombo(comboLevel) {
    const vol = Math.min(0.5 + comboLevel * 0.05, 1)
    this._play('combo', vol)
  }

  playAmbient() {
    if (!this.enabled || this.ambientAudio) return
    if (!this._loaded) this.preload()

    const sound = this.sounds['ambient']
    if (!sound) return

    try {
      if (this._isWx) {
        sound.loop = true
        sound.volume = 0.15
        sound.play()
        this.ambientAudio = sound
      } else {
        sound.loop = true
        sound.volume = 0.15
        sound.play().catch(() => {})
        this.ambientAudio = sound
      }
    } catch (e) {
      // silent fail
    }
  }

  stopAmbient() {
    if (this.ambientAudio) {
      try {
        if (this._isWx) {
          this.ambientAudio.stop()
        } else {
          this.ambientAudio.pause()
        }
      } catch (e) {}
      this.ambientAudio = null
    }
  }

  toggle() {
    this.enabled = !this.enabled
    if (!this.enabled) this.stopAmbient()
    return this.enabled
  }
}
