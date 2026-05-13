// 工具函数
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function getHighScore() {
  try {
    return wx.getStorageSync('highScore') || 0
  } catch (e) {
    return 0
  }
}

export function setHighScore(score) {
  try {
    wx.setStorageSync('highScore', score)
  } catch (e) {
    // 存储失败不影响游戏
  }
}
