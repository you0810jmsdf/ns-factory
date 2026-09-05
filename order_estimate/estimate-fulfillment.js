(function (root) {
  'use strict';
  const bool = x => x === true || String(x).toUpperCase() === 'TRUE';
  function physicalStock(row, quantity = 1) {
    return !!row && ['in_stock', 'low_stock'].includes(row.stock_status) && Number(row.stock_qty) >= quantity;
  }
  function assess(input) {
    const qty = Math.max(1, Math.floor(Number(input.qty) || 1));
    const sameLining = input.leatherSelected && input.liningRatio > 0 && input.sameLining;
    const skiving = sameLining ? Math.max(0, Number(input.skivingFee) || 0) * qty : 0;
    const ringKnown = !!input.ringRow;
    const ringNeedsOrder = ringKnown && !physicalStock(input.ringRow, qty);
    const difficult = ringNeedsOrder && bool(input.ringRow.hard_to_source);
    const ringShipping = ringNeedsOrder && !difficult ? Math.max(0, Number(input.shippingFee) || 0) : 0;
    const materialOrder = input.materialStocks.some(x => x === 0);
    const unknown = !input.complete || !ringKnown || input.materialStocks.some(x => x == null);
    const lead = difficult ? '入手困難なリングを含むため、納期は個別にご相談'
      : ringNeedsOrder || materialOrder ? '2〜4週間程度（材料の取寄せあり）'
      : unknown ? '材料在庫確認後に確定（在庫がそろっていれば7日程度）'
      : '7日程度（材料在庫あり）';
    return { skiving, ringShipping, totalFees: skiving + ringShipping, ringNeedsOrder, difficult, lead, unknown };
  }
  const api = { physicalStock, assess };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NSFFulfillment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
