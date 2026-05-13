import { GameManager } from './js/game-manager.js'

const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

const screenWidth = canvas.width
const screenHeight = canvas.height

const game = new GameManager({
  canvas,
  ctx,
  screenWidth,
  screenHeight
})

game.start()
