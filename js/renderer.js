import { drawDinoOnBlock } from './dino-graphics.js'

const BLOCK_COLORS = [
  '#5B8C3E', '#8B6914', '#3D6B4F', '#A67B5B',
  '#6B4226', '#4A7C59', '#C4A35A', '#7A6B54',
]

const DINO_NAMES = [
  '霸王龙之怒', '腕龙之力', '甲龙之盾', '翼龙之翼', '迅猛龙之速',
]

const DINO_IMAGE_SRCS = [
  'images/dino-trex.png',
  'images/dino-bronto.png',
  'images/dino-stego.png',
  'images/dino-ptero.png',
  'images/dino-raptor.png',
]

class DinoPopup {
  constructor(type, x, y) {
    this.type = type
    this.x = x
    this.y = y
    this.scale = 0
    this.targetScale = 1.0
    this.alpha = 1
    this.phase = 'in'
    this.timer = 0
    this.alive = true
  }

  update() {
    this.timer++
    if (this.phase === 'in') {
      this.scale += (this.targetScale - this.scale) * 0.15
      if (this.scale > this.targetScale * 0.9) {
        this.scale = this.targetScale
        this.phase = 'hold'
        this.timer = 0
      }
    } else if (this.phase === 'hold') {
      this.scale = this.targetScale + Math.sin(this.timer * 0.3) * 0.03
      if (this.timer > 40) {
        this.phase = 'out'
      }
    } else if (this.phase === 'out') {
      this.scale += (1.5 - this.scale) * 0.08
      this.alpha -= 0.04
      if (this.alpha <= 0) {
        this.alpha = 0
        this.alive = false
      }
    }
  }
}

export class Renderer {
  constructor({ canvas, ctx, screenWidth, screenHeight }) {
    this.canvas = canvas
    this.ctx = ctx
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.cameraOffsetY = 0
    this.bgImage = null
    this.dinoImages = [null, null, null, null, null]
    this.dinoPopups = []
    this._loadImages()
  }

  _loadImages() {
    const createImg = () => {
      if (typeof wx !== 'undefined' && wx.createImage) return wx.createImage()
      return new Image()
    }

    const bg = createImg()
    bg.onload = () => { this.bgImage = bg }
    bg.onerror = () => { this.bgImage = null }
    bg.src = 'images/jungle-background.png'

    for (let i = 0; i < DINO_IMAGE_SRCS.length; i++) {
      const img = createImg()
      const idx = i
      img.onload = () => {
        this.dinoImages[idx] = img
        console.log('Dino image loaded:', idx)
      }
      img.onerror = (e) => {
        this.dinoImages[idx] = null
        console.log('Dino image failed:', idx, e)
      }
      img.src = DINO_IMAGE_SRCS[i]
    }
  }

  triggerDinoPopup(type) {
    console.log('Trigger dino popup, type:', type, 'image loaded:', !!this.dinoImages[type])
    this.dinoPopups.push(new DinoPopup(
      type,
      this.screenWidth / 2,
      this.screenHeight * 0.25
    ))
  }

  clear() {
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight)
  }

  drawBackground() {
    if (this.bgImage) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.screenWidth, this.screenHeight)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
      const grad = this.ctx.createLinearGradient(0, this.screenHeight * 0.5, 0, this.screenHeight)
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)')
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
      this.ctx.fillStyle = grad
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
    } else {
      this._drawFallbackBackground()
    }
  }

  _drawFallbackBackground() {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, this.screenHeight)
    g.addColorStop(0, '#0B1D0E')
    g.addColorStop(0.3, '#122615')
    g.addColorStop(0.7, '#1A3A1F')
    g.addColorStop(1, '#0D2818')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
  }

  _drawDinoImage(type, cx, cy, size) {
    const img = this.dinoImages[type]
    if (img) {
      this.ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size)
    }
  }

  drawBlock(block) {
    const ctx = this.ctx
    const y = block.y + this.cameraOffsetY
    if (y + block.height < 0 || y > this.screenHeight) return

    ctx.fillStyle = block.color
    this._roundRect(block.x, y, block.width, block.height, 4)
    ctx.fill()

    ctx.save()
    ctx.clip()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 1
    for (let i = -block.height; i < block.width + block.height; i += 8) {
      ctx.beginPath()
      ctx.moveTo(block.x + i, y)
      ctx.lineTo(block.x + i - block.height, y + block.height)
      ctx.stroke()
    }
    ctx.restore()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    this._roundRect(block.x, y, block.width, block.height * 0.25, 4)
    ctx.fill()

    if (block.width > 35 && block.dinoType !== undefined) {
      const img = this.dinoImages[block.dinoType]
      if (img) {
        const drawSize = Math.min(block.width * 0.5, block.height * 1.2)
        const dx = block.x + (block.width - drawSize) / 2
        const dy = y + (block.height - drawSize) / 2
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.drawImage(img, dx, dy, drawSize, drawSize)
        ctx.restore()
      } else {
        drawDinoOnBlock(ctx, block.dinoType, block.x, y, block.width, block.height)
      }
    }
  }

  drawFallingPiece(piece) {
    const ctx = this.ctx
    const y = piece.y + this.cameraOffsetY
    if (y > this.screenHeight + 100) return
    ctx.save()
    ctx.translate(piece.x + piece.width / 2, y + piece.height / 2)
    ctx.rotate((piece.rotation * Math.PI) / 180)
    ctx.fillStyle = piece.color
    ctx.globalAlpha = Math.max(0, 1 - (piece.y - piece.startY) / 400)
    ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height)
    ctx.restore()
  }

  drawParticles(particles) {
    const ctx = this.ctx
    for (const p of particles) {
      const y = p.y + this.cameraOffsetY
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      if (p.isLeaf) {
        ctx.translate(p.x, y)
        ctx.rotate((p.rotation || 0) * Math.PI / 180)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 1.5, p.size, 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  drawHUD(score, combo) {
    const ctx = this.ctx
    ctx.fillStyle = '#E8D5A3'
    ctx.font = 'bold 42px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(score, this.screenWidth / 2, 80)

    if (combo > 0) {
      const dinoIndex = Math.min(Math.floor((combo - 1) / 3), DINO_NAMES.length - 1)
      ctx.fillStyle = '#7CFC00'
      ctx.font = 'bold 22px Arial'
      ctx.fillText(`${DINO_NAMES[dinoIndex]} x${combo}`, this.screenWidth / 2, 120)
    }
  }

  drawDinoPopups() {
    for (const popup of this.dinoPopups) {
      const ctx = this.ctx
      const img = this.dinoImages[popup.type]
      const size = 90 * popup.scale

      ctx.save()
      ctx.globalAlpha = popup.alpha

      // 背景光晕
      ctx.fillStyle = `rgba(124, 252, 0, ${0.25 * popup.alpha})`
      ctx.beginPath()
      ctx.arc(popup.x, popup.y, size * 0.55, 0, Math.PI * 2)
      ctx.fill()

      // 恐龙图
      if (img) {
        ctx.drawImage(img, popup.x - size / 2, popup.y - size / 2, size, size)
      }

      ctx.restore()
    }
  }

  updatePopups() {
    for (const popup of this.dinoPopups) {
      popup.update()
    }
    this.dinoPopups = this.dinoPopups.filter(p => p.alive)
  }

  drawStartScreen(highScore) {
    const ctx = this.ctx
    this.drawBackground()

    this._drawDinoImage(0, this.screenWidth / 2, this.screenHeight * 0.2, 100)

    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 52px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('恐龙塔', this.screenWidth / 2, this.screenHeight * 0.36)

    ctx.fillStyle = '#A8D5A2'
    ctx.font = '20px Arial'
    ctx.fillText('叠起远古巨兽的领地', this.screenWidth / 2, this.screenHeight * 0.36 + 38)

    if (highScore > 0) {
      ctx.fillStyle = '#8B7D6B'
      ctx.font = '18px Arial'
      ctx.fillText(`最高: ${highScore} 层`, this.screenWidth / 2, this.screenHeight * 0.50)
    }

    ctx.fillStyle = '#6B8E4E'
    ctx.font = '15px Arial'
    ctx.fillText('完美叠放唤醒恐龙之力', this.screenWidth / 2, this.screenHeight * 0.57)

    const alpha = 0.4 + 0.6 * Math.sin(Date.now() / 500)
    ctx.fillStyle = `rgba(124, 252, 0, ${alpha})`
    ctx.font = '22px Arial'
    ctx.fillText('点击屏幕开始', this.screenWidth / 2, this.screenHeight * 0.67)
  }

  drawGameOver(score, highScore, isNewRecord) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    this._drawDinoImage(0, this.screenWidth / 2, this.screenHeight * 0.22, 80)

    ctx.fillStyle = '#E8D5A3'
    ctx.font = 'bold 40px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('恐龙陨落', this.screenWidth / 2, this.screenHeight * 0.33)

    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 64px Arial'
    ctx.fillText(score, this.screenWidth / 2, this.screenHeight * 0.43)

    ctx.fillStyle = '#A8D5A2'
    ctx.font = '18px Arial'
    ctx.fillText('层', this.screenWidth / 2, this.screenHeight * 0.47)

    if (isNewRecord) {
      ctx.fillStyle = '#FF6347'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('新纪录!', this.screenWidth / 2, this.screenHeight * 0.50)
    }

    ctx.fillStyle = '#8B7D6B'
    ctx.font = '18px Arial'
    ctx.fillText(`最高: ${highScore} 层`, this.screenWidth / 2, this.screenHeight * 0.56)

    const btnY = this.screenHeight * 0.64
    const btnW = 200
    const btnH = 50
    const btnX = (this.screenWidth - btnW) / 2

    ctx.fillStyle = '#3D6B4F'
    this._roundRect(btnX, btnY, btnW, btnH, 25)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px Arial'
    ctx.fillText('再筑恐龙塔', this.screenWidth / 2, btnY + 32)

    const shareY = this.screenHeight * 0.75
    ctx.fillStyle = '#5B4226'
    this._roundRect(btnX, shareY, btnW, btnH, 25)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px Arial'
    ctx.fillText('召唤好友', this.screenWidth / 2, shareY + 32)
  }

  updateCamera(stackTopY) {
    const threshold = this.screenHeight * 0.4
    if (stackTopY < threshold) {
      this.cameraOffsetY = threshold - stackTopY
    } else {
      this.cameraOffsetY = 0
    }
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx
    r = Math.min(r, Math.min(w, h) / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
}

export { BLOCK_COLORS, DINO_NAMES }
