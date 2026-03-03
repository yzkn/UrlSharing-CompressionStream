// Copyright (c) 2026 YA All rights reserved.


const editor = document.getElementById('editor');
const QUERY_KEY = 't'; // クエリパラメータのキー (?t=...)

/**
 * 圧縮 & URLセーフBase64エンコード
 */
async function compressToEncodedURIComponent(input) {
    if (!input) return "";
    const stream = new Blob([input]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("deflate"));
    const compressedResponse = new Response(compressedStream);
    const compressedArrayBuffer = await compressedResponse.arrayBuffer();

    // Uint8ArrayをBase64に変換
    const base64 = btoa(String.fromCharCode(...new Uint8Array(compressedArrayBuffer)));
    // URLセーフな形式に置換
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 復元: URLセーフBase64デコード & 展開
 */
async function decompressFromEncodedURIComponent(encoded) {
    if (!encoded) return "";
    try {
        // URLセーフ形式を通常のBase64に戻す
        let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const stream = new Blob([bytes]).stream();
        const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate"));
        const decompressedResponse = new Response(decompressedStream);
        return await decompressedResponse.text();
    } catch (e) {
        console.error("復号に失敗しました:", e);
        return "";
    }
}

/**
 * URLのクエリパラメータを更新 (history.replaceState)
 */
let timer;
async function updateURL() {
    const text = editor.value;
    const compressed = await compressToEncodedURIComponent(text);
    const newURL = new URL(window.location.href);

    if (compressed) {
        newURL.searchParams.set(QUERY_KEY, compressed);
    } else {
        newURL.searchParams.delete(QUERY_KEY);
    }

    // ブラウザの履歴を増やさずにURLを書き換え
    window.history.replaceState(null, "", newURL.toString());
}

// 入力時にデバウンス処理（負荷軽減とAPI制限回避）
editor.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(updateURL, 300); // 300ms間隔で更新
});

// 初期化: URLからテキストを読み込む
window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const encodedText = params.get(QUERY_KEY);

    if (encodedText) {
        const decodedText = await decompressFromEncodedURIComponent(encodedText);
        editor.value = decodedText;
    }
    editor.focus();
});
