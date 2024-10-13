// Note: 读取 public 目录下的 docs/ref 下的 index.html，解析出其中的 article 内容，翻译其中的中文，写回 index.html

const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const glob = require('glob');
const { Semaphore } = require('async-mutex');

const { translate } = require('./utils');
// 使用信号量控制并发

const args = process.argv.slice(2);
const MAX_CONCURRENT = 2;

const semaphore = new Semaphore(MAX_CONCURRENT);
// 使用 glob 模块来匹配文件
let files;
if (args.length > 0) {
  files = glob.sync(path.resolve(__dirname, `../public/docs/ref/index.html`));
} else {
  files = glob.sync(path.resolve(__dirname, '../public/**/index.html'));
}

Promise.all(
  files.map((file) => {
    return new Promise((rootResolve) => {
      const rawString = fs.readFileSync(file, 'utf8');
      if (!rawString) {
        console.error('文件不存在');
        process.exit(1);
      }

      const dom = new JSDOM(rawString);
      const document = dom.window.document;

      const article = document.querySelector('article');
      // TODO: 不同文件需要翻译的节点不一样，通过配置传入
      if (!article) console.log(`${file} 未找到 article 标签`);
      const list = article.querySelectorAll('p');
      console.log(list);
      const dictPath = file
        .replace('.html', '.json')
        .replace('public', '_dict');
      if (!fs.existsSync(dictPath)) {
        // Note: 如果不存在，则递归创建
        fs.mkdirSync(path.dirname(dictPath), { recursive: true });
        fs.writeFileSync(dictPath, '{}');
      }
      let dict = {};
      try {
        dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      } catch (error) {
        console.error(`${dictPath} 解析失败, 跳过`);
        return;
      }
      Promise.all(
        Array.from(list).map((item) => {
          return new Promise((resolve) => {
            const text = item.innerHTML.trim();
            // Note: 移除换行符
            const pureText = item.textContent
              .trim()
              // .replace(/[\r\n]+/g, '')
              .replace(/\s+/gm, ' ');
            console.log('pureText', pureText);
            if (!pureText) return;

            if (dict[pureText]) {
              console.log('已翻译');
              if (dict[pureText]._translate) {
                item.innerHTML = dict[pureText]._translate;
                // Note: hover 显示原文，不需要 html 标签
                item.setAttribute('data-en', pureText);
              }
              // Note: 如果有注释，则插入到当前 p 后面
              if (dict[pureText]._note) {
                const note = document.createElement('p');
                note.setAttribute('type', 'comment');
                note.innerHTML = dict[pureText]._note;
                item.parentNode.insertBefore(note, item.nextSibling);
              }
              resolve();
            } else {
              console.log('未翻译');
              semaphore.acquire().then(() => {
                translate(text)
                  .then((translate) => {
                    dict[pureText] = {
                      _translate: translate,
                      _note: '',
                    };
                    console.log(`结果：${pureText} -> ${translate}`);
                    // Note: 跟之前一样替换
                    console.log('已翻译');
                    item.innerHTML = dict[pureText]._translate;
                    item.setAttribute('data-en', pureText);
                  })
                  .finally(() => {
                    // Note: 随机增加延迟
                    setTimeout(() => {
                      semaphore.release();
                      resolve();
                    }, Math.random() * 5000);
                  });
              });
            }
          });
        })
      ).then(() => {
        // 在文件处理完成后,保存更新后的字典
        console.log(`保存 ${dictPath}`);
        rootResolve();
        fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2));
        fs.writeFileSync(file, dom.serialize());
      });
    });
  })
);
