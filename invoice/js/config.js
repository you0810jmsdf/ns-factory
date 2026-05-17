// ============================================================
// config.js — GAS WebApp URL 定数（差し替え可能）
// GAS デプロイ後にこのファイルの GAS_WEBAPP_URL を更新する
// ============================================================

const CONFIG = {
  // GAS WebApp URL: clasp deploy 後に取得したURLを設定
  GAS_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzERvxy0zmLdytf0roNlzVzj6JHg2keLvMQ3tl38fxQk97S-O83VjG-bQPOLMI_HYZe/exec',

  // 消費税率
  TAX_RATE: 0.10,

  // 書類種別ラベル
  TYPE_LABEL: {
    quote:   '見積書',
    invoice: '請求書',
    receipt: '領収書'
  },

  // 書類状態ラベル
  STATUS_OPTIONS: ['依頼受付', '下書き', '発行済', '入金済'],

  // 自社情報（PDF発行者欄 / テキストプレースホルダー）
  COMPANY: {
    name:    "N's factory",
    owner:   '中司 祐樹',
    zip:     '〒270-1300',
    address: '千葉県印西市',
    phone:   '',
    email:   'you0810jmsdf@gmail.com',
    invoice: 'インボイス未登録'
  }
};

// assets画像存在確認フラグ（初回ロード時に確認）
CONFIG.LOGO_PATH  = '../assets/logo.png';  // 存在しない場合はテキストに自動フォールバック
CONFIG.INKAN_PATH = '../assets/inkan.png'; // 存在しない場合はテキストに自動フォールバック
