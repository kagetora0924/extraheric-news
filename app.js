const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

// ミドルウェア設定
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));

// app.js の先頭付近に追記
const prompts = [
  // 0: 最初に用意していた、無難なプロンプト
  `
    以下の文章には、他のスタンスも存在するかもしれない部分や、プロパガンダの恐れがある表現が含まれているかもしれません。
    その箇所を特定し、他にどんな見方がありそうかを、意見ごとに改行で分けて記してください。
    やや強引でも、反対意見やより慎重な見方など、各引用箇所に対して必ず複数の意見を提案してください。
    また、タイトルや他の記事のタイトルではなく、本文と思われる部分だけを探索対象としてください。
    textは、元の文章を正確に引用し、改行や余計な記号、句点を絶対に付加しないでください。
  
    ### 文章:
    \${content}
  
    ### 回答フォーマット(Should STRICTLY be JSON-style string. do not add any extra strings):
    [{"text": "該当部分のテキスト", "reason": "さまざまな見方"}]
    `,

  // 1: 「強調された表現を深掘りする」プロンプト
  `
    以下の文章では、特に断定的・感情的・強調的と感じられる表現を見つけてください。
    その部分がどうして問題になり得るか、あるいは他の視点がどう入り込むのかを検討し、
    複数の見解が浮かびそうな場合は改行で分けて提案してください。
    記事のタイトルは対象外とし、本文と思われる箇所のみを探索対象とします。
  
    textは、元の文章を必ず正確に引用し、改行・余計な記号・句点の付加は行わないでください。
  
    ### 文章:
    \${content}
  
    ### 回答フォーマット(Should STRICTLY be JSON-style string. do not add any extra strings):
    [{"text": "該当部分のテキスト", "reason": "さまざまな見方"}]
    `,

  // 2: 「ステレオタイプやバイアスを洗い出す」プロンプト
  `
    以下の文章には、固定観念やバイアスが感じられる表現が含まれているかもしれません。
    その部分を見つけて取り上げ、他の考え方や、より注意深い見方がどのようにあり得るかを、
    見解ごとに改行で分けて提示してください。
    タイトルや他の記事のタイトルは除外し、本文のみを対象とします。
  
    textは、元の文章を正確に引用してください。改行や余計な記号、句点を勝手に追加してはいけません。
  
    ### 文章:
    \${content}
  
    ### 回答フォーマット(Should STRICTLY be JSON-style string. do not add any extra strings):
    [{"text": "該当部分のテキスト", "reason": "さまざまな見方"}]
    `,

  // 3: 「情報源やエビデンスの裏付けを確認する」プロンプト
  `
    以下の文章に登場するデータや専門家の意見が、本当に妥当であるかどうかを検討してください。
    特に「どのような情報源を使っているのか」「まだ不確定な可能性はないか」などを考え、
    複数の異なる立場や追加の検証が考えられる場合は改行で分けて示してください。
    タイトルや他の記事のタイトルは除外し、本文のみを対象にします。
  
    textは、元の文章を正確に引用し、余計な句読点や改行を勝手に追加しないでください。
  
    ### 文章:
    \${content}
  
    ### 回答フォーマット(Should STRICTLY be JSON-style string. do not add any extra strings):
    [{"text": "該当部分のテキスト", "reason": "さまざまな見方"}]
    `,
];

// URLからニュース記事本文を取得するエンドポイント
app.get("/api/fetch-article", async (req, res) => {
  const articleUrl = req.query.url;
  if (!articleUrl) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const { data: html } = await axios.get(articleUrl, { timeout: 5000 });
    const $ = cheerio.load(html);

    // HTMLから本文を抽出
    const content = $("article").text() || $("main").text() || $("body").text();

    // オリジナルHTMLも送信
    res.json({ content, originalHtml: html });
  } catch (err) {
    console.error("Error fetching article:", err.message);
    res.status(500).json({ error: "Failed to fetch the article." });
  }
});

// GPT APIを使って該当箇所を解析するエンドポイント
app.post("/api/analyze-text", async (req, res) => {
  const { content, mode } = req.body;

  if (!content) {
    return res.status(400).json({ error: "No content provided" });
  }
  // フロントから受け取った mode（0,1,2,3など）に対応するプロンプトを選ぶ
  const selectedPromptTemplate = prompts[mode] || prompts[0]; // 万一modeが不正なら0を使う

  // テンプレート中の "${content}" 部分を、実際の記事本文に置き換える
  const finalPrompt = selectedPromptTemplate.replace("${content}", content);

  try {
    console.log("Sending request to GPT API");

    const gptResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: finalPrompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Received response from GPT API");
    console.log(gptResponse.data.choices[0].message.content);

    // バックティックと 'json' プレフィックスを削除
    let cleanedContent = gptResponse.data.choices[0].message.content
      .replace(/```json\s*/, "") // 開始のコードブロックと 'json' を削除
      .replace(/```$/, "") // 終了のコードブロックを削除
      .trim(); // 前後の空白を削除

    // JSONの開始位置を確認し、それ以前を削除
    const jsonStart = cleanedContent.indexOf("[");
    if (jsonStart !== -1) {
      cleanedContent = cleanedContent.substring(jsonStart);
    }

    console.log("Cleaned content:", cleanedContent);

    // JSON パース
    const highlights = JSON.parse(cleanedContent);
    console.log("Parsed highlights:", highlights);
    res.json({ highlights });
  } catch (err) {
    console.error("Error calling GPT API:", err.message);
    res.status(500).json({ error: "Failed to analyze text." });
  }
});

app.post("/api/analyze-html", async (req, res) => {
  console.log("/api/analyze-html called");
  const { html, highlights } = req.body;

  if (!html || !highlights) {
    console.error("Missing HTML or highlights data");
    return res
      .status(400)
      .json({ error: "HTML or highlights data is missing." });
  }

  try {
    const $ = cheerio.load(html);

    // タグを無視してテキストを連結
    const flattenedText = $("body").text().replace(/\s+/g, " ").trim();
    console.log(
      `Flattened text (first 500 chars): ${flattenedText.substring(0, 500)}`
    );

    let highlightCount = 0;

    highlights.forEach(({ text, reason }, index) => {
      console.log(`Processing highlight #${index + 1}`);
      console.log(`Text to highlight: "${text}", Reason: "${reason}"`);

      // テキストを正規化
      const normalizedText = text.replace(/\s+/g, " ").trim();

      // フラット化したテキスト内で一致を確認
      if (flattenedText.includes(normalizedText)) {
        console.log(`Match found for: "${normalizedText}"`);

        // 元のHTMLに戻して該当箇所をハイライト
        $("body")
          .children()
          .each(function () {
            const child = $(this);
            const childText = child.text().replace(/\s+/g, " ").trim();

            if (childText.includes(normalizedText)) {
              const updatedHtml = child
                .html()
                .replace(
                  new RegExp(
                    normalizedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "g"
                  ),
                  `<mark title="${reason}" style="background-color: yellow;">${normalizedText}</mark>`
                );
              child.html(updatedHtml);
              highlightCount++;
            }
          });
      } else {
        console.warn(`No match found for: "${normalizedText}"`);
      }
    });

    console.log(`Total highlights applied: ${highlightCount}`);
    const highlightedHtml = $.html();
    res.json({ highlightedHtml });
  } catch (err) {
    console.error("Error highlighting HTML:", err.message);
    res.status(500).json({ error: "Failed to highlight HTML." });
  }
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
