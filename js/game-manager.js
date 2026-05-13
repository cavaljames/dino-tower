import { Renderer } from './renderer.js'
import { Stack } from './stack.js'
import { Input } from './input.js'
import { DinoAudio } from './dino-audio.js'
import { Share } from './share.js'
import { getHighScore, setHighScore } from './utils.js'
import { submitScore, requestFriendLeaderboard, closeFriendLeaderboard, requestUserProfile } from './leaderboard.js'

const STATE = {
  START: 'start',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  LEADERBOARD: 'leaderboard'
}

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

    this.renderer = new Renderer({ canvas, ctx, screenWidth, screenHeight, offsetY: this.offsetY })
    this.stack = new Stack(screenWidth, screenHeight)
    this.input = new Input(canvas)
    this.audio = new DinoAudio()
    this.audio.preload()
    this.share = new Share()

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
        // 绘制恐龙弹出特效
        this.renderer.drawDinoPopups()
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
        this.renderer.drawGameOver(this.lastScore, this.highScore, this.isNewRecord)
        break
      case STATE.LEADERBOARD:
        this.renderer.drawLocalLeaderboard()
        break
    }
  }

  _onTap(touch) {
    switch (this.state) {
      case STATE.START:
        this._startGame()
        break
      case STATE.PLAYING:
        this._placeBlock()
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

  _startGame() {
    this.stack.reset()
    this.state = STATE.PLAYING
    this.placing = false
    this.isNewRecord = false
    this.renderer.cameraOffsetY = 0
  }

  _placeBlock() {
    if (this.placing) return
    this.placing = true
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
    } else {
      this.audio.playCut()
    }

    setTimeout(() => { this.placing = false }, 100)
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

  _handleGameOverTap(touch) {
    const x = touch.clientX
    const y = touch.clientY - this.offsetY
    const btnW = 200
    const btnH = 50
    const btnX = (this.screenWidth - btnW) / 2
    const restartY = this.screenHeight * 0.64
    if (x >= btnX && x <= btnX + btnW && y >= restartY && y <= restartY + btnH) {
      this._startGame()
      return
    }
    const shareY = this.screenHeight * 0.75
    if (x >= btnX && x <= btnX + btnW && y >= shareY && y <= shareY + btnH) {
      this.share.shareScore(this.lastScore, this.stack.combo)
      return
    }
    const leaderboardY = this.screenHeight * 0.86
    if (x >= btnX && x <= btnX + btnW && y >= leaderboardY && y <= leaderboardY + btnH) {
      this.state = STATE.LEADERBOARD
      requestFriendLeaderboard()
      return
    }
  }
}
