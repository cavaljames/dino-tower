import { Block, FallingPiece, Particle } from './block.js'
import { BLOCK_COLORS, DINO_NAMES } from './renderer.js'

const BLOCK_HEIGHT = 40
const INITIAL_WIDTH_RATIO = 0.5 // 初始方块宽度占屏幕比例
const PERFECT_THRESHOLD = 8 // 完美判定容差(px)

export class Stack {
  constructor(screenWidth, screenHeight) {
    this.screenWidth = screenWidth
    this.screenHeight = screenHeight
    this.blocks = []
    this.fallingPieces = []
    this.particles = []
    this.currentBlock = null
    this.baseBlock = null
    this.blockHeight = BLOCK_HEIGHT
    this.layerCount = 0
    this.combo = 0
    this.score = 0
    this.gameOver = false
  }

  // 初始化基座
  init() {
    const width = this.screenWidth * INITIAL_WIDTH_RATIO
    const x = (this.screenWidth - width) / 2
    const y = this.screenHeight - this.blockHeight - 40

    const baseBlock = new Block({
      x, y, width, height: this.blockHeight,
      color: BLOCK_COLORS[0]
    })
    baseBlock.setScreenWidth(this.screenWidth)
    baseBlock.stop()
    this.blocks.push(baseBlock)
    this.baseBlock = baseBlock

    // 创建第一个滑动方块
    this._createMovingBlock()
  }

  // 创建新的滑动方块
  _createMovingBlock() {
    const width = this.baseBlock.width
    const y = this.baseBlock.y - this.blockHeight
    const colorIndex = (this.blocks.length) % BLOCK_COLORS.length
    // 层数系数：越高越快，0.0~1.0
    const layerFactor = Math.min(this.layerCount / 20, 1.0)
    // 宽度系数：越窄越慢，1.0~0.3
    const widthFactor = Math.max(width / this.screenWidth, 0.3)
    const speed = 1.5 + layerFactor * 10 * widthFactor

    const block = new Block({
      x: 0,
      y,
      width,
      height: this.blockHeight,
      color: BLOCK_COLORS[colorIndex],
      moving: true,
      speed
    })
    // 每5层显示一个恐龙剪影
    if (this.blocks.length > 0 && this.blocks.length % 5 === 0) {
      block.dinoType = Math.floor(this.blocks.length / 5) % 5
    }
    block.setScreenWidth(this.screenWidth)
    this.currentBlock = block
  }

  // 放置当前方块
  place() {
    if (!this.currentBlock || !this.currentBlock.moving) return null

    this.currentBlock.stop()
    const moving = this.currentBlock
    const base = this.baseBlock

    // 计算重叠区域
    const overlapLeft = Math.max(moving.x, base.x)
    const overlapRight = Math.min(moving.x + moving.width, base.x + base.width)
    const overlapWidth = overlapRight - overlapLeft

    // 完全没对齐 → 游戏结束
    if (overlapWidth <= 0) {
      this.gameOver = true
      // 整个方块掉落
      this.fallingPieces.push(new FallingPiece({
        x: moving.x, y: moving.y,
        width: moving.width, height: moving.height,
        color: moving.color
      }))
      return { result: 'game_over', combo: this.combo, score: this.score }
    }

    // 判定是否完美
    const offset = Math.abs(moving.x - base.x)
    const isPerfect = offset < PERFECT_THRESHOLD

    let placedWidth
    let placedX = overlapLeft
    if (isPerfect) {
      // 完美放置：保持原宽度，吸附到基座中心位置
      placedWidth = base.width
      placedX = base.x
      this.combo++
      this.score += this.combo * 2

      // 生成粒子特效
      this._spawnPerfectParticles(base.x, moving.y, placedWidth)
    } else {
      // 不完美：切割
      placedWidth = overlapWidth
      this.combo = 0
      this.score += 1

      // 生成切割碎片
      this._spawnCutPiece(moving, base, overlapLeft, overlapWidth)
    }

    // 创建放置后的方块
    const placedBlock = new Block({
      x: placedX,
      y: moving.y,
      width: placedWidth,
      height: this.blockHeight,
      color: moving.color
    })
    placedBlock.dinoType = moving.dinoType !== undefined ? moving.dinoType : undefined
    placedBlock.setScreenWidth(this.screenWidth)
    placedBlock.stop()
    this.blocks.push(placedBlock)
    this.baseBlock = placedBlock
    this.layerCount++

    // 创建下一个滑动方块
    this._createMovingBlock()

    return {
      result: isPerfect ? 'perfect' : 'normal',
      combo: this.combo,
      score: this.score
    }
  }

  // 生成切割碎片
  _spawnCutPiece(moving, base, overlapLeft, overlapWidth) {
    // 判断哪边被切掉
    if (moving.x < base.x) {
      // 左边被切
      const cutWidth = base.x - moving.x
      this.fallingPieces.push(new FallingPiece({
        x: moving.x, y: moving.y,
        width: cutWidth, height: moving.height,
        color: moving.color
      }))
    }
    if (moving.x + moving.width > base.x + base.width) {
      // 右边被切
      const cutX = overlapLeft + overlapWidth
      const cutWidth = (moving.x + moving.width) - (base.x + base.width)
      this.fallingPieces.push(new FallingPiece({
        x: cutX, y: moving.y,
        width: cutWidth, height: moving.height,
        color: moving.color
      }))
    }
  }

  // 生成完美放置粒子（绿叶 + 光芒）
  _spawnPerfectParticles(x, y, width) {
    const centerX = x + width / 2
    // 绿叶粒子
    const leafColors = ['#7CFC00', '#32CD32', '#228B22', '#90EE90', '#ADFF2F']
    for (let i = 0; i < 12; i++) {
      const p = new Particle({
        x: centerX + (Math.random() - 0.5) * width,
        y: y,
        color: leafColors[Math.floor(Math.random() * leafColors.length)]
      })
      p.isLeaf = true
      p.rotation = Math.random() * 360
      p.rotationSpeed = (Math.random() - 0.5) * 10
      p.vx = (Math.random() - 0.5) * 4
      p.vy = -Math.random() * 5 - 1
      this.particles.push(p)
    }
    // 光芒粒子
    for (let i = 0; i < 8; i++) {
      const p = new Particle({
        x: centerX + (Math.random() - 0.5) * width * 0.6,
        y: y,
        color: '#FFFF00'
      })
      p.size = 1.5 + Math.random() * 2
      p.vx = (Math.random() - 0.5) * 8
      p.vy = -Math.random() * 10 - 3
      this.particles.push(p)
    }
  }

  // 更新所有动态元素
  update() {
    // 更新滑动方块
    if (this.currentBlock && this.currentBlock.moving) {
      this.currentBlock.update()
    }

    // 更新掉落碎片
    for (const piece of this.fallingPieces) {
      piece.update()
    }
    this.fallingPieces = this.fallingPieces.filter(p => p.alive)

    // 更新粒子
    for (const p of this.particles) {
      p.update()
    }
    this.particles = this.particles.filter(p => p.alive)
  }

  // 获取堆叠顶部Y坐标（用于相机跟随）
  get stackTopY() {
    if (this.currentBlock) return this.currentBlock.y
    if (this.baseBlock) return this.baseBlock.y
    return this.screenHeight
  }

  // 重置
  reset() {
    this.blocks = []
    this.fallingPieces = []
    this.particles = []
    this.currentBlock = null
    this.baseBlock = null
    this.layerCount = 0
    this.combo = 0
    this.score = 0
    this.gameOver = false
    this.init()
  }
}
