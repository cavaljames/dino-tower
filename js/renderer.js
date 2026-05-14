import { drawDinoOnBlock } from './dino-graphics.js'

const BLOCK_COLORS = [
  '#5B8C3E', '#8B6914', '#3D6B4F', '#A67B5B',
  '#6B4226', '#4A7C59', '#C4A35A', '#7A6B54',
]

const DINO_NAMES = [
  '霸王龙之怒', '腕龙之力', '剑龙之盾', '翼龙之翼', '迅猛龙之速',
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
      this.scale += (this.targetScale - this.scale) * 0.1
      if (this.scale > this.targetScale * 0.95) {
        this.scale = this.targetScale
        this.phase = 'hold'
        this.timer = 0
      }
    } else if (this.phase === 'hold') {
      this.scale = this.targetScale + Math.sin(this.timer * 0.15) * 0.05
      if (this.timer > 80) {
        this.phase = 'out'
      }
    } else if (this.phase === 'out') {
      this.scale += (1.5 - this.scale) * 0.05
      this.alpha -= 0.03
      if (this.alpha <= 0) {
        this.alpha = 0
        this.alive = false
      }
    }
  }
}

export class Renderer {
  constructor({ canvas, ctx, screenWidth, screenHeight, offsetY }) {
    this.canvas = canvas
    this.ctx = ctx
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.offsetY = offsetY || 0
    this.cameraOffsetY = 0
    this.bgImage = null
    this.dinoImages = [null, null, null, null, null]
    this.unknownDinoImage = null
    this.dinoPopups = []
    this.reviveEffect = null
    this.shake = { x: 0, y: 0, intensity: 0, duration: 0 }
    this.scaleEffect = { value: 1, duration: 0, initial: 1 }
    this.milestoneAnim = null
    this.perfectText = null // { timer, duration }
    this.toastText = null // { text, timer, duration }
    this.itemGetAnim = null // { icon, timer, duration, targetX, targetY }
    this._loadImages()
  }

  triggerShake(intensity = 3, duration = 8) {
    this.shake = { intensity, duration, x: 0, y: 0 }
  }

  triggerScale(scale = 1.02, duration = 10) {
    this.scaleEffect = { value: scale, duration, initial: scale }
  }

  triggerPerfectText() {
    this.perfectText = { timer: 0, duration: 40 }
  }

  triggerToast(text) {
    this.toastText = { text, timer: 0, duration: 90 }
  }

  triggerItemGet(itemKey) {
    const icon = itemKey === 'magnet' ? '\u{1F9F2}' : '\u{1F4CF}'
    // 找到目标按钮位置
    let targetX = this.screenWidth - 30
    let targetY = 75
    if (this.itemButtons) {
      const btn = this.itemButtons.find(b => b.key === itemKey)
      if (btn) { targetX = btn.x; targetY = btn.y }
    }
    this.itemGetAnim = { icon, timer: 0, duration: 72, targetX, targetY }
  }

  drawItemGetAnim() {
    if (!this.itemGetAnim) return
    const a = this.itemGetAnim
    a.timer++
    if (a.timer >= a.duration) {
      this.itemGetAnim = null
      return
    }
    const ctx = this.ctx
    const progress = a.timer / a.duration
    // 缓动函数（先快后慢）
    const ease = 1 - Math.pow(1 - progress, 3)
    // 起始：屏幕中央，大尺寸
    const startX = this.screenWidth / 2
    const startY = this.screenHeight * 0.4
    const startSize = 60
    const endSize = 22
    // 插值位置和大小
    const x = startX + (a.targetX - startX) * ease
    const y = startY + (a.targetY - startY) * ease
    const size = startSize + (endSize - startSize) * ease
    // 透明度：开始全显，最后稍微淡出
    const alpha = progress > 0.85 ? 1 - (progress - 0.85) / 0.15 : 1

    ctx.save()
    ctx.globalAlpha = alpha
    // 发光背景
    const glowAlpha = 0.3 * (1 - progress)
    ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`
    ctx.beginPath()
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2)
    ctx.fill()
    // 图标
    ctx.font = `${size}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(a.icon, x, y)
    ctx.restore()
  }

  drawToast() {
    if (!this.toastText) return
    const t = this.toastText
    t.timer++
    if (t.timer >= t.duration) {
      this.toastText = null
      return
    }
    const ctx = this.ctx
    const progress = t.timer / t.duration
    // 弹入缩放
    const scaleIn = t.timer < 8 ? 0.5 + (t.timer / 8) * 0.5 : 1
    // 后30%渐隐
    const alpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1
    const fontSize = 28
    const y = this.screenHeight * 0.3

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(this.screenWidth / 2, y)
    ctx.scale(scaleIn, scaleIn)

    // 背景圆角矩形
    ctx.font = `bold ${fontSize}px Arial`
    const textWidth = ctx.measureText(t.text).width
    const px = 20, py = 12
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    this._roundRect(-textWidth / 2 - px, -fontSize / 2 - py, textWidth + px * 2, fontSize + py * 2, 16)
    ctx.fill()

    // 文字
    ctx.fillStyle = '#FFD700'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255, 180, 0, 0.6)'
    ctx.shadowBlur = 8
    ctx.fillText(t.text, 0, 0)
    ctx.restore()
  }

  drawPerfectText() {
    if (!this.perfectText) return
    const p = this.perfectText
    p.timer++
    if (p.timer >= p.duration) {
      this.perfectText = null
      return
    }

    const ctx = this.ctx
    const progress = p.timer / p.duration
    // 从下往上弹出，停在屏幕40%处（避开恐龙弹窗）
    const startY = this.screenHeight * 0.45
    const endY = this.screenHeight * 0.38
    const bounce = progress < 0.3 ? Math.sin(progress / 0.3 * Math.PI) * 8 : 0
    const y = startY + (endY - startY) * Math.min(progress * 3, 1) - bounce
    // 后半段渐隐
    const alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1
    const scale = 1 + (1 - Math.min(progress * 4, 1)) * 0.3

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(this.screenWidth / 2, y)
    ctx.scale(scale, scale)
    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 26px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowBlur = 4
    ctx.fillText('完美!', 0, 0)
    ctx.restore()
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

    // 未知恐龙图标
    const unknownImg = createImg()
    unknownImg.onload = () => { this.unknownDinoImage = unknownImg }
    unknownImg.onerror = () => { this.unknownDinoImage = null }
    unknownImg.src = 'images/unknown-dino.png'
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
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    // 整体下移offsetY，给小程序按钮留空间
    ctx.translate(0, this.offsetY)

    // 屏幕震动
    if (this.shake.duration > 0) {
      this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 2
      this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 2
      this.shake.duration--
      ctx.translate(this.shake.x, this.shake.y)
    }
    // 缩放反馈
    if (this.scaleEffect.duration > 0) {
      const progress = this.scaleEffect.duration / 10
      const s = 1 + (this.scaleEffect.value - 1) * progress
      ctx.translate(this.screenWidth / 2, this.screenHeight / 2)
      ctx.scale(s, s)
      ctx.translate(-this.screenWidth / 2, -this.screenHeight / 2)
      this.scaleEffect.duration--
    }
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

    // 彩虹方块使用渐变填充
    if (block.color === 'rainbow') {
      const gradient = ctx.createLinearGradient(block.x, y, block.x + block.width, y)
      gradient.addColorStop(0, '#FF0000')
      gradient.addColorStop(0.17, '#FF8C00')
      gradient.addColorStop(0.33, '#FFFF00')
      gradient.addColorStop(0.5, '#00FF00')
      gradient.addColorStop(0.67, '#00BFFF')
      gradient.addColorStop(0.83, '#8A2BE2')
      gradient.addColorStop(1, '#FF1493')
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = block.color
    }
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
      let img
      if (block.dinoType === -1) {
        img = this.unknownDinoImage
      } else {
        img = this.dinoImages[block.dinoType]
      }
      if (img) {
        const drawSize = Math.min(block.width * 0.8, block.height * 0.9)
        const dx = block.x + (block.width - drawSize) / 2
        const dy = y + (block.height - drawSize) / 2
        ctx.save()
        ctx.globalAlpha = 0.75
        ctx.drawImage(img, dx, dy, drawSize, drawSize)
        ctx.restore()
      } else if (block.dinoType === -1) {
        // 无图片时用 ? 号代替
        ctx.save()
        ctx.globalAlpha = 0.75
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold ${block.height * 0.7}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', block.x + block.width / 2, y + block.height / 2)
        ctx.restore()
      } else {
        drawDinoOnBlock(ctx, block.dinoType, block.x, y, block.width, block.height)
      }
    }

    // 加宽闪动效果：只闪变长的那一段
    if (block.widenFlash && block.widenFlash.timer > 0) {
      block.widenFlash.timer--
      const flash = block.widenFlash
      const alpha = 0.4 + Math.sin(flash.timer * 0.4) * 0.4
      const extendWidth = block.width - flash.oldWidth
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#00FFAA'
      // 右侧延伸部分闪动
      this._roundRect(block.x + flash.oldWidth, y, extendWidth, block.height, 4)
      ctx.fill()
      ctx.restore()
    }

    // 剑龙护盾闪金光效果
    if (block.shieldFlash && block.shieldFlash > 0) {
      block.shieldFlash--
      const alpha = 0.3 + Math.sin(block.shieldFlash * 0.5) * 0.3
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#FFD700'
      this._roundRect(block.x, y, block.width, block.height, 4)
      ctx.fill()
      // 金色外边框
      ctx.strokeStyle = '#FFA500'
      ctx.lineWidth = 3
      this._roundRect(block.x, y, block.width, block.height, 4)
      ctx.stroke()
      ctx.restore()
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

  drawComboGlow(combo) {
    if (combo < 5) return
    const ctx = this.ctx
    const intensity = Math.min((combo - 4) / 16, 1)

    const gradient = ctx.createRadialGradient(
      this.screenWidth / 2, this.screenHeight / 2, this.screenHeight * 0.3,
      this.screenWidth / 2, this.screenHeight / 2, this.screenHeight * 0.7
    )

    let glowColor
    if (combo >= 13) glowColor = '255, 69, 0'
    else if (combo >= 10) glowColor = '138, 43, 226'
    else if (combo >= 7) glowColor = '30, 144, 255'
    else glowColor = '124, 252, 0'

    gradient.addColorStop(0, 'transparent')
    gradient.addColorStop(1, `rgba(${glowColor}, ${0.3 * intensity})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)
  }

  drawItemHUD(inventory, magnetActive) {
    if (!inventory) return
    const ctx = this.ctx
    const items = [
      { key: 'magnet', icon: '\u{1F9F2}', active: magnetActive },
      { key: 'widen', icon: '\u{1F4CF}', active: false }
    ]
    this.itemButtons = []
    let offsetX = this.screenWidth - 30
    for (const item of items) {
      const count = inventory[item.key] || 0
      // 磁铁激活中也显示（但count可能为0）
      if (count <= 0 && !item.active) { offsetX -= 50; continue }
      const btnX = offsetX
      const btnY = 75
      const btnR = 22
      ctx.save()
      if (item.active) {
        // 激活状态：蓝色脉动发光
        ctx.fillStyle = 'rgba(0, 150, 255, 0.7)'
        ctx.shadowColor = '#00BFFF'
        ctx.shadowBlur = 12
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      }
      ctx.beginPath()
      ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2)
      ctx.fill()
      // 外圈高亮提示可点击
      ctx.strokeStyle = item.active ? 'rgba(0, 200, 255, 0.9)' : 'rgba(255, 215, 0, 0.7)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = '22px Arial'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.icon, btnX, btnY - 2)
      // 数量角标或"ON"提示
      ctx.font = 'bold 12px Arial'
      if (item.active) {
        ctx.fillStyle = '#00FF88'
        ctx.fillText('ON', btnX, btnY + 18)
      } else {
        ctx.fillStyle = '#FFD700'
        ctx.fillText(`x${count}`, btnX, btnY + 18)
      }
      ctx.restore()
      // 存储按钮区域供点击检测
      if (count > 0 && !item.active) {
        this.itemButtons.push({ key: item.key, x: btnX, y: btnY, r: btnR })
      }
      offsetX -= 50
    }
  }

  // 检测点击是否命中道具按钮，返回 item key 或 null
  hitTestItem(touchX, touchY) {
    if (!this.itemButtons || this.itemButtons.length === 0) return null
    for (const btn of this.itemButtons) {
      const dx = touchX - btn.x
      const dy = touchY - btn.y
      if (dx * dx + dy * dy <= btn.r * btn.r * 4) {
        return btn.key
      }
    }
    return null
  }

  triggerMilestone(layer) {
    this.milestoneAnim = { layer, timer: 0, duration: 120 }
  }

  drawMilestone() {
    if (!this.milestoneAnim) return
    const ctx = this.ctx
    const m = this.milestoneAnim
    m.timer++

    let alpha
    if (m.timer < 20) {
      alpha = m.timer / 20
    } else if (m.timer < 80) {
      alpha = 1
    } else {
      alpha = 1 - (m.timer - 80) / 40
    }

    if (m.timer >= m.duration) {
      this.milestoneAnim = null
      return
    }

    ctx.save()
    ctx.globalAlpha = alpha

    // 全屏金色闪光
    ctx.fillStyle = `rgba(255, 215, 0, ${0.15 * alpha})`
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    // 居中大字
    ctx.fillStyle = '#FFD700'
    ctx.font = 'bold 56px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'
    ctx.shadowBlur = 20
    ctx.fillText(`${m.layer} \u5C42\uFF01`, this.screenWidth / 2, this.screenHeight * 0.35)
    ctx.restore()
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

    if (this.reviveEffect) {
      this.reviveEffect.timer++
      this.reviveEffect.alpha -= 0.015
      this.reviveEffect.radius += 3
      if (this.reviveEffect.alpha <= 0) this.reviveEffect = null
    }
  }

  triggerReviveEffect() {
    this.reviveEffect = {
      timer: 0,
      alpha: 1,
      radius: 20
    }
  }

  drawReviveEffect() {
    if (!this.reviveEffect) return
    const ctx = this.ctx
    const e = this.reviveEffect
    const cx = this.screenWidth / 2
    const cy = this.screenHeight * 0.45

    ctx.save()
    ctx.globalAlpha = e.alpha

    // 扩散能量环
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(124, 252, 0, ${0.6 - i * 0.15})`
      ctx.lineWidth = 4 - i
      ctx.beginPath()
      ctx.arc(cx, cy, e.radius + i * 25, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 向上光柱
    const grad = ctx.createLinearGradient(cx, cy + 80, cx, cy - 120)
    grad.addColorStop(0, 'rgba(124, 252, 0, 0)')
    grad.addColorStop(0.5, 'rgba(124, 252, 0, 0.25)')
    grad.addColorStop(1, 'rgba(124, 252, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(cx - 45, cy - 120, 90, 220)

    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#000'
    ctx.shadowBlur = 8
    ctx.fillText('恐龙救援！', cx, cy)

    ctx.restore()
  }

  drawStartScreen(highScore) {
    const ctx = this.ctx
    this.drawBackground()

    this._drawDinoImage(0, this.screenWidth / 2, this.screenHeight * 0.2, 100)

    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 52px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('冲上恐龙塔', this.screenWidth / 2, this.screenHeight * 0.36)

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

  drawGameOver(score, highScore, isNewRecord, reviveCount) {
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

    const btnW = 200
    const btnH = 42
    const btnX = (this.screenWidth - btnW) / 2

    const reviveY = this.screenHeight * 0.58
    ctx.fillStyle = '#7CFC00'
    this._roundRect(btnX, reviveY, btnW, btnH, 21)
    ctx.fill()
    ctx.fillStyle = '#1A2A16'
    ctx.font = 'bold 18px Arial'
    ctx.fillText(`恐龙救援 (${reviveCount || 0})`, this.screenWidth / 2, reviveY + 28)

    const btnY = this.screenHeight * 0.69
    ctx.fillStyle = '#3D6B4F'
    this._roundRect(btnX, btnY, btnW, btnH, 21)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText('再玩一次', this.screenWidth / 2, btnY + 28)

    const shareY = this.screenHeight * 0.80
    ctx.fillStyle = '#5B4226'
    this._roundRect(btnX, shareY, btnW, btnH, 21)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText('召唤好友', this.screenWidth / 2, shareY + 28)

    const lbY = this.screenHeight * 0.91
    ctx.fillStyle = '#4A7C59'
    this._roundRect(btnX, lbY, btnW, btnH, 21)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Arial'
    ctx.fillText('排行榜', this.screenWidth / 2, lbY + 28)
  }

  updateCamera(stackTopY) {
    const threshold = this.screenHeight * 0.4
    if (stackTopY < threshold) {
      this.cameraOffsetY = threshold - stackTopY
    } else {
      this.cameraOffsetY = 0
    }
  }

  drawLocalLeaderboard() {
    const ctx = this.ctx

    // 获取本地历史数据
    let history = []
    try {
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        history = wx.getStorageSync('leaderboardHistory') || []
      } else if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('leaderboardHistory')
        history = data ? JSON.parse(data) : []
      }
    } catch (e) {}

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(0, 0, this.screenWidth, this.screenHeight)

    // 标题
    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('排行榜', this.screenWidth / 2, 60)

    if (history.length === 0) {
      ctx.fillStyle = '#8B7D6B'
      ctx.font = '20px Arial'
      ctx.fillText('暂无记录，快来创造第一个！', this.screenWidth / 2, this.screenHeight / 2)
    } else {
      const startY = 100
      const rowHeight = 45

      history.slice(0, 15).forEach((item, index) => {
        const y = startY + index * rowHeight

        // 排名颜色
        let rankColor = '#E8D5A3'
        if (index === 0) rankColor = '#FFD700'
        else if (index === 1) rankColor = '#C0C0C0'
        else if (index === 2) rankColor = '#CD7F32'

        // 排名
        ctx.fillStyle = rankColor
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(`${index + 1}`, 20, y)

        // 昵称
        ctx.fillStyle = '#E8D5A3'
        ctx.font = '18px Arial'
        ctx.textAlign = 'left'
        const nickname = item.nickname || '恐龙猎人'
        const displayName = nickname.length > 6 ? nickname.slice(0, 6) + '…' : nickname
        ctx.fillText(displayName, 55, y)

        // 分数
        ctx.fillStyle = '#7CFC00'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'right'
        ctx.fillText(`${item.score} 层`, this.screenWidth - 20, y)
      })
    }

    // 关闭提示
    ctx.fillStyle = '#8B7D6B'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('点击任意位置关闭', this.screenWidth / 2, this.screenHeight - 30)
  }

  drawGuide(text) {
    const ctx = this.ctx
    const sw = this.screenWidth
    const sh = this.screenHeight

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, sw, sh)

    // 居中卡片
    const cardW = sw * 0.75
    const cardH = 140
    const cardX = (sw - cardW) / 2
    const cardY = sh * 0.5 - cardH / 2

    ctx.fillStyle = 'rgba(30, 60, 30, 0.95)'
    this._roundRect(cardX, cardY, cardW, cardH, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(124, 252, 0, 0.5)'
    ctx.lineWidth = 2
    this._roundRect(cardX, cardY, cardW, cardH, 16)
    ctx.stroke()

    // 文案（自动缩小字体以适应卡片宽度）
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let fontSize = 16
    ctx.font = `bold ${fontSize}px Arial`
    while (ctx.measureText(text).width > cardW - 30 && fontSize > 11) {
      fontSize--
      ctx.font = `bold ${fontSize}px Arial`
    }
    ctx.fillText(text, sw / 2, cardY + 45)

    // 点击继续
    ctx.fillStyle = 'rgba(124, 252, 0, 0.9)'
    ctx.font = '16px Arial'
    ctx.fillText('点击继续', sw / 2, cardY + 85)

    // 跳过所有引导
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)'
    ctx.font = '13px Arial'
    ctx.fillText('跳过所有引导', sw / 2, cardY + 115)
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
