## 前言

只需要维护 translate 目录中的对应目录的 index.json 的 \_note 字段和 \_translate 字段即可。

## 自动翻译 CI 步骤

1. 拉取源 website 最新代码后，构建出 public 目录
2. 运行 `node scripts/index.js`，该脚本：
   1. 读取 public 目录下所有的 index.html 文件
   2. 获取字符串，使用 jsdom 解析出其中的 article（分文件差异）的全部 p 标签内容
      1. 对应目录的 dict 是否存在
      2. 如果 p 标签的节点内容（textContent）在 dict 目录中对应目录的 index.json 文件「键」中存在，则修改该节点以带上 dict 中 \_translate 和 \_note 的信息，（具体看如何展示，比如目前的效果就是 hover 中文，显示原文）。
      3. 如果节点内容在 dict 目录中对应目录的 index.json 文件的「键」不存在，则调用 AI 翻译，之后同上，同时添加字典的键以备下次翻译使用。
3. 得到一个新的 dom，写入 html 为新的 index.html
4. 将 public 目录发布到 gh-pages 分支，以触发部署

## 其他

1. dict 重复怎么办？
   - 因为是以 p 标签的 textContent 内容为 key，所以可能会重复，暂时不处理，看看最终效果，不行的话就用 dom path 作为 key，但是可能不太直观。
2. prompt 是什么？
   - 系统预设：You are a professional, authentic machine translation engine.
   - 提示词：Translate the following source text to chinese: {{p 标签的 innerHTML}}，Output translation directly without any additional text. Remember, Keep ALL HTML TAG AND ATTRIBUTE, ONLY TRANSLATE CONTENT!
