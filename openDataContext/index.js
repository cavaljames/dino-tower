// 开放数据域入口 — 获取好友排名数据并渲染
const sharedCanvas = wx.getSharedCanvas()
const ctx = sharedCanvas.getContext('2d')

let leaderboardData = []
let isVisible = false

// 监听主域消息
wx.onMessage((data) => {
  if (data.action === 'showLeaderboard') {
    isVisible = true
    fetchFriendData()
  } else if (data.action === 'closeLeaderboard') {
    isVisible = false
    clearCanvas()
  }
})

function fetchFriendData() {
  wx.getFriendCloudStorage({
    keyList: ['score'],
    success: (res) => {
      leaderboardData = res.data
        .map(item => {
          const kv = item.KVDataList.find(k => k.key === 'score')
          return {
            nickname: item.nickname || '未知',
            avatarUrl: item.avatarUrl || '',
            score: kv ? parseInt(kv.value) : 0
          }
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
      renderLeaderboard()
    },
    fail: () => {
      leaderboardData = []
      renderLeaderboard()
    }
  })
}

function clearCanvas() {
  ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height)
}

function renderLeaderboard() {
  if (!isVisible) return
  const w = sharedCanvas.width
  const h = sharedCanvas.height

  clearCanvas()

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.fillRect(0, 0, w, h)

  // 标题
  ctx.fillStyle = '#7CFC00'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('恐龙塔排行榜', w / 2, 60)

  // 关闭提示
  ctx.fillStyle = '#8B7D6B'
  ctx.font = '16px Arial'
  ctx.fillText('点击任意位置关闭', w / 2, h - 30)

  if (leaderboardData.length === 0) {
    ctx.fillStyle = '#8B7D6B'
    ctx.font = '20px Arial'
    ctx.fillText('暂无记录，快来创造第一个！', w / 2, h / 2)
    return
  }

  // 排行列表
  const startY = 100
  const rowHeight = 50

  leaderboardData.forEach((item, index) => {
    const y = startY + index * rowHeight

    // 排名
    let rankColor = '#E8D5A3'
    if (index === 0) rankColor = '#FFD700'
    else if (index === 1) rankColor = '#C0C0C0'
    else if (index === 2) rankColor = '#CD7F32'

    ctx.fillStyle = rankColor
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`${index + 1}`, 20, y)

    // 昵称
    ctx.fillStyle = '#E8D5A3'
    ctx.font = '18px Arial'
    ctx.textAlign = 'left'
    const name = item.nickname.length > 8 ? item.nickname.slice(0, 8) + '…' : item.nickname
    ctx.fillText(name, 60, y)

    // 分数
    ctx.fillStyle = '#7CFC00'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(`${item.score} 层`, w - 20, y)
  })

  // 点击关闭
  wx.onTouchEnd(() => {
    isVisible = false
    clearCanvas()
  })
}
