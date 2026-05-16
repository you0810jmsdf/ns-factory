// ============================================================
// pdf.js — jsPDF + autotable による日本語PDF生成
// NotoSansJP は jspdf-font パッケージ or CDN vfs_fonts で対応
// ============================================================

const PDF = {
  /**
   * 書類PDFを生成してbase64文字列を返す
   * @param {object} doc - 書類ヘッダ
   * @param {Array}  details - 明細行配列
   * @returns {string} base64 PDF文字列
   */
  generate(doc, details) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // フォント設定（NotoSansJP CDN版）
    pdf.setFont('NotoSansJP', 'normal');

    const typeLabel = CONFIG.TYPE_LABEL[doc.type] || '書類';
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;

    // ---- ヘッダ: 書類タイトル ----
    pdf.setFontSize(20);
    pdf.setFont('NotoSansJP', 'bold');
    pdf.text(typeLabel, pageW / 2, 20, { align: 'center' });

    // ---- 書類番号・発行日 ----
    pdf.setFontSize(9);
    pdf.setFont('NotoSansJP', 'normal');
    pdf.text('番号: ' + doc.number,    pageW - marginR, 30, { align: 'right' });
    pdf.text('発行日: ' + doc.issueDate, pageW - marginR, 36, { align: 'right' });

    // ---- ロゴ / 社名（右上エリア） ----
    const logoLoaded = PDF._tryDrawLogo(pdf, pageW - marginR - 50, 10, 50, 20);
    if (!logoLoaded) {
      pdf.setFontSize(13);
      pdf.setFont('NotoSansJP', 'bold');
      pdf.text("N's factory", pageW - marginR, 17, { align: 'right' });
      pdf.setFontSize(8);
      pdf.setFont('NotoSansJP', 'normal');
      pdf.text(CONFIG.COMPANY.owner, pageW - marginR, 22, { align: 'right' });
    }

    // ---- 印影エリア（右上） ----
    const inkanLoaded = PDF._tryDrawInkan(pdf, pageW - marginR - 18, 38, 18, 18);
    if (!inkanLoaded) {
      // テキスト印（四角で囲む）
      pdf.setDrawColor(180, 30, 30);
      pdf.setLineWidth(0.8);
      pdf.rect(pageW - marginR - 16, 38, 16, 14);
      pdf.setFontSize(8);
      pdf.setTextColor(180, 30, 30);
      pdf.text('印', pageW - marginR - 8, 47, { align: 'center' });
      pdf.setTextColor(0, 0, 0);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
    }

    // ---- 宛先 ----
    pdf.setFontSize(11);
    pdf.setFont('NotoSansJP', 'normal');
    const honorific = doc.customerHonorific || '様';
    pdf.text(doc.customerName + ' ' + honorific, marginL, 45);
    pdf.setLineWidth(0.3);
    pdf.line(marginL, 47, marginL + 80, 47);

    // ---- 合計金額（大きく） ----
    pdf.setFontSize(11);
    pdf.text('件名: ' + (doc.subject || ''), marginL, 55);
    pdf.setFontSize(14);
    pdf.setFont('NotoSansJP', 'bold');
    const totalLabel = doc.type === 'receipt' ? 'ご入金金額' : 'お見積金額';
    pdf.text(totalLabel + ': ¥' + Number(doc.total).toLocaleString() + ' (税込)', marginL, 65);
    pdf.setFont('NotoSansJP', 'normal');
    pdf.setFontSize(9);

    // ---- 発行者情報（右下ブロック） ----
    const issuerX = pageW - marginR - 60;
    let issuerY = 55;
    pdf.text("N's factory", issuerX, issuerY); issuerY += 5;
    pdf.text(CONFIG.COMPANY.owner,           issuerX, issuerY); issuerY += 5;
    pdf.text(CONFIG.COMPANY.address,         issuerX, issuerY); issuerY += 5;
    if (CONFIG.COMPANY.phone) { pdf.text('TEL: ' + CONFIG.COMPANY.phone, issuerX, issuerY); issuerY += 5; }
    pdf.text('Mail: ' + CONFIG.COMPANY.email, issuerX, issuerY); issuerY += 5;
    pdf.text(CONFIG.COMPANY.invoice,         issuerX, issuerY);

    // ---- 区切り線 ----
    pdf.setLineWidth(0.5);
    pdf.line(marginL, 72, pageW - marginR, 72);

    // ---- 明細テーブル ----
    const tableStartY = 77;
    const tableBody = details.map(function(d) {
      return [
        d.itemName,
        d.qty + (d.unit ? ' ' + d.unit : ''),
        '¥' + Number(d.unitPrice).toLocaleString(),
        '¥' + Number(d.lineTotal).toLocaleString(),
        d.note || ''
      ];
    });

    pdf.autoTable({
      startY: tableStartY,
      head: [['品名', '数量', '単価', '小計', '備考']],
      body: tableBody,
      styles: { font: 'NotoSansJP', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [80, 60, 40], textColor: 255, font: 'NotoSansJP' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30 }
      },
      margin: { left: marginL, right: marginR }
    });

    // ---- 小計・税・合計 ----
    const finalY = pdf.lastAutoTable.finalY + 5;
    const rightX = pageW - marginR;
    const labelX = rightX - 45;
    const amtX   = rightX - 5;

    pdf.setFontSize(10);
    pdf.text('小計:',        labelX, finalY);
    pdf.text('¥' + Number(doc.subtotal).toLocaleString(), amtX, finalY, { align: 'right' });

    pdf.text('消費税 (10%):', labelX, finalY + 6);
    pdf.text('¥' + Number(doc.tax).toLocaleString(),      amtX, finalY + 6, { align: 'right' });

    pdf.setLineWidth(0.5);
    pdf.line(labelX, finalY + 8, rightX, finalY + 8);

    pdf.setFont('NotoSansJP', 'bold');
    pdf.setFontSize(12);
    const totalLabel2 = doc.type === 'receipt' ? '領収金額:' : '合計:';
    pdf.text(totalLabel2,                                 labelX, finalY + 14);
    pdf.text('¥' + Number(doc.total).toLocaleString(),   amtX,   finalY + 14, { align: 'right' });
    pdf.setFont('NotoSansJP', 'normal');

    // ---- 領収書固有: 但し書き ----
    if (doc.type === 'receipt') {
      pdf.setFontSize(9);
      const tadashiY = finalY + 22;
      pdf.text('但し: ' + (doc.subject || '') + ' として', marginL, tadashiY);
      pdf.text('上記正に領収いたしました。', marginL, tadashiY + 6);
    }

    // ---- 備考欄 ----
    const noteY = Math.max(finalY + (doc.type === 'receipt' ? 35 : 22), 230);
    if (doc.note) {
      pdf.setFontSize(9);
      pdf.text('備考: ' + doc.note, marginL, noteY);
    }

    // ---- フッタ ----
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("N's factory — " + typeLabel, pageW / 2, pageH - 8, { align: 'center' });
    pdf.setTextColor(0, 0, 0);

    return pdf.output('datauristring').split(',')[1]; // base64のみ返す
  },

  /**
   * PDFをブラウザでプレビュー表示
   */
  preview(doc, details) {
    const base64 = this.generate(doc, details);
    const win = window.open('');
    win.document.write(
      '<iframe src="data:application/pdf;base64,' + base64 +
      '" style="width:100%;height:100%;border:none;"></iframe>'
    );
  },

  /**
   * PDFをダウンロード
   */
  download(doc, details) {
    const { jsPDF } = window.jspdf;
    const base64 = this.generate(doc, details);
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + base64;
    link.download = doc.number + '_' + (CONFIG.TYPE_LABEL[doc.type] || '書類') + '.pdf';
    link.click();
    return base64;
  },

  // ---- ロゴ画像試描画 ----
  _tryDrawLogo(pdf, x, y, w, h) {
    try {
      const img = PDF._imgCache && PDF._imgCache.logo;
      if (!img) return false;
      pdf.addImage(img, 'PNG', x, y, w, h);
      return true;
    } catch (e) { return false; }
  },

  // ---- 印影画像試描画 ----
  _tryDrawInkan(pdf, x, y, w, h) {
    try {
      const img = PDF._imgCache && PDF._imgCache.inkan;
      if (!img) return false;
      pdf.addImage(img, 'PNG', x, y, w, h);
      return true;
    } catch (e) { return false; }
  },

  // ---- 画像プリロード（ページロード時に呼ぶ） ----
  preloadImages() {
    PDF._imgCache = {};
    PDF._loadImg('logo',  CONFIG.LOGO_PATH);
    PDF._loadImg('inkan', CONFIG.INKAN_PATH);
  },

  _loadImg(key, src) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      PDF._imgCache[key] = canvas.toDataURL('image/png').split(',')[1];
    };
    img.onerror = function() { /* 画像なし: テキストフォールバック使用 */ };
    img.src = src;
  }
};
