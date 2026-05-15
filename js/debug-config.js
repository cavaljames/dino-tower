// ===== DEBUG 配置文件 =====
// 设置 enabled = true 开启调试模式
// 每个选项独立控制，可以单独测试某个特效

export const DEBUG = {
  enabled: false, // 总开关，false时所有调试无效

  // ===== 恐龙之力：强制每次触发指定恐龙 =====
  // 设为 0~4 强制触发对应恐龙，设为 -1 不强制
  // 0=霸王龙(减速) 1=腕龙(加宽) 2=剑龙(护盾) 3=翼龙(修正) 4=迅猛龙(3倍分)
  forceDinoType: -1,

  // ===== 每块都是恐龙方块 =====
  alwaysDinoBlock: false,

  // ===== 彩虹方块 =====
  alwaysRainbow: false,

  // ===== 道具相关 =====
  infiniteItems: true,   // 道具无限（用不完）
  startMagnet: 1,         // 初始磁铁数量
  startWiden: 1,          // 初始加宽数量

  // ===== 方块速度 =====
  fixedSpeed: 0,          // >0 时固定方块速度（忽略层数加速）

  // ===== 强制完美 =====
  alwaysPerfect: false,   // 每次放置都完美

  // ===== combo 强制值 =====
  forceCombo: 0,          // >0 时强制combo为该值（测试道具掉落等）

  // ===== 恐龙效果持久化（不消耗） =====
  persistDinoPower: false, // true时恐龙效果触发后不消失，持续生效
}
