const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// ミドルウェア設定
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// URLからニュース記事本文を取得するエンドポイント
app.get('/api/fetch-article', async (req, res) => {
    const articleUrl = req.query.url;
    if (!articleUrl) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        const { data: html } = await axios.get(articleUrl, { timeout: 5000 });
        const $ = cheerio.load(html);

        // シンプルにbody内のテキストを取得
        const content = $('article').text() || $('body').text();
        res.json({ content });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch the article.' });
    }
});

// URLからHTMLをそのまま取得して返すエンドポイント
app.get('/api/fetch-html', async (req, res) => {
    const articleUrl = req.query.url;
    if (!articleUrl) {
        return res.status(400).json({ error: 'No URL provided' });
    }

    try {
        // AxiosでHTMLを取得
        const { data: html } = await axios.get(articleUrl, { timeout: 5000 });
        // HTMLをプレーンテキストとしてそのまま返す
        res.send(html);
    } catch (err) {
        console.error('Error fetching HTML:', err.message);
        res.status(500).json({ error: 'Failed to fetch the HTML.' });
    }
});
// サーバー起動
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});