// 排行榜数据层 — 分数提交、用户授权与本地历史记录

const LOCAL_HISTORY_KEY = 'leaderboardHistory'
const USER_INFO_KEY = 'userInfo'
const MAX_HISTORY = 50

let _userInfo = null

/**
 * 获取缓存的用户信息
 */
export function getUserInfo() {
  if (_userInfo) return _userInfo
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      _userInfo = wx.getStorageSync(USER_INFO_KEY) || null
    } else if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(USER_INFO_KEY)
      _userInfo = data ? JSON.parse(data) : null
    }
  } catch (e) {}
  return _userInfo
}

/**
 * 请求用户授权获取昵称头像
 * 返回 Promise<{nickname, avatarUrl}>
 */
export function requestUserProfile() {
  return new Promise((resolve) => {
    // 已有缓存直接返回
    const cached = getUserInfo()
    if (cached && cached.nickname) {
      resolve(cached)
      return
    }

    if (typeof wx === 'undefined' || !wx.getUserProfile) {
      // H5环境或无API，返回默认
      const defaultInfo = { nickname: '恐龙猎人', avatarUrl: '' }
      resolve(defaultInfo)
      return
    }

    wx.getUserProfile({
      desc: '用于排行榜展示昵称',
      success: (res) => {
        const info = {
          nickname: res.userInfo.nickName || '恐龙猎人',
          avatarUrl: res.userInfo.avatarUrl || ''
        }
        _userInfo = info
        _saveUserInfo(info)
        resolve(info)
      },
      fail: () => {
        // 用户拒绝授权，使用默认昵称
        const defaultInfo = { nickname: '恐龙猎人', avatarUrl: '' }
        resolve(defaultInfo)
      }
    })
  })
}

/**
 * 保存用户信息到本地
 */
function _saveUserInfo(info) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(USER_INFO_KEY, info)
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
    }
  } catch (e) {}
}

/**
 * 提交分数到微信云存储
 */
export function submitScore(score) {
  // 本地历史带上昵称保存
  const info = getUserInfo()
  saveLocalHistory(score, info ? info.nickname : null)

  if (typeof wx === 'undefined' || !wx.setUserCloudStorage) return

  wx.setUserCloudStorage({
    KVDataList: [{
      key: 'score',
      value: String(score)
    }],
    success: () => console.log('排行榜：分数提交成功'),
    fail: (err) => console.warn('排行榜：分数提交失败', err)
  })
}

/**
 * 保存分数到本地历史
 */
export function saveLocalHistory(score, nickname) {
  const list = getLocalHistory()
  list.push({
    score,
    nickname: nickname || '恐龙猎人',
    timestamp: Date.now()
  })
  // 按分数降序
  list.sort((a, b) => b.score - a.score)
  if (list.length > MAX_HISTORY) list.length = MAX_HISTORY

  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(LOCAL_HISTORY_KEY, list)
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list))
    }
  } catch (e) {
    console.warn('排行榜：本地保存失败', e)
  }
}

/**
 * 读取本地历史分数
 */
export function getLocalHistory() {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      return wx.getStorageSync(LOCAL_HISTORY_KEY) || []
    } else if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(LOCAL_HISTORY_KEY)
      return data ? JSON.parse(data) : []
    }
  } catch (e) {}
  return []
}

/**
 * 请求好友排行榜数据（主域调用）
 */
export function requestFriendLeaderboard() {
  if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
    wx.getOpenDataContext().postMessage({
      action: 'showLeaderboard'
    })
  }
}

/**
 * 关闭开放数据域排行榜
 */
export function closeFriendLeaderboard() {
  if (typeof wx !== 'undefined' && wx.getOpenDataContext) {
    wx.getOpenDataContext().postMessage({
      action: 'closeLeaderboard'
    })
  }
}
