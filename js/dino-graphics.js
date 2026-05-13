// 恐龙绘制模块 — 用 Canvas 路径绘制恐龙剪影

// 在方块上绘制恐龙剪影
export function drawDinoOnBlock(ctx, type, x, y, width, height) {
  if (width < 35 || height < 25) return

  const size = Math.min(width * 0.5, height * 1.2)
  const cx = x + width / 2
  const cy = y + height * 0.5

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = 'rgba(0,0,0,0.25)'

  switch (type % 5) {
    case 0: _drawTRex(ctx, cx, cy, size); break
    case 1: _drawBronto(ctx, cx, cy, size); break
    case 2: _drawStego(ctx, cx, cy, size); break
    case 3: _drawPtero(ctx, cx, cy, size); break
    case 4: _drawRaptor(ctx, cx, cy, size); break
  }

  ctx.restore()
}

// 在开始界面绘制大号恐龙
export function drawDinoLarge(ctx, type, cx, cy, size) {
  ctx.save()
  ctx.fillStyle = '#3A5A2A'

  switch (type % 5) {
    case 0: _drawTRex(ctx, cx, cy, size); break
    case 1: _drawBronto(ctx, cx, cy, size); break
    case 2: _drawStego(ctx, cx, cy, size); break
    case 3: _drawPtero(ctx, cx, cy, size); break
    case 4: _drawRaptor(ctx, cx, cy, size); break
  }

  ctx.restore()
}

// 霸王龙
function _drawTRex(ctx, cx, cy, s) {
  ctx.beginPath()
  // 头部
  ctx.moveTo(cx - s * 0.15, cy - s * 0.5)
  ctx.lineTo(cx + s * 0.2, cy - s * 0.5)
  ctx.lineTo(cx + s * 0.25, cy - s * 0.42)
  ctx.lineTo(cx + s * 0.2, cy - s * 0.35)
  ctx.lineTo(cx + s * 0.05, cy - s * 0.35)
  // 嘴巴张开
  ctx.lineTo(cx + s * 0.15, cy - s * 0.3)
  ctx.lineTo(cx + s * 0.05, cy - s * 0.25)
  // 颈部
  ctx.lineTo(cx - s * 0.05, cy - s * 0.25)
  ctx.lineTo(cx - s * 0.1, cy - s * 0.15)
  // 身体
  ctx.lineTo(cx - s * 0.2, cy - s * 0.05)
  ctx.lineTo(cx - s * 0.25, cy + s * 0.1)
  // 尾巴
  ctx.lineTo(cx - s * 0.5, cy + s * 0.05)
  ctx.lineTo(cx - s * 0.45, cy - s * 0.05)
  ctx.lineTo(cx - s * 0.2, cy - s * 0.0)
  // 后腿
  ctx.lineTo(cx - s * 0.15, cy + s * 0.4)
  ctx.lineTo(cx - s * 0.08, cy + s * 0.4)
  ctx.lineTo(cx - s * 0.02, cy + s * 0.15)
  // 前腿（小短手）
  ctx.lineTo(cx + s * 0.05, cy + s * 0.05)
  ctx.lineTo(cx + s * 0.1, cy + s * 0.12)
  ctx.lineTo(cx + s * 0.12, cy + s * 0.05)
  ctx.lineTo(cx + s * 0.05, cy - s * 0.05)
  ctx.lineTo(cx + s * 0.02, cy - s * 0.15)
  // 回到头部
  ctx.lineTo(cx - s * 0.05, cy - s * 0.3)
  ctx.lineTo(cx - s * 0.15, cy - s * 0.45)
  ctx.closePath()
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#FF4500'
  ctx.beginPath()
  ctx.arc(cx + s * 0.08, cy - s * 0.4, s * 0.03, 0, Math.PI * 2)
  ctx.fill()
}

// 腕龙
function _drawBronto(ctx, cx, cy, s) {
  ctx.beginPath()
  // 头顶
  ctx.moveTo(cx + s * 0.4, cy - s * 0.45)
  ctx.lineTo(cx + s * 0.35, cy - s * 0.5)
  ctx.lineTo(cx + s * 0.3, cy - s * 0.45)
  // 长颈
  ctx.quadraticCurveTo(cx + s * 0.15, cy - s * 0.3, cx + s * 0.05, cy - s * 0.1)
  // 身体
  ctx.lineTo(cx - s * 0.15, cy - s * 0.05)
  ctx.lineTo(cx - s * 0.25, cy + s * 0.1)
  // 尾巴
  ctx.quadraticCurveTo(cx - s * 0.45, cy + s * 0.15, cx - s * 0.5, cy + s * 0.0)
  ctx.quadraticCurveTo(cx - s * 0.45, cy - s * 0.05, cx - s * 0.2, cy - s * 0.0)
  // 后腿
  ctx.lineTo(cx - s * 0.12, cy + s * 0.35)
  ctx.lineTo(cx - s * 0.05, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.0, cy + s * 0.1)
  // 前腿
  ctx.lineTo(cx + s * 0.1, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.17, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.15, cy + s * 0.05)
  // 回到颈部
  ctx.lineTo(cx + s * 0.05, cy - s * 0.1)
  ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.3, cx + s * 0.35, cy - s * 0.45)
  ctx.closePath()
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#7CFC00'
  ctx.beginPath()
  ctx.arc(cx + s * 0.33, cy - s * 0.43, s * 0.025, 0, Math.PI * 2)
  ctx.fill()
}

// 剑龙
function _drawStego(ctx, cx, cy, s) {
  ctx.beginPath()
  // 头（低垂）
  ctx.moveTo(cx + s * 0.35, cy + s * 0.1)
  ctx.lineTo(cx + s * 0.3, cy + s * 0.05)
  ctx.lineTo(cx + s * 0.2, cy + s * 0.05)
  // 背部
  ctx.lineTo(cx + s * 0.1, cy - s * 0.05)
  // 尾巴
  ctx.lineTo(cx - s * 0.1, cy - s * 0.05)
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.0, cx - s * 0.5, cy + s * 0.15)
  ctx.quadraticCurveTo(cx - s * 0.35, cy + s * 0.05, cx - s * 0.15, cy + s * 0.0)
  // 后腿
  ctx.lineTo(cx - s * 0.1, cy + s * 0.35)
  ctx.lineTo(cx - s * 0.03, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.0, cy + s * 0.1)
  // 前腿
  ctx.lineTo(cx + s * 0.1, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.17, cy + s * 0.35)
  ctx.lineTo(cx + s * 0.2, cy + s * 0.1)
  // 回到头部
  ctx.lineTo(cx + s * 0.25, cy + s * 0.1)
  ctx.closePath()
  ctx.fill()

  // 背板（菱形骨板）
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  const plates = [-0.05, 0.0, 0.05, 0.1]
  for (const px of plates) {
    ctx.beginPath()
    const bx = cx + s * px
    ctx.moveTo(bx, cy - s * 0.05)
    ctx.lineTo(bx + s * 0.04, cy - s * 0.25)
    ctx.lineTo(bx + s * 0.08, cy - s * 0.05)
    ctx.closePath()
    ctx.fill()
  }
}

// 翼龙
function _drawPtero(ctx, cx, cy, s) {
  ctx.beginPath()
  // 头+喙
  ctx.moveTo(cx + s * 0.45, cy - s * 0.1)
  ctx.lineTo(cx + s * 0.3, cy - s * 0.15)
  ctx.lineTo(cx + s * 0.15, cy - s * 0.15)
  // 身体
  ctx.lineTo(cx + s * 0.05, cy - s * 0.05)
  ctx.lineTo(cx - s * 0.05, cy + s * 0.05)
  // 尾巴
  ctx.lineTo(cx - s * 0.35, cy + s * 0.15)
  ctx.lineTo(cx - s * 0.3, cy + s * 0.0)
  ctx.lineTo(cx - s * 0.05, cy - s * 0.0)
  // 左翼
  ctx.lineTo(cx - s * 0.15, cy - s * 0.35)
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.4, cx - s * 0.5, cy - s * 0.2)
  ctx.quadraticCurveTo(cx - s * 0.35, cy - s * 0.15, cx - s * 0.05, cy - s * 0.05)
  // 右翼
  ctx.lineTo(cx + s * 0.15, cy - s * 0.35)
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.4, cx + s * 0.5, cy - s * 0.2)
  ctx.quadraticCurveTo(cx + s * 0.35, cy - s * 0.15, cx + s * 0.15, cy - s * 0.15)
  ctx.closePath()
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#FF4500'
  ctx.beginPath()
  ctx.arc(cx + s * 0.22, cy - s * 0.12, s * 0.02, 0, Math.PI * 2)
  ctx.fill()
}

// 迅猛龙
function _drawRaptor(ctx, cx, cy, s) {
  ctx.beginPath()
  // 头
  ctx.moveTo(cx + s * 0.25, cy - s * 0.35)
  ctx.lineTo(cx + s * 0.2, cy - s * 0.4)
  ctx.lineTo(cx + s * 0.12, cy - s * 0.35)
  // 嘴
  ctx.lineTo(cx + s * 0.2, cy - s * 0.3)
  ctx.lineTo(cx + s * 0.12, cy - s * 0.25)
  // 颈
  ctx.lineTo(cx + s * 0.05, cy - s * 0.2)
  // 身体
  ctx.lineTo(cx - s * 0.1, cy - s * 0.1)
  ctx.lineTo(cx - s * 0.2, cy + s * 0.05)
  // 尾巴
  ctx.quadraticCurveTo(cx - s * 0.4, cy + s * 0.0, cx - s * 0.5, cy - s * 0.1)
  ctx.quadraticCurveTo(cx - s * 0.35, cy + s * 0.0, cx - s * 0.15, cy - s * 0.05)
  // 后腿（弯曲，迅猛龙姿态）
  ctx.lineTo(cx - s * 0.1, cy + s * 0.2)
  ctx.lineTo(cx - s * 0.05, cy + s * 0.4)
  ctx.lineTo(cx + s * 0.0, cy + s * 0.4)
  ctx.lineTo(cx + s * 0.05, cy + s * 0.15)
  // 前爪
  ctx.lineTo(cx + s * 0.08, cy - s * 0.0)
  ctx.lineTo(cx + s * 0.12, cy + s * 0.05)
  ctx.lineTo(cx + s * 0.1, cy - s * 0.05)
  // 回到头
  ctx.lineTo(cx + s * 0.05, cy - s * 0.2)
  ctx.lineTo(cx + s * 0.15, cy - s * 0.35)
  ctx.closePath()
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#FFD700'
  ctx.beginPath()
  ctx.arc(cx + s * 0.16, cy - s * 0.33, s * 0.025, 0, Math.PI * 2)
  ctx.fill()
}

// 恐龙名称
export const DINO_LABELS = [
  '霸王龙',
  '腕龙',
  '剑龙',
  '翼龙',
  '迅猛龙',
]
