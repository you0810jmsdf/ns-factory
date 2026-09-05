const test = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../order_estimate/estimate-fulfillment.js');
const input = { qty: 1, leatherSelected: true, liningRatio: .4, sameLining: true, skivingFee: 3000, shippingFee: 500, ringRow: { stock_status: 'in_stock', stock_qty: 10, hard_to_source: 'FALSE' }, complete: true, materialStocks: [100, 20, 1] };
test('same lining adds tax-inclusive processing per book; other/no lining never does', () => {
  assert.equal(assess(input).skiving, 3000);
  assert.equal(assess({...input, qty: 2}).skiving, 6000);
  for (const overrides of [{liningRatio:0},{sameLining:false},{leatherSelected:false}]) assert.equal(assess({...input,...overrides}).skiving,0);
  assert.equal(assess({...input,skivingFee:4500}).skiving,4500);
});
test('shipping is once per order, only if ring quantity is insufficient', () => {
  assert.equal(assess(input).ringShipping,0);
  assert.equal(assess({...input, qty:11}).ringShipping,500);
  assert.equal(assess({...input, ringRow:{stock_status:'backorder',stock_qty:100}}).ringShipping,500);
});
test('material availability and difficult sourcing determine lead time', () => {
  assert.match(assess(input).lead,/7日/);
  assert.match(assess({...input,materialStocks:[100,0]}).lead,/2〜4週間/);
  assert.match(assess({...input,materialStocks:[null]}).lead,/確認後/);
  const hard={stock_status:'out_of_stock',stock_qty:0,hard_to_source:'TRUE'};
  assert.match(assess({...input,ringRow:hard}).lead,/個別/);
  assert.equal(assess({...input,ringRow:hard}).ringShipping,0);
  assert.match(assess({...input,ringRow:{...hard,stock_status:'in_stock',stock_qty:1}}).lead,/7日/);
});
