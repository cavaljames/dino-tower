// 分享功能模块
export class Share {
  constructor() {
    this.setupShareMenu()
  }

  // 注册分享菜单
  setupShareMenu() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    wx.onShareAppMessage(() => {
      return {
        title: '冲上恐龙塔 - 叠起远古巨兽的领地，你能叠多高？',
        imageUrl: 'images/share-cover.png'
      }
    })
  }

  // 主动分享分数
  shareScore(score, combo) {
    let title = `我在恐龙塔叠了${score}层！你能更高吗？`
    if (combo >= 5) {
      title = `连续${combo}次完美叠放！恐龙之力觉醒！`
    }

    wx.shareAppMessage({
      title,
      imageUrl: 'images/share-cover.png'
    })
  }
}
