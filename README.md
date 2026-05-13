# 恐龙塔 - 冲上云霄

一款恐龙主题的微信小游戏，玩法类似"跳一跳"堆叠塔，精准放置方块，触发恐龙助力特效！

## 游戏特色

- 5种恐龙助力：霸王龙之怒、腕龙之力、甲龙之盾、翼龙之翼、迅猛龙之速
- 连击系统：连续完美放置触发恐龙弹出特效和专属音效
- 动态难度：层数越高速度越快，方块越短速度越慢
- 侏罗纪丛林背景 + 恐龙主题音效

## 技术栈

- 微信小游戏 Canvas 2D
- ES Modules
- Web Audio / wx InnerAudioContext

## 开发

H5 测试：
```bash
# 本地启动 HTTP 服务
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/index.html
```

微信开发者工具：
```bash
# 导入项目目录到微信开发者工具即可
```

## 项目结构

```
├── game.js              # 小游戏入口
├── game.json            # 小游戏配置
├── project.config.json  # 项目配置
├── js/
│   ├── game-manager.js  # 游戏主循环
│   ├── renderer.js      # 渲染器
│   ├── stack.js         # 方块堆叠逻辑
│   ├── block.js         # 方块类
│   ├── input.js         # 输入处理
│   ├── dino-audio.js    # 恐龙音效
│   ├── dino-graphics.js # 恐龙绘制
│   ├── share.js         # 分享功能
│   ├── audio.js         # 基础音效
│   └── utils.js         # 工具函数
├── images/              # 图片资源
├── audio/               # 音频资源
└── index.html           # H5 测试页面
```

## License

MIT
