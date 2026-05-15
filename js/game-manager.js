import { Renderer } from './renderer.js'
import { Stack } from './stack.js'
import { Input } from './input.js'
import { DinoAudio } from './dino-audio.js'
import { Share } from './share.js'
import { DEBUG } from './debug-config.js'
import { getHighScore, setHighScore } from './utils.js'
import { submitScore, requestFriendLeaderboard, closeFriendLeaderboard, requestUserProfile } from './leaderboard.js'

const STATE = {
  START: 'start',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  LEADERBOARD: 'leaderboard'
}

const GUIDE_STORAGE_KEY = 'guideShownState'

const DINO_GUIDE_TEXTS = [
  '霸王龙之怒：震慑敌人，下一块减速！',
  '腕龙之力：长颈展开，下一块加宽！',
  '剑龙之盾：坚硬铠甲，免疫一次切割！',
  '翼龙之翼：空中引导，自动修正位置！',
  '迅猛龙之速：极速爆发，得分三倍！'
]

const ITEM_GUIDE_TEXTS = {
  magnet: '磁铁道具：自动吸附，完美放置！',
  widen: '加宽道具：恢复方块宽度！'
}

const RAINBOW_GUIDE_TEXT = '彩虹方块：无论位置如何，自动完美！'

export class GameManager {
  constructor({ canvas, ctx, screenWidth, screenHeight, offsetY }) {
    this.canvas = canvas
    this.ctx = ctx
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.offsetY = offsetY || 0
    this.state = STATE.START
    this.highScore = getHighScore()
    this.lastScore = 0
    this.isNewRecord = false
    this.placing = false
    this.paused = false
    this.reviveCount = 0

    this.renderer = new Renderer({ canvas, ctx, screenWidth, screenHeight, offsetY: this.offsetY })
    this.stack = new Stack(screenWidth, screenHeight)
    this.input = new Input(canvas)
    this.audio = new DinoAudio()
    this.audio.preload()
    this.share = new Share()

    // 引导系统
    this.guideState = null // null | { text }
    this.guideShown = this._loadGuideState()

    this.input.setTapHandler(this._onTap.bind(this))

    wx.onHide(() => {
      this.paused = true
      this.audio.stopAmbient()
    })
    wx.onShow(() => { this.paused = false })
  }

  start() {
    this.stack.init()
    this._loop()
  }

  _loop() {
    this._update()
    this._render()
    requestAnimationFrame(() => this._loop())
  }

  _update() {
    if (this.paused) return
    // 更新恐龙弹出动画
    this.renderer.updatePopups()

    if (this.state === STATE.PLAYING) {
      this.stack.update()
      this.renderer.updateCamera(this.stack.stackTopY)

      // 里程碑检测
      if (this.stack.milestoneEvent) {
        this.renderer.triggerMilestone(this.stack.milestoneEvent.layer)
        this.stack.milestoneEvent = null
      }

      if (this.stack.gameOver) {
        this._onGameOver()
      }
    }
  }

  _render() {
    this.renderer.clear()
    switch (this.state) {
      case STATE.START:
        this.renderer.drawStartScreen(this.highScore)
        break
      case STATE.PLAYING:
        this.renderer.drawBackground()
        for (const block of this.stack.blocks) {
          this.renderer.drawBlock(block)
        }
        if (this.stack.currentBlock) {
          this.renderer.drawBlock(this.stack.currentBlock)
        }
        for (const piece of this.stack.fallingPieces) {
          this.renderer.drawFallingPiece(piece)
        }
        this.renderer.drawParticles(this.stack.particles)
        this.renderer.drawHUD(this.stack.score, this.stack.combo)
        this.renderer.drawComboGlow(this.stack.combo)
        this.renderer.drawItemHUD(this.stack.itemInventory, this.stack._magnetActive)
        this.renderer.drawPerfectText()
        // 绘制恐龙弹出特效
        this.renderer.drawDinoPopups()
        this.renderer.drawReviveEffect()
        this.renderer.drawMilestone()
        this.renderer.drawItemGetAnim()
        this.renderer.drawToast()
        // 引导弹窗（最上层）
        if (this.guideState) {
          this.renderer.drawGuide(this.guideState.text)
        }
        break
      case STATE.GAME_OVER:
        this.renderer.drawBackground()
        for (const block of this.stack.blocks) {
          this.renderer.drawBlock(block)
        }
        if (!this.paused) {
          this.stack.update()
        }
        for (const piece of this.stack.fallingPieces) {
          this.renderer.drawFallingPiece(piece)
        }
        this.renderer.drawGameOver(this.lastScore, this.highScore, this.isNewRecord, this.reviveCount)
        break
      case STATE.LEADERBOARD:
        this.renderer.drawLocalLeaderboard()
        break
    }
  }

  _onTap(touch) {
    // 引导弹窗处理
    if (this.guideState) {
      const x = touch.clientX
      const y = touch.clientY - this.offsetY
      // 「跳过所有引导」按钮区域（底部）
      const skipBtnY = this.screenHeight * 0.5 + 60
      const skipBtnH = 30
      if (y >= skipBtnY && y <= skipBtnY + skipBtnH) {
        this._skipAllGuides()
      } else {
        // 标记当前引导已读并保存
        this._saveGuideState()
      }
      this.guideState = null
      this.paused = false
      return
    }

    switch (this.state) {
      case STATE.START:
        this._startGame()
        break
      case STATE.PLAYING:
        // 检测是否点击了道具按钮
        const itemHit = this.renderer.hitTestItem(
          touch.clientX,
          touch.clientY - this.offsetY
        )
        if (itemHit) {
          this._useItem(itemHit)
        } else {
          this._placeBlock()
        }
        break
      case STATE.GAME_OVER:
        this._handleGameOverTap(touch)
        break
      case STATE.LEADERBOARD:
        this.state = STATE.GAME_OVER
        closeFriendLeaderboard()
        break
    }
  }

  _useItem(key) {
    if (this.placing) return
    if (key === 'widen') {
      const ok = this.stack.useWiden()
      if (ok) {
        console.log('[Item] 加宽道具已使用')
        this.renderer.triggerScale(1.03, 8)
        wx.vibrateShort && wx.vibrateShort({ type: 'light' })
      } else if (this.stack.currentBlock && this.stack.itemInventory.widen > 0) {
        // 有道具但无法使用（已是最长）
        this.renderer.triggerToast('已经最长啦')
      }
    } else if (key === 'magnet') {
      if (this.stack.itemInventory.magnet <= 0) return
      // 直接消耗磁铁并放置（一步到位）
      if (!DEBUG.enabled || !DEBUG.infiniteItems) this.stack.itemInventory.magnet--
      this.stack._magnetActive = true
      console.log('[Item] 磁铁道具使用，直接对齐放置')
      wx.vibrateShort && wx.vibrateShort({ type: 'medium' })
      this._placeBlock()
    }
  }

  _startGame() {
    this.stack.reset()
    this.state = STATE.PLAYING
    this.placing = false
    this.isNewRecord = false
    this.reviveCount = 0
    this.renderer.cameraOffsetY = 0
  }

  _placeBlock() {
    if (this.placing) return
    this.placing = true

    // 翼龙修正：先停住方块做滑动动画，结束后再执行place
    // 但如果磁铁激活或彩虹方块，磁铁/彩虹优先级更高，跳过翼龙动画
    const magnetOrRainbow = this.stack._magnetActive || (this.stack.currentBlock && this.stack.currentBlock.isRainbow)
    if (magnetOrRainbow && this.stack.dinoPower.guidNext) {
      // 磁铁/彩虹优先，消耗翼龙效果
      if (!DEBUG.enabled || !DEBUG.persistDinoPower) {
        this.stack.dinoPower.guidNext = false
      }
    } else if (!magnetOrRainbow && this.stack.dinoPower.guidNext && this.stack.currentBlock && this.stack.currentBlock.moving) {
      const block = this.stack.currentBlock
      const base = this.stack.baseBlock
      const fromX = block.x
      const toX = block.x + (base.x - block.x) * 0.5
      block.stop() // 先停止移动
      this.stack.dinoPower.guidNext = false
      const totalFrames = 45
      let frame = 0
      const animate = () => {
        frame++
        const t = Math.min(frame / totalFrames, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        block.x = fromX + (toX - fromX) * ease
        if (frame < totalFrames) {
          requestAnimationFrame(animate)
        } else {
          // 动画结束，恢复moving状态让place能正常执行
          block.moving = true
          this._executePlacement()
        }
      }
      animate()
      return
    }

    this._executePlacement()
  }

  _executePlacement() {
    const result = this.stack.place()
    if (!result) {
      this.placing = false
      return
    }

    this.audio.playDrop()
    this.audio.playAmbient()

    if (result.result === 'game_over') {
      this.audio.playGameOver()
      this.audio.stopAmbient()
      this._onGameOver()
    } else if (result.result === 'perfect') {
      const dinoType = Math.min(Math.floor((result.combo - 1) / 3), 4)
      this.audio.playPerfect(dinoType)
      this.audio.playCombo(result.combo)
      this.renderer.triggerDinoPopup(dinoType)
      this.renderer.triggerShake(3, 8)
      this.renderer.triggerScale(1.02, 10)
      this.renderer.triggerPerfectText()
    } else if (result.shieldUsed) {
      // 剑龙护盾效果
      this.renderer.triggerToast('护盾抵挡!')
      this.renderer.triggerShake(4, 10)
      // 方块闪金色
      if (this.stack.currentBlock) {
        this.stack.currentBlock.shieldFlash = 60
      }
    } else {
      this.audio.playCut()
    }

    // 迅猛龙倍率效果（所有放置情况都显示）
    if (result.scoreMultiUsed > 1) {
      this.renderer.triggerToast(`得分 x${result.scoreMultiUsed}!`)
    }

    // 引导触发检测
    if (result.dinoPowerTriggered !== undefined) {
      const dt = result.dinoPowerTriggered
      if (!this.guideShown.dino[dt]) {
        this.guideShown.dino[dt] = true
        this._tryShowGuide(DINO_GUIDE_TEXTS[dt])
      }
    }
    if (result.itemUsed && !this.guideShown.item[result.itemUsed]) {
      this.guideShown.item[result.itemUsed] = true
      this._tryShowGuide(ITEM_GUIDE_TEXTS[result.itemUsed])
    }
    if (result.rainbowUsed && !this.guideShown.rainbow) {
      this.guideShown.rainbow = true
      this._tryShowGuide(RAINBOW_GUIDE_TEXT)
    }

    // 获得道具动画
    if (result.itemGot) {
      this.renderer.triggerItemGet(result.itemGot)
    }

    // 恐龙特效触发时延长冻结，让玩家看清效果
    const delay = result.dinoPowerTriggered !== undefined ? 800 : 100
    setTimeout(() => { this.placing = false }, delay)
  }

  _revive() {
    this.reviveCount++
    this.stack.revive()
    this.state = STATE.PLAYING
    this.placing = false
    this.paused = false
    this.renderer.updateCamera(this.stack.stackTopY)
    this.renderer.triggerReviveEffect()
    this.audio.playPerfect(0)
    this.audio.playAmbient()
  }

  _onGameOver() {
    this.state = STATE.GAME_OVER
    this.lastScore = this.stack.score
    if (this.lastScore > this.highScore) {
      this.highScore = this.lastScore
      this.isNewRecord = true
      setHighScore(this.highScore)
    }
    // 先获取用户昵称授权，再提交分数
    requestUserProfile().then(() => {
      submitScore(this.lastScore)
    })
  }

  // --- 引导系统 ---

  _loadGuideState() {
    try {
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        return wx.getStorageSync(GUIDE_STORAGE_KEY) || this._defaultGuideState()
      } else if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(GUIDE_STORAGE_KEY)
        return data ? JSON.parse(data) : this._defaultGuideState()
      }
    } catch (e) {}
    return this._defaultGuideState()
  }

  _defaultGuideState() {
    return {
      dino: [false, false, false, false, false],
      item: { magnet: false, widen: false },
      rainbow: false,
      skipAll: false
    }
  }

  _saveGuideState() {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(GUIDE_STORAGE_KEY, this.guideShown)
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(this.guideShown))
      }
    } catch (e) {}
  }

  _skipAllGuides() {
    this.guideShown.dino = [true, true, true, true, true]
    this.guideShown.item = { magnet: true, widen: true }
    this.guideShown.rainbow = true
    this.guideShown.skipAll = true
    this._saveGuideState()
  }

  _tryShowGuide(text) {
    if (this.guideShown.skipAll) return
    this.guideState = { text }
    this.paused = true
  }

  _handleGameOverTap(touch) {
    const x = touch.clientX
    const y = touch.clientY - this.offsetY
    const btnW = 200
    const btnH = 50
    const btnX = (this.screenWidth - btnW) / 2
    const reviveY = this.screenHeight * 0.58
    if (x >= btnX && x <= btnX + btnW && y >= reviveY && y <= reviveY + btnH) {
      this._revive()
      return
    }
    const restartY = this.screenHeight * 0.69
    if (x >= btnX && x <= btnX + btnW && y >= restartY && y <= restartY + btnH) {
      this._startGame()
      return
    }
    const shareY = this.screenHeight * 0.80
    if (x >= btnX && x <= btnX + btnW && y >= shareY && y <= shareY + btnH) {
      this.share.shareScore(this.lastScore, this.stack.combo)
      return
    }
    const leaderboardY = this.screenHeight * 0.91
    if (x >= btnX && x <= btnX + btnW && y >= leaderboardY && y <= leaderboardY + btnH) {
      this.state = STATE.LEADERBOARD
      requestFriendLeaderboard()
      return
    }
  }
}
