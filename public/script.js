async function fetchAndAnalyzeArticle() {
    console.log("fetchAndAnalyzeArticle start");
    const url = document.getElementById('urlInput').value;
    if (!url) {
        alert('URLを入力してください！');
        return;
    }

    // iframeを初期化
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = 'none';

    const container = document.getElementById('article');
    container.innerHTML = ''; // 既存の内容をクリア
    container.appendChild(iframe);

    try {
        // サーバーから記事HTMLを取得
        const response = await fetch(`/api/fetch-article?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.content) {
            console.log("Article content fetched");

            // GPT APIで解析リクエストを送る
            const analyzeResponse = await fetch('/api/analyze-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: data.content })
            });

            const { highlights } = await analyzeResponse.json();
            console.log("Received highlights from GPT:", highlights);

            // ハイライト付きHTMLをバックエンドで生成
            const highlightResponse = await fetch('/api/analyze-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: data.originalHtml, highlights })
            });

            const { highlightedHtml } = await highlightResponse.json();
            console.log("Highlighted HTML received");

            // iframeにハイライト済みHTMLを直接書き込み
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(highlightedHtml);
            iframeDoc.close();
        } else {
            alert('記事本文を取得できませんでした。');
        }
    } catch (error) {
        console.error('Error fetching or analyzing article:', error);
        alert('エラーが発生しました。');
    }
}