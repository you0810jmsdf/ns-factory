// showroom チャット設定
// デジタル幕僚が管理。WebApp URLを変更する際はここだけ書き換える。
window.SHOWROOM_CONFIG = {
  // AIチャット応答用GAS（showroom_ai_chatプロジェクト）。chat-widget.jsのsendChat()が使う。
  chatApi: 'https://script.google.com/macros/s/AKfycbwx8-cKXxhaKkczdvVvlu7v39xeM2ztOTBEn9fnzUoESuvMmxoc2lPPMHN9iEtw3mg_/exec',
  // オーダー進捗管理用GAS（order_progress_GASプロジェクト。addConsultationアクション）。
  // chat-widget.jsのsendToArtisan()（「この内容で作家に送信」ボタン）が使う。chatApiとは別プロジェクト・別デプロイURL。
  // scriptId確定後、GASエディタでデプロイしたウェブアプリURLをここに設定すること（未設定＝空文字のままだと送信ボタン押下時にエラー表示になる）。
  orderProgressApi: ''
};
