const { spawn } = require('child_process');

exports.translate = async (text) => {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      messages: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: 'You are a professional, authentic machine translation engine.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Translate the following source text to chinese: ${text}，Output translation directly without any additional text. Remember, Keep ALL HTML TAG AND ATTRIBUTE, ONLY TRANSLATE CONTENT!`,
            },
          ],
        },
      ],
      temperature: 0,
      top_p: 0.95,
      max_tokens: 4096,
    });
    const apiKey = process.env.OPENAI_API_KEY;
    const url = process.env.OPENAI_URL;
    const res = spawn('curl', [
      url,
      '-H',
      'Content-Type: application/json',
      '-H',
      `api-key: ${apiKey}`,
      '-d',
      payload,
    ]);
    let result = '';
    res.stdout.on('data', (data) => {
      result += data.toString();
    });
    res.stdout.on('close', () => {
      const json = JSON.parse(result);
      const translate = json.choices?.[0]?.message?.content;
      if (!translate) {
        console.error(`ai 翻译失败: ${text}`);
        return;
      }
      resolve(translate);
    });
  });
};
