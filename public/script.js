async function fetchArticle() {
    const url = document.getElementById('urlInput').value;
    if (!url) {
        alert('URLを入力してください！');
        return;
    }

    try {
        // サーバーへURLを送信してHTMLを取得
        const response = await fetch(`/api/fetch-html?url=${encodeURIComponent(url)}`);
        const html = await response.text(); // HTMLをテキストとして取得

        // iframeにHTMLをそのまま表示
        const iframe = document.createElement('iframe');
        iframe.srcdoc = html; // 直接HTMLを埋め込む
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';

        // 表示領域を更新
        const container = document.getElementById('article');
        container.innerHTML = ''; // 既存の内容をクリア
        container.appendChild(iframe);
    } catch (error) {
        console.error('Error fetching HTML:', error);
        alert('エラーが発生しました。');
    }
}