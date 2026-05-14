import { Block, FallingPiece, Particle } from './block.js'
import { BLOCK_COLORS, DINO_NAMES } from './renderer.js'
import { DEBUG } from './debug-config.js'

const BLOCK_HEIGHT = 40
const INITIAL_WIDTH_RATIO = 0.5 // 初始方块宽度占屏幕比例
const PERFECT_THRESHOLD =6 // 完美判定容差(px)

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
    this.reviveBoostCount = 0
    this.itemInventory = {
      magnet: (DEBUG.enabled ? DEBUG.startMagnet : 1),
      widen: (DEBUG.enabled ? DEBUG.startWiden : 1)
    } // 初始各一个
    this._magnetActive = false
    this.milestoneEvent = null // null | { layer: 25|50|100 }
    this.dinoPower = {
      slowNext: false,      // 霸王龙：下一块减速
      widenNext: false,     // 腕龙：下一块加宽
      shield: false,        // 剑龙：护盾
      guidNext: false,      // 翼龙：修正偏移
      scoreMulti: 1         // 迅猛龙：分数倍率
    }
    // DEBUG: 持久化模式下根据forceDinoType预设效果
    if (DEBUG.enabled && DEBUG.persistDinoPower && DEBUG.forceDinoType >= 0) {
      switch (DEBUG.forceDinoType) {
        case 0: this.dinoPower.slowNext = true; break
        case 1: this.dinoPower.widenNext = true; break
        case 2: this.dinoPower.shield = true; break
        case 3: this.dinoPower.guidNext = true; break
        case 4: this.dinoPower.scoreMulti = 3; break // 初始化用固定值
      }
    }
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
    baseBlock.isBase = true
    baseBlock.layerNumber = this.layerCount
    this.blocks.push(baseBlock)
    this.baseBlock = baseBlock

    // 创建第一个滑动方块
    this._createMovingBlock()
  }

  // 手动使用加宽道具（在方块滑动阶段调用）
  useWiden() {
    if (!this.currentBlock || !this.currentBlock.moving) return false
    if (this.itemInventory.widen <= 0) return false
    const maxWidth = this.screenWidth * INITIAL_WIDTH_RATIO
    if (this.currentBlock.width >= maxWidth) return false
    const oldWidth = this.currentBlock.width
    this.currentBlock.width = Math.min(this.currentBlock.width * 1.6, maxWidth)
    this.currentBlock.widenFlash = { oldWidth, timer: 120 } // 2秒@60fps
    if (!DEBUG.enabled || !DEBUG.infiniteItems) this.itemInventory.widen--
    return true
  }

  // 手动使用磁铁道具（在方块滑动阶段调用，放置时自动吸附）
  useMagnet() {
    if (!this.currentBlock || !this.currentBlock.moving) return false
    if (this.itemInventory.magnet <= 0) return false
    this._magnetActive = true
    this.itemInventory.magnet--
    return true
  }

  // 创建新的滑动方块
  _createMovingBlock() {
    let width = this.baseBlock.width
    // 腕龙之力：加宽30%（被动恐龙效果仍自动生效）
    let widenFlash = null
    if (this.dinoPower.widenNext) {
      const oldWidth = width
      width = Math.min(width * 1.3, this.screenWidth * INITIAL_WIDTH_RATIO)
      widenFlash = { oldWidth, timer: 120 }
      if (!DEBUG.enabled || !DEBUG.persistDinoPower) this.dinoPower.widenNext = false
    }
    this._lastItemUsedInCreate = null
    const y = this.baseBlock.y - this.blockHeight
    const colorIndex = (this.blocks.length) % BLOCK_COLORS.length
    // 层数系数：越高越快，0.0~1.0
    const layerFactor = Math.min(this.layerCount / 20, 1.0)
    // 宽度系数：越窄越慢，1.0~0.3
    const widthFactor = Math.max(width / this.screenWidth, 0.3)
    let speed = (DEBUG.enabled && DEBUG.fixedSpeed > 0) ? DEBUG.fixedSpeed : (1.5 + layerFactor * 10 * widthFactor)
    if (this.reviveBoostCount > 0) {
      const boostIndex = 6 - this.reviveBoostCount
      const reduce = 0.25 - boostIndex * 0.05
      speed *= (1 - Math.max(reduce, 0.05))
      this.reviveBoostCount--
    }
    // 霸王龙之怒：下一块减速
    if (this.dinoPower.slowNext) {
      speed *= 0.5
      if (!DEBUG.enabled || !DEBUG.persistDinoPower) this.dinoPower.slowNext = false
    }

    const block = new Block({
      x: 0,
      y,
      width,
      height: this.blockHeight,
      color: BLOCK_COLORS[colorIndex],
      moving: true,
      speed
    })
    // DEBUG: 每块都是恐龙方块
    if (DEBUG.enabled && DEBUG.alwaysDinoBlock) {
      // forceDinoType >= 0 时直接显示对应恐龙，否则显示未知恐龙
      block.dinoType = (DEBUG.forceDinoType >= 0) ? DEBUG.forceDinoType : -1
    // DEBUG: 每块都是彩虹方块
    } else if (DEBUG.enabled && DEBUG.alwaysRainbow) {
      block.isRainbow = true
      block.color = 'rainbow'
    } else {
      // 每5层显示一个未知恐龙方块
      if (this.blocks.length > 0 && this.blocks.length % 5 === 0) {
        block.dinoType = -1 // -1 表示未知恐龙
      }
      // 如果上一次触发了恐龙增益，这一块显示对应恐龙图标
      if (this._nextDinoDisplay !== undefined) {
        block.dinoType = this._nextDinoDisplay
        this._nextDinoDisplay = undefined
      }
      // 每15层生成彩虹方块
      if (this.layerCount > 0 && this.layerCount % 15 === 0) {
        block.isRainbow = true
        block.color = 'rainbow'
      }
    }
    block.setScreenWidth(this.screenWidth)
    if (widenFlash) block.widenFlash = widenFlash
    this.currentBlock = block
  }

  // 放置当前方块
  place() {
    if (!this.currentBlock || !this.currentBlock.moving) return null

    this.currentBlock.stop()
    const moving = this.currentBlock
    const base = this.baseBlock

    // 磁铁或彩虹方块：直接强制完美对齐，不再考虑X坐标
    if (this._magnetActive || moving.isRainbow) {
      moving.x = base.x
      moving.width = base.width
    }

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

    // 判定是否完美（比较中心点偏移，避免加宽方块无法触发）
    const movingCenter = moving.x + moving.width / 2
    const baseCenter = base.x + base.width / 2
    const offset = Math.abs(movingCenter - baseCenter)
    let isPerfect = offset < PERFECT_THRESHOLD
    // DEBUG: 强制完美
    if (DEBUG.enabled && DEBUG.alwaysPerfect) isPerfect = true
    let itemUsed = null
    let shieldUsed = false

    // 优先级1: 剑龙护盾（非完美时消耗，保全宽度但不加combo）
    if (!isPerfect && this.dinoPower.shield) {
      if (!DEBUG.enabled || !DEBUG.persistDinoPower) {
        this.dinoPower.shield = false
      }
      shieldUsed = true
    }
    // 磁铁已在前面直接对齐，这里记录使用信息
    if (this._magnetActive) {
      itemUsed = 'magnet'
    }
    // 无论是否用到，放置后重置磁铁状态
    this._magnetActive = false
    // 彩虹方块（已在前面直接对齐）
    if (moving.isRainbow) {
      isPerfect = true
    }

    let placedWidth
    let placedX = overlapLeft
    let itemGot = null
    let multiUsed = 0
    let baseScore = 0
    if (shieldUsed) {
      // 护盾效果：不切割，保持基座宽度，combo归零
      placedWidth = base.width
      placedX = base.x
      this.combo = 0
      baseScore = 1
    } else if (isPerfect) {
      // 完美放置：保持原宽度，吸附到基座中心位置
      placedWidth = base.width
      placedX = base.x
      this.combo++
      baseScore = this.combo * 2

      // 生成粒子特效
      this._spawnPerfectParticles(base.x, moving.y, placedWidth)

      // 道具掉落：combo 达到 3 时掉落随机道具
      if (this.combo === 3) {
        itemGot = Math.random() > 0.5 ? 'magnet' : 'widen'
        this.itemInventory[itemGot]++
      }
    } else {
      // 不完美：切割
      placedWidth = overlapWidth
      this.combo = 0
      baseScore = 1

      // 生成切割碎片
      this._spawnCutPiece(moving, base, overlapLeft, overlapWidth)
    }

    // 迅猛龙倍率：对所有放置情况生效（不只是完美）
    if (this.dinoPower.scoreMulti > 1) {
      multiUsed = this.dinoPower.scoreMulti
      this.score += baseScore * this.dinoPower.scoreMulti
      if (!DEBUG.enabled || !DEBUG.persistDinoPower) {
        this.dinoPower.scoreMulti = 1
      }
    } else {
      this.score += baseScore
    }

    // 恐龙增益触发（完美放置恐龙方块时触发效果）
    let dinoPowerTriggered = undefined
    if (isPerfect && moving.dinoType !== undefined) {
      let triggerType
      if (moving.dinoType === -1) {
        // 未知恐龙：随机决定（DEBUG可强制）
        triggerType = (DEBUG.enabled && DEBUG.forceDinoType >= 0) ? DEBUG.forceDinoType : Math.floor(Math.random() * 5)
      } else {
        // 已知恐龙：直接触发对应效果
        triggerType = moving.dinoType
      }
      dinoPowerTriggered = triggerType
      this._nextDinoDisplay = triggerType
      switch (triggerType) {
        case 0: this.dinoPower.slowNext = true; break
        case 1: this.dinoPower.widenNext = true; break
        case 2: this.dinoPower.shield = true; break
        case 3: this.dinoPower.guidNext = true; break
        case 4: this.dinoPower.scoreMulti *= 3; break // 叠加：3→9→27
      }
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
    if (this.baseBlock) this.baseBlock.isBase = false
    placedBlock.isBase = true
    placedBlock.layerNumber = this.layerCount + 1
    this.blocks.push(placedBlock)
    this.baseBlock = placedBlock
    this.layerCount++

    // 里程碑事件
    if (this.layerCount === 25 || this.layerCount === 50 || this.layerCount === 100) {
      this.milestoneEvent = { layer: this.layerCount }
    }

    // 创建下一个滑动方块
    this._createMovingBlock()

    return {
      result: isPerfect ? 'perfect' : (shieldUsed ? 'shielded' : 'normal'),
      combo: this.combo,
      score: this.score,
      dinoPowerTriggered,
      itemUsed: itemUsed || null,
      itemGot: itemGot || null,
      shieldUsed,
      scoreMultiUsed: multiUsed,
      rainbowUsed: moving.isRainbow || false
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

  revive() {
    this.gameOver = false
    this.fallingPieces = []
    this.particles = []

    const minWidth = this.screenWidth * 0.32
    const baseY = this.screenHeight - this.blockHeight - 40

    if (this.baseBlock) {
      if (this.baseBlock.width < minWidth) {
        this.baseBlock.width = minWidth
      }
      this.baseBlock.x = (this.screenWidth - this.baseBlock.width) / 2
      this.baseBlock.y = baseY
      this.baseBlock.isBase = true
      this.baseBlock.layerNumber = this.layerCount
      this.blocks = [this.baseBlock]
    }

    this.reviveBoostCount = 5
    this._createMovingBlock()
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
    this.reviveBoostCount = 0
    this.itemInventory = {
      magnet: (DEBUG.enabled ? DEBUG.startMagnet : 1),
      widen: (DEBUG.enabled ? DEBUG.startWiden : 1)
    }
    this._magnetActive = false
    this.milestoneEvent = null
    this.dinoPower = {
      slowNext: false, widenNext: false, shield: false,
      guidNext: false, scoreMulti: 1
    }
    this._lastItemUsedInCreate = null
    this._nextDinoDisplay = undefined
    this.init()
  }
}
