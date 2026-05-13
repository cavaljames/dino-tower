import { GameManager } from './js/game-manager.js'

const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

const screenWidth = canvas.width
// 上下留空：顶部80px，底部100px，给小程序导航按钮
const screenHeight = canvas.height - 180

const game = new GameManager({
  canvas,
  ctx,
  screenWidth,
  screenHeight,
  offsetY: 80
})

game.start()
