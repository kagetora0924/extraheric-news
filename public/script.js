async function fetchArticle() {
    const url = document.getElementById('urlInput').value;
    if (!url) {
        alert('URLを入力してください！');
        return;
    }

    try {
        // iframeを作成し、srcにURLを設定する
        const iframe = document.createElement('iframe');
        iframe.src = url; // 直接URLを指定
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';

        // 表示領域を更新
        const container = document.getElementById('article');
        container.innerHTML = ''; // 既存の内容をクリア
        container.appendChild(iframe);
    } catch (error) {
        console.error('Error displaying page:', error);
        alert('エラーが発生しました。');
    }
}