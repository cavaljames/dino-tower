// 方块类
export class Block {
  constructor({ x, y, width, height, color, moving = false, speed = 2 }) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.color = color
    this.moving = moving
    this.speed = speed
    this.direction = 1 // 1=向右, -1=向左
    this.placed = false
    this.isRainbow = false
  }

  update() {
    if (!this.moving) return

    this.x += this.speed * this.direction

    // 边界反弹
    if (this.x + this.width > this.screenWidth) {
      this.x = this.screenWidth - this.width
      this.direction = -1
    } else if (this.x < 0) {
      this.x = 0
      this.direction = 1
    }
  }

  // 设置屏幕宽度（用于边界检测）
  setScreenWidth(w) {
    this.screenWidth = w
  }

  // 停止移动
  stop() {
    this.moving = false
    this.placed = true
  }

  // 获取方块中心 X
  get centerX() {
    return this.x + this.width / 2
  }
}

// 掉落碎片
export class FallingPiece {
  constructor({ x, y, width, height, color }) {
    this.x = x
    this.y = y
    this.startY = y
    this.width = width
    this.height = height
    this.color = color
    this.rotation = 0
    this.rotationSpeed = (Math.random() - 0.5) * 8
    this.vy = 0
    this.vx = (Math.random() - 0.5) * 3
    this.gravity = 0.5
    this.alive = true
  }

  update() {
    this.vy += this.gravity
    this.y += this.vy
    this.x += this.vx
    this.rotation += this.rotationSpeed

    // 超出屏幕后标记为死亡
    if (this.y > 2000) {
      this.alive = false
    }
  }
}

// 粒子
export class Particle {
  constructor({ x, y, color }) {
    this.x = x
    this.y = y
    this.color = color
    this.size = 2 + Math.random() * 4
    this.vx = (Math.random() - 0.5) * 6
    this.vy = -Math.random() * 8 - 2
    this.gravity = 0.2
    this.alpha = 1
    this.decay = 0.02 + Math.random() * 0.02
    this.alive = true
    this.isLeaf = false
    this.rotation = 0
    this.rotationSpeed = 0
  }

  update() {
    this.vy += this.gravity
    this.x += this.vx
    this.y += this.vy
    this.alpha -= this.decay
    if (this.isLeaf) {
      this.rotation += this.rotationSpeed
      // 树叶飘落时左右摆动
      this.vx += Math.sin(this.y * 0.05) * 0.1
    }

    if (this.alpha <= 0) {
      this.alpha = 0
      this.alive = false
    }
  }
}
