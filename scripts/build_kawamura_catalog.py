# -*- coding: utf-8 -*-
"""カワムラレザー全ラインナップ カタログ増補ビルドスクリプト
==============================================================
2026-07-03 カワムラレザー公式通販（kawamuraleather.com）全405商品クロール調査に基づく。
既存69エントリ（leather-catalog.json / leather-stock.csv）は一切変更せず、新規色のみ末尾追加する。

実行: py -X utf8 scripts/build_kawamura_catalog.py
  --skip-images で画像ダウンロードを省略（データ更新のみ）

再実行可能: 追加済み kw* エントリは一旦除去してから再追加（既存69件は id が kw で始まらないため安全）。
画像はダウンロード済み（assets/leathers/kw{pid}.jpg が存在）ならスキップ。
"""
import json, csv, io, os, sys, time, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG = os.path.join(ROOT, 'order_estimate', 'leather-catalog.json')
STOCK = os.path.join(ROOT, 'order_estimate', 'leather-stock.csv')
IMGDIR = os.path.join(ROOT, 'assets', 'leathers')

# ------------------------------------------------------------------
# 調査データ（series_key, pid, 色表示名, 公式画像URL）
# 除外済み: バングラヌメ(176113918・完売) / HORWEENグリーン別ロット(187535780) /
#           HORSE BUTTハーフサイズ(170001175) / 取得失敗4件(189791145,190340761,192147089,192365526)
# ------------------------------------------------------------------
DATA = [
("BULGARO", "142174893", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/142174893.jpg"),
    ("BULGARO", "142174985", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/142174985.jpg"),
    ("BULGARO", "144863774", "キャメル", "https://img07.shop-pro.jp/PA01426/148/product/144863774.jpg"),
    ("BULGARO", "155783293", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/155783293.jpg"),
    ("BULGARO", "153122754", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/153122754.jpg"),
    ("BULGARO", "142053258", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/142053258.jpg"),
    ("BULGARO", "161703674", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/161703674.jpg"),
    ("BULGARO", "142044123", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/142044123.jpg"),
    ("BULGARO", "142102656", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/142102656.jpg"),
    ("BULGARO", "139897477", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/139897477.jpg"),
    ("BULGARO", "142086646", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/142086646.jpg"),
    ("BULGARO", "173296707", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/173296707.jpg"),
    ("BULGARO", "144864221", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/144864221.jpg"),
    ("BULGARO", "153128716", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/153128716.jpg"),
    ("NEBRASKA", "142098205", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/142098205.jpg"),
    ("NEBRASKA", "142101001", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/142101001.jpg"),
    ("NEBRASKA", "145547570", "キャメル", "https://img07.shop-pro.jp/PA01426/148/product/145547570.jpg"),
    ("NEBRASKA", "159900455", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/159900455.jpg"),
    ("NEBRASKA", "153747469", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/153747469.jpg"),
    ("NEBRASKA", "142098655", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/142098655.jpg"),
    ("NEBRASKA", "161703649", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/161703649.jpg"),
    ("NEBRASKA", "140633732", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/140633732.jpg"),
    ("NEBRASKA", "142099497", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/142099497.jpg"),
    ("NEBRASKA", "142064093", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/142064093.jpg"),
    ("NEBRASKA", "142100093", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/142100093.jpg"),
    ("NEBRASKA", "173297104", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/173297104.jpg"),
    ("NEBRASKA", "145547651", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/145547651.jpg"),
    ("NEBRASKA", "155783348", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/155783348.jpg"),
    ("TENDER", "142277908", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/142277908.jpg"),
    ("TENDER", "142278005", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/142278005.jpg"),
    ("TENDER", "162805150", "キャメル", "https://img07.shop-pro.jp/PA01426/148/product/162805150.jpg"),
    ("TENDER", "164301924", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/164301924.jpg"),
    ("TENDER", "139898846", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/139898846.jpg"),
    ("TENDER", "142277492", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/142277492.jpg"),
    ("TENDER", "142278106", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/142278106.jpg"),
    ("TENDER", "142277231", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/142277231.jpg"),
    ("TENDER", "142278160", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/142278160.jpg"),
    ("TENDER", "172107644", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/172107644.jpg"),
    ("REVERSO", "159732492", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/159732492.jpg"),
    ("REVERSO", "159732507", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/159732507.jpg"),
    ("REVERSO", "159732534", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/159732534.jpg"),
    ("REVERSO", "159732636", "トープ", "https://img07.shop-pro.jp/PA01426/148/product/159732636.jpg"),
    ("REVERSO", "159732602", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/159732602.jpg"),
    ("REVERSO", "159732522", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/159732522.jpg"),
    ("REVERSO", "159732478", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/159732478.jpg"),
    ("REVERSO", "159732548", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/159732548.jpg"),
    ("REVERSO", "159732568", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/159732568.jpg"),
    ("TWIST", "161703696", "アイボリー", "https://img07.shop-pro.jp/PA01426/148/product/161703696.jpg"),
    ("TWIST", "145958545", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/145958545.jpg"),
    ("TWIST", "145959044", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/145959044.jpg"),
    ("TWIST", "145958466", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/145958466.jpg"),
    ("TWIST", "145958402", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/145958402.jpg"),
    ("TWIST", "145958035", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/145958035.jpg"),
    ("TWIST", "145959279", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/145959279.jpg"),
    ("TWIST", "145958291", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/145958291.jpg"),
    ("TWIST", "155042339", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/155042339.png"),
    ("TWIST", "145958630", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/145958630.jpg"),
    ("ALASKA", "170150003", "アイスブルー", "https://img07.shop-pro.jp/PA01426/148/product/170150003.jpg"),
    ("ALASKA", "141898992", "アイボリー", "https://img07.shop-pro.jp/PA01426/148/product/141898992.jpg"),
    ("ALASKA", "155535744", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/155535744.jpg"),
    ("ALASKA", "152578876", "オレンジ", "https://img07.shop-pro.jp/PA01426/148/product/152578876.jpg"),
    ("ALASKA", "155535799", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/155535799.jpg"),
    ("ALASKA", "148270635", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/148270635.png"),
    ("ALASKA", "155536414", "ターコイズ", "https://img07.shop-pro.jp/PA01426/148/product/155536414.jpg"),
    ("ALASKA", "141891418", "チョコ", "https://img07.shop-pro.jp/PA01426/148/product/141891418.jpg"),
    ("ALASKA", "140336842", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/140336842.jpg"),
    ("ALASKA", "170150207", "ビリジアン", "https://img07.shop-pro.jp/PA01426/148/product/170150207.jpg"),
    ("ALASKA", "155536107", "ピンク", "https://img07.shop-pro.jp/PA01426/148/product/155536107.jpg"),
    ("ALASKA", "155535485", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/155535485.jpg"),
    ("ALASKA", "141893632", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/141893632.jpg"),
    ("ALASKA", "148270455", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/148270455.jpg"),
    ("ALASKA", "152578868", "ラズベリー", "https://img07.shop-pro.jp/PA01426/148/product/152578868.jpg"),
    ("ALASKA", "155536219", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/155536219.jpg"),
    ("AMAZZONIA", "169160973", "イエロー", "https://img07.shop-pro.jp/PA01426/148/product/169160973.jpg"),
    ("AMAZZONIA", "156744633", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/156744633.jpg"),
    ("AMAZZONIA", "156744560", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/156744560.jpg"),
    ("AMAZZONIA", "156744695", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/156744695.jpg"),
    ("AMAZZONIA", "169161060", "ターコイズ", "https://img07.shop-pro.jp/PA01426/148/product/169161060.jpg"),
    ("AMAZZONIA", "155784895", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/155784895.jpg"),
    ("AMAZZONIA", "140634418", "チョコ", "https://img07.shop-pro.jp/PA01426/148/product/140634418.jpg"),
    ("AMAZZONIA", "156744751", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/156744751.jpg"),
    ("AMAZZONIA", "141886381", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/141886381.jpg"),
    ("AMAZZONIA", "141882810", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/141882810.jpg"),
    ("AMAZZONIA", "143375840", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/143375840.jpg"),
    ("AMAZZONIA", "141887558", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/141887558.jpg"),
    ("AMAZZONIA", "156742684", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/156742684.jpg"),
    ("CRUST", "142151566", "エバノ", "https://img07.shop-pro.jp/PA01426/148/product/142151566.jpg"),
    ("CRUST", "142151977", "コバルト", "https://img07.shop-pro.jp/PA01426/148/product/142151977.jpg"),
    ("CRUST", "142151264", "ジアロ", "https://img07.shop-pro.jp/PA01426/148/product/142151264.jpg"),
    ("CRUST", "176481776", "ナチュラーレ", "https://img07.shop-pro.jp/PA01426/148/product/176481776.jpg"),
    ("CRUST", "142152473", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/142152473.jpg"),
    ("CRUST", "171321838", "マローネ", "https://img07.shop-pro.jp/PA01426/148/product/171321838.jpg"),
    ("CRUST", "171321870", "ミリターレ", "https://img07.shop-pro.jp/PA01426/148/product/171321870.jpg"),
    ("CRUST", "142151671", "ロッソ", "https://img07.shop-pro.jp/PA01426/148/product/142151671.jpg"),
    ("COUNTRY", "163439114", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/163439114.jpg"),
    ("COUNTRY", "163434696", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/163434696.jpg"),
    ("COUNTRY", "163434660", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/163434660.jpg"),
    ("COUNTRY", "163434683", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/163434683.jpg"),
    ("COUNTRY", "163439240", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/163439240.jpg"),
    ("COUNTRY", "163439020", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/163439020.jpg"),
    ("COUNTRY", "163439070", "ベージュ", "https://img07.shop-pro.jp/PA01426/148/product/163439070.jpg"),
    ("COUNTRY", "163434620", "ホワイト", "https://img07.shop-pro.jp/PA01426/148/product/163434620.jpg"),
    ("COUNTRY", "163438954", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/163438954.jpg"),
    ("COUNTRY", "163438818", "ヴァイオレット", "https://img07.shop-pro.jp/PA01426/148/product/163438818.jpg"),
    ("MARIANO", "189376362", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/189376362.jpg"),
    ("MARIANO", "189376376", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/189376376.jpg"),
    ("MARIANO", "189376357", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/189376357.jpg"),
    ("MARIANO", "189376345", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/189376345.jpg"),
    ("MARIANO", "189376367", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/189376367.jpg"),
    ("MARIANO", "189376351", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/189376351.jpg"),
    ("MARIANO", "189376385", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/189376385.jpg"),
    ("LV_LISCIO", "177973946", "オルティーカ", "https://img07.shop-pro.jp/PA01426/148/product/177973946.jpg"),
    ("LV_LISCIO", "177973886", "カスターニャ", "https://img07.shop-pro.jp/PA01426/148/product/177973886.jpg"),
    ("LV_LISCIO", "177973956", "コバルト", "https://img07.shop-pro.jp/PA01426/148/product/177973956.jpg"),
    ("LV_LISCIO", "177973864", "セサンタ（60）", "https://img07.shop-pro.jp/PA01426/148/product/177973864.jpg"),
    ("LV_LISCIO", "177973871", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/177973871.jpg"),
    ("LV_LISCIO", "177973968", "トッポ", "https://img07.shop-pro.jp/PA01426/148/product/177973968.jpg"),
    ("LV_LISCIO", "180707713", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/180707713.jpg"),
    ("LV_LISCIO", "180707712", "ナチュラーレ", "https://img07.shop-pro.jp/PA01426/148/product/180707712.jpg"),
    ("LV_LISCIO", "177973960", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/177973960.jpg"),
    ("LV_LISCIO", "177973979", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/177973979.jpg"),
    ("LV_LISCIO", "177973910", "フクシア", "https://img07.shop-pro.jp/PA01426/148/product/177973910.jpg"),
    ("LV_LISCIO", "177973918", "フラゴラ", "https://img07.shop-pro.jp/PA01426/148/product/177973918.jpg"),
    ("LV_LISCIO", "177973924", "ヴェルデ", "https://img07.shop-pro.jp/PA01426/148/product/177973924.jpg"),
    ("LV_BOX", "174657061", "オルティーカ", "https://img07.shop-pro.jp/PA01426/148/product/174657061.jpg"),
    ("LV_BOX", "174657044", "カスターニャ", "https://img07.shop-pro.jp/PA01426/148/product/174657044.jpg"),
    ("LV_BOX", "174657065", "コバルト", "https://img07.shop-pro.jp/PA01426/148/product/174657065.jpg"),
    ("LV_BOX", "174657027", "セサンタ", "https://img07.shop-pro.jp/PA01426/148/product/174657027.jpg"),
    ("LV_BOX", "174657035", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/174657035.jpg"),
    ("LV_BOX", "174657080", "トッポ", "https://img07.shop-pro.jp/PA01426/148/product/174657080.jpg"),
    ("LV_BOX", "180707715", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/180707715.jpg"),
    ("LV_BOX", "180707714", "ナチュラーレ", "https://img07.shop-pro.jp/PA01426/148/product/180707714.jpg"),
    ("LV_BOX", "174657071", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/174657071.jpg"),
    ("LV_BOX", "174657087", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/174657087.jpg"),
    ("LV_BOX", "174657048", "フクシア", "https://img07.shop-pro.jp/PA01426/148/product/174657048.jpg"),
    ("LV_BOX", "174657051", "フラゴラ", "https://img07.shop-pro.jp/PA01426/148/product/174657051.jpg"),
    ("LV_BOX", "174657054", "ヴェルデ", "https://img07.shop-pro.jp/PA01426/148/product/174657054.jpg"),
    ("MARGOT_FOG", "174217722", "アローロ", "https://img07.shop-pro.jp/PA01426/148/product/174217722.jpg"),
    ("MARGOT_FOG", "174217690", "カスターニャ", "https://img07.shop-pro.jp/PA01426/148/product/174217690.jpg"),
    ("MARGOT_FOG", "174218213", "コバルト", "https://img07.shop-pro.jp/PA01426/148/product/174218213.jpg"),
    ("MARGOT_FOG", "174217715", "ジラソーレ", "https://img07.shop-pro.jp/PA01426/148/product/174217715.jpg"),
    ("MARGOT_FOG", "174218224", "トッポ", "https://img07.shop-pro.jp/PA01426/148/product/174218224.jpg"),
    ("MARGOT_FOG", "174217729", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/174217729.jpg"),
    ("MARGOT_FOG", "174217652", "ナチュラーレ", "https://img07.shop-pro.jp/PA01426/148/product/174217652.jpg"),
    ("MARGOT_FOG", "174218218", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/174218218.jpg"),
    ("MARGOT_FOG", "174218268", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/174218268.jpg"),
    ("MARGOT_FOG", "174217697", "フクシア", "https://img07.shop-pro.jp/PA01426/148/product/174217697.jpg"),
    ("MARGOT_FOG", "174217708", "フラゴラ", "https://img07.shop-pro.jp/PA01426/148/product/174217708.jpg"),
    ("MARGOT_FOG", "174217655", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/174217655.jpg"),
    ("MARGOT", "158805427", "アローロ", "https://img07.shop-pro.jp/PA01426/148/product/158805427.jpg"),
    ("MARGOT", "188691587", "アヴィオ", "https://img07.shop-pro.jp/PA01426/148/product/188691587.jpg"),
    ("MARGOT", "183786767", "オルモ", "https://img07.shop-pro.jp/PA01426/148/product/183786767.jpg"),
    ("MARGOT", "158805672", "グレー", "https://img07.shop-pro.jp/PA01426/148/product/158805672.jpg"),
    ("MARGOT", "142026124", "コバルト", "https://img07.shop-pro.jp/PA01426/148/product/142026124.jpg"),
    ("MARGOT", "142042006", "ジラソーレ", "https://img07.shop-pro.jp/PA01426/148/product/142042006.png"),
    ("MARGOT", "140633333", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/140633333.jpg"),
    ("MARGOT", "166876910", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/166876910.jpg"),
    ("MARGOT", "170334361", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/170334361.jpg"),
    ("MARGOT", "166876687", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/166876687.jpg"),
    ("MARGOT", "158805629", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/158805629.jpg"),
    ("MARGOT", "183827962", "バーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/183827962.jpg"),
    ("MARGOT", "183827901", "フィエーノ", "https://img07.shop-pro.jp/PA01426/148/product/183827901.jpg"),
    ("MARGOT", "166877020", "フクシア", "https://img07.shop-pro.jp/PA01426/148/product/166877020.jpg"),
    ("MARGOT", "158805363", "フラゴラ", "https://img07.shop-pro.jp/PA01426/148/product/158805363.jpg"),
    ("MARGOT", "142042272", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/142042272.jpg"),
    ("MARGOT", "142026525", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/142026525.jpg"),
    ("MARGOT", "188691341", "プラト", "https://img07.shop-pro.jp/PA01426/148/product/188691341.jpg"),
    ("MARGOT", "183828000", "ボスコ", "https://img07.shop-pro.jp/PA01426/148/product/183828000.jpg"),
    ("MARGOT", "158805358", "マンダリーノ", "https://img07.shop-pro.jp/PA01426/148/product/158805358.jpg"),
    ("MARGOT", "166877083", "メンタ", "https://img07.shop-pro.jp/PA01426/148/product/166877083.jpg"),
    ("MARGOT", "166876967", "リラ", "https://img07.shop-pro.jp/PA01426/148/product/166876967.jpg"),
    ("MARGOT", "188691265", "ローサ", "https://img07.shop-pro.jp/PA01426/148/product/188691265.jpg"),
    ("TEXAS", "176618416", "アガベ", "https://img07.shop-pro.jp/PA01426/148/product/176618416.jpg"),
    ("TEXAS", "176617989", "アンブラ", "https://img07.shop-pro.jp/PA01426/148/product/176617989.jpg"),
    ("TEXAS", "176618366", "オクラ", "https://img07.shop-pro.jp/PA01426/148/product/176618366.jpg"),
    ("TEXAS", "176146678", "キャメロ", "https://img07.shop-pro.jp/PA01426/148/product/176146678.jpg"),
    ("TEXAS", "176618223", "クオイオ", "https://img07.shop-pro.jp/PA01426/148/product/176618223.jpg"),
    ("TEXAS", "176618274", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/176618274.jpg"),
    ("TEXAS", "176618310", "ティー・モロ", "https://img07.shop-pro.jp/PA01426/148/product/176618310.jpg"),
    ("TEXAS", "176618431", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/176618431.jpg"),
    ("TEXAS", "176618488", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/176618488.jpg"),
    ("TEXAS", "176618285", "パパヤ", "https://img07.shop-pro.jp/PA01426/148/product/176618285.jpg"),
    ("TEXAS", "176618472", "ピオンボ", "https://img07.shop-pro.jp/PA01426/148/product/176618472.jpg"),
    ("TEXAS", "176618348", "フィエスタ", "https://img07.shop-pro.jp/PA01426/148/product/176618348.jpg"),
    ("TEXAS", "176618328", "プルーニャ", "https://img07.shop-pro.jp/PA01426/148/product/176618328.jpg"),
    ("TEXAS", "176618374", "ラトゥーガ", "https://img07.shop-pro.jp/PA01426/148/product/176618374.jpg"),
    ("TEXAS", "176618445", "ヴィオラ", "https://img07.shop-pro.jp/PA01426/148/product/176618445.jpg"),
    ("TEXAS", "176618381", "ヴェルデ", "https://img07.shop-pro.jp/PA01426/148/product/176618381.jpg"),
    ("SIBILLA", "172113060", "アガベ", "https://img07.shop-pro.jp/PA01426/148/product/172113060.jpg"),
    ("SIBILLA", "168532565", "イリス", "https://img07.shop-pro.jp/PA01426/148/product/168532565.jpg"),
    ("SIBILLA", "175192406", "クロロフィラ", "https://img07.shop-pro.jp/PA01426/148/product/175192406.jpg"),
    ("SIBILLA", "168532634", "グラファイト", "https://img07.shop-pro.jp/PA01426/148/product/168532634.jpg"),
    ("SIBILLA", "168532629", "チェネレ", "https://img07.shop-pro.jp/PA01426/148/product/168532629.jpg"),
    ("SIBILLA", "168532438", "ティー・モロ", "https://img07.shop-pro.jp/PA01426/148/product/168532438.jpg"),
    ("SIBILLA", "168532402", "デセルト", "https://img07.shop-pro.jp/PA01426/148/product/168532402.jpg"),
    ("SIBILLA", "168532468", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/168532468.jpg"),
    ("SIBILLA", "168532417", "トルトラ", "https://img07.shop-pro.jp/PA01426/148/product/168532417.jpg"),
    ("SIBILLA", "168532544", "ネイビー", "https://img07.shop-pro.jp/PA01426/148/product/168532544.jpg"),
    ("SIBILLA", "168532644", "ネロ", "https://img07.shop-pro.jp/PA01426/148/product/168532644.jpg"),
    ("SIBILLA", "168532449", "フクシア", "https://img07.shop-pro.jp/PA01426/148/product/168532449.jpg"),
    ("SIBILLA", "168532457", "マスタード", "https://img07.shop-pro.jp/PA01426/148/product/168532457.jpg"),
    ("SIBILLA", "168532516", "マリーネ", "https://img07.shop-pro.jp/PA01426/148/product/168532516.jpg"),
    ("AVANCORPI", "186289162", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/186289162.jpg"),
    ("AVANCORPI", "191060393", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/191060393.jpg"),
    ("AVANCORPI", "191473385", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/191473385.jpg"),
    ("HORSE_BUTT", "155709863", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/155709863.jpg"),
    ("HORSE_BUTT", "159561041", "茶芯ブラック", "https://img07.shop-pro.jp/PA01426/148/product/159561041.jpg"),
    ("SC_ROCADO_CLASSIC", "171930317", "ウィスキー", "https://img07.shop-pro.jp/PA01426/148/product/171930317.jpg"),
    ("SC_ROCADO_CLASSIC", "171930324", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/171930324.jpg"),
    ("SC_ROCADO_CLASSIC", "171930332", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/171930332.jpg"),
    ("SC_ROCADO_CLASSIC", "171930342", "ダークバーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/171930342.jpg"),
    ("SC_ROCADO_CLASSIC", "171930338", "ダークブラウン", "https://img07.shop-pro.jp/PA01426/148/product/171930338.jpg"),
    ("SC_ROCADO_CLASSIC", "171930351", "ピンク", "https://img07.shop-pro.jp/PA01426/148/product/171930351.jpg"),
    ("SC_ROCADO_CLASSIC", "171930369", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/171930369.jpg"),
    ("SC_ROCADO_CLASSIC", "171930365", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/171930365.jpg"),
    ("SC_ROCADO_CLASSIC", "171930360", "ペトロリオ", "https://img07.shop-pro.jp/PA01426/148/product/171930360.jpg"),
    ("SC_ROCADO_CLASSIC", "171930353", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/171930353.jpg"),
    ("SC_ROCADO_MARBLED", "171930418", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/171930418.jpg"),
    ("SC_ROCADO_MARBLED", "171930394", "シエナ", "https://img07.shop-pro.jp/PA01426/148/product/171930394.jpg"),
    ("SC_ROCADO_MARBLED", "171930424", "トルケーゼ", "https://img07.shop-pro.jp/PA01426/148/product/171930424.jpg"),
    ("SC_ROCADO_MARBLED", "171930400", "バーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/171930400.jpg"),
    ("SC_ROCADO_MARBLED", "171930407", "ピンク", "https://img07.shop-pro.jp/PA01426/148/product/171930407.jpg"),
    ("SC_ROCADO_MARBLED", "171930388", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/171930388.jpg"),
    ("SC_ROCADO_MARBLED", "171930433", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/171930433.jpg"),
    ("SC_ROCADO_MARBLED", "171930430", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/171930430.jpg"),
    ("SC_ROCADO_MARBLED", "171930411", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/171930411.jpg"),
    ("SC_ROCADO_MUSEUM", "175312214", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/175312214.jpg"),
    ("SC_ROCADO_MUSEUM", "175312185", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/175312185.jpg"),
    ("SC_ROCADO_MUSEUM", "175312202", "バーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/175312202.jpg"),
    ("SC_ROCADO_MUSEUM", "175312193", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/175312193.jpg"),
    ("SC_ROCADO_MUSEUM", "186275867", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/186275867.jpg"),
    ("SC_ROCADO_MUSEUM", "175312220", "ブルー", "https://img07.shop-pro.jp/PA01426/148/product/175312220.jpg"),
    ("SC_ROCADO_MUSEUM", "175312207", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/175312207.jpg"),
    ("SC_ROCADO_NATURAL", "179755605", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/179755605.jpg"),
    ("SC_HORWEEN", "158501313", "#4 チョコ", "https://img07.shop-pro.jp/PA01426/148/product/158501313.jpg"),
    ("SC_HORWEEN", "158501354", "#8 バーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/158501354.jpg"),
    ("SC_HORWEEN", "158501390", "Dコニャック", "https://img07.shop-pro.jp/PA01426/148/product/158501390.jpg"),
    ("SC_HORWEEN", "180263913", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/180263913.jpg"),
    ("SC_HORWEEN", "187307532", "バーボン", "https://img07.shop-pro.jp/PA01426/148/product/187307532.jpg"),
    ("SC_HORWEEN", "157331202", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/157331202.jpg"),
    ("CHROMEXCEL", "156838223", "ティンバー", "https://img07.shop-pro.jp/PA01426/148/product/156838223.jpg"),
    ("CHROMEXCEL", "144503079", "ナチュラル", "https://img07.shop-pro.jp/PA01426/148/product/144503079.jpg"),
    ("CHROMEXCEL", "156838098", "バーガンディ", "https://img07.shop-pro.jp/PA01426/148/product/156838098.jpg"),
    ("CHROMEXCEL", "156838252", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/156838252.jpg"),
    ("DELOREAN", "154473133", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/154473133.jpg"),
    ("DELOREAN", "155490988", "ホワイト", "https://img07.shop-pro.jp/PA01426/148/product/155490988.jpg"),
    ("DELOREAN", "155504309", "ライトグレー", "https://img07.shop-pro.jp/PA01426/148/product/155504309.jpg"),
    ("LAUNDERED", "167124351", "オフホワイト", "https://img07.shop-pro.jp/PA01426/148/product/167124351.jpg"),
    ("LAUNDERED", "167124375", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/167124375.jpg"),
    ("DRITTON_G8", "168271857", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/168271857.jpg"),
    ("DRITTON_G8", "168270372", "ホワイト", "https://img07.shop-pro.jp/PA01426/148/product/168270372.jpg"),
    ("DROID", "159056848", "アルパイン", "https://img07.shop-pro.jp/PA01426/148/product/159056848.jpg"),
    ("DROID", "159055623", "アンバー", "https://img07.shop-pro.jp/PA01426/148/product/159055623.jpg"),
    ("DROID", "159050897", "アーモンド", "https://img07.shop-pro.jp/PA01426/148/product/159050897.jpg"),
    ("DROID", "159056093", "ウィスキー", "https://img07.shop-pro.jp/PA01426/148/product/159056093.jpg"),
    ("DROID", "159056995", "エスプレッソ", "https://img07.shop-pro.jp/PA01426/148/product/159056995.jpg"),
    ("DROID", "159056917", "オリーブ", "https://img07.shop-pro.jp/PA01426/148/product/159056917.jpg"),
    ("DROID", "159056616", "オーシャン", "https://img07.shop-pro.jp/PA01426/148/product/159056616.jpg"),
    ("DROID", "159056893", "グリーン", "https://img07.shop-pro.jp/PA01426/148/product/159056893.jpg"),
    ("DROID", "159054208", "コニャック", "https://img07.shop-pro.jp/PA01426/148/product/159054208.jpg"),
    ("DROID", "159056956", "コーラ", "https://img07.shop-pro.jp/PA01426/148/product/159056956.jpg"),
    ("DROID", "159050298", "サンド", "https://img07.shop-pro.jp/PA01426/148/product/159050298.jpg"),
    ("DROID", "159050790", "ストーン", "https://img07.shop-pro.jp/PA01426/148/product/159050790.jpg"),
    ("DROID", "159050842", "ナット", "https://img07.shop-pro.jp/PA01426/148/product/159050842.jpg"),
    ("DROID", "159050134", "パウダー", "https://img07.shop-pro.jp/PA01426/148/product/159050134.jpg"),
    ("DROID", "159056300", "ブラウン", "https://img07.shop-pro.jp/PA01426/148/product/159056300.jpg"),
    ("DROID", "157911205", "ブラック", "https://img07.shop-pro.jp/PA01426/148/product/157911205.jpg"),
    ("DROID", "159056366", "ブリック", "https://img07.shop-pro.jp/PA01426/148/product/159056366.jpg"),
    ("DROID", "159056414", "プラム", "https://img07.shop-pro.jp/PA01426/148/product/159056414.jpg"),
    ("DROID", "159050069", "ホワイト", "https://img07.shop-pro.jp/PA01426/148/product/159050069.jpg"),
    ("DROID", "159050762", "マッシュルーム", "https://img07.shop-pro.jp/PA01426/148/product/159050762.jpg"),
    ("DROID", "159056681", "マリーン", "https://img07.shop-pro.jp/PA01426/148/product/159056681.jpg"),
    ("DROID", "159050491", "ムーンロック", "https://img07.shop-pro.jp/PA01426/148/product/159050491.jpg"),
    ("DROID", "159057050", "モカ", "https://img07.shop-pro.jp/PA01426/148/product/159057050.jpg"),
    ("DROID", "159056332", "レッド", "https://img07.shop-pro.jp/PA01426/148/product/159056332.jpg"),
    ("DROID", "159056532", "ロイヤル", "https://img07.shop-pro.jp/PA01426/148/product/159056532.jpg"),
    ("DROID", "159056439", "ワイン", "https://img07.shop-pro.jp/PA01426/148/product/159056439.jpg"),
    ("NUME", "143377638", "2.5-3.0mm", "https://img07.shop-pro.jp/PA01426/148/product/143377638.jpg"),
    ("NUME", "152579135", "3.5-4.0mm", "https://img07.shop-pro.jp/PA01426/148/product/152579135.jpg"),
    ("NUME", "158695092", "ベリー 2.5-3.0mm", "https://img07.shop-pro.jp/PA01426/148/product/158695092.jpg"),
]

# ------------------------------------------------------------------
# 既存カタログとの重複（追加しない）pid → 理由
# ------------------------------------------------------------------
SKIP_PIDS = {}
# ALASKA 16色: 既存 ska01..ska46 と全色一致
for _p in ['170150003', '141898992', '155535744', '152578876', '155535799', '148270635',
           '155536414', '141891418', '140336842', '170150207', '155536107', '155535485',
           '141893632', '148270455', '152578868', '155536219']:
    SKIP_PIDS[_p] = 'ALASKA: 既存エントリ(ska*)と同色'
# MARIANO 7色: 既存 mano01..mano32 と全色一致（★系列は指示の重複排除対象外だが明白な重複のため除外・レポート明記）
for _p in ['189376362', '189376376', '189376357', '189376345', '189376367', '189376351', '189376385']:
    SKIP_PIDS[_p] = 'MARIANO: 既存エントリ(mano*)と同色'
# MARGOT FOG 12色: 既存 mfog_* と全色一致
for _p in ['174217722', '174217690', '174218213', '174217715', '174218224', '174217729',
           '174217652', '174218218', '174218268', '174217697', '174217708', '174217655']:
    SKIP_PIDS[_p] = 'MARGOT FOG: 既存エントリ(mfog_*)と同色'
# LINEA VASCA Box 13色: 既存 lvb_* と全色一致
for _p in ['174657061', '174657044', '174657065', '174657027', '174657035', '174657080',
           '180707715', '180707714', '174657071', '174657087', '174657048', '174657051',
           '174657054']:
    SKIP_PIDS[_p] = 'LINEA VASCA Box: 既存エントリ(lvb_*)と同色'
# MARGOT: 既存 mg_* 20色と一致（新規はアヴィオ/コバルト/プラトの3色のみ）
SKIP_PIDS.update({
    '158805427': 'MARGOT: 既存 mg_all アローロ',
    '183786767': 'MARGOT: 既存 mg_olm オルモ',
    '158805672': 'MARGOT: 既存 mg_top トッポ（灰）… #Topo グレー',
    '142042006': 'MARGOT: 既存 mg_gir ジラソーレ',
    '140633333': 'MARGOT: 既存 mg_dkb ダークブラウン（#Dark Brown）',
    '166876910': 'MARGOT: 既存 mg_cas カスターニャ（#Castagna ダークブラウン）',
    '170334361': 'MARGOT: 既存 mg_tur トルケーゼ',
    '166876687': 'MARGOT: 既存 mg_nat ナチュラーレ＝#Naturale 同色と判断【要確認】',
    '158805629': 'MARGOT: 既存 mg_nav ネイビー',
    '183827962': 'MARGOT: 既存 mg_bur バーガンディ',
    '183827901': 'MARGOT: 既存 mg_fie フィエーノ',
    '166877020': 'MARGOT: 既存 mg_fux フクシア',
    '158805363': 'MARGOT: 既存 mg_fra フラゴラ',
    '142042272': 'MARGOT: 既存 mg_brn ブラウン',
    '142026525': 'MARGOT: 既存 mg_ner ネロ（黒）＝#Nero ブラック',
    '183828000': 'MARGOT: 既存 mg_bos ボスコ',
    '158805358': 'MARGOT: 既存 mg_man マンダリーノ',
    '166877083': 'MARGOT: 既存 mg_men メンタ',
    '166876967': 'MARGOT: 既存 mg_lil リラ（薄紫）',
    '188691265': 'MARGOT: 既存 mg_ros ローサ（桃）',
    # 生成りヌメ 2.5-3.0mm: 既存 numer_25 と同一（次回入荷表記のみの違い）
    '143377638': '生成りヌメ: 既存 numer_25 と同一商品',
})

# ------------------------------------------------------------------
# 系列メタ（name接頭辞, sub, タンナータグ, 系列タグ, 鞣しタグ, 追加タグ）
# ------------------------------------------------------------------
META = {
    'BULGARO':          ('BULGARO', 'Lo Stivale / タンニン鞣し', 'Lo Stivale', 'BULGARO', 'タンニン鞣し', []),
    'NEBRASKA':         ('NEBRASKA', 'Lo Stivale / タンニン鞣し', 'Lo Stivale', 'NEBRASKA', 'タンニン鞣し', []),
    'TENDER':           ('TENDER', 'Lo Stivale / タンニン鞣し', 'Lo Stivale', 'TENDER', 'タンニン鞣し', []),
    'REVERSO':          ('REVERSO', 'Lo Stivale / リバースレザー・タンニン鞣し', 'Lo Stivale', 'REVERSO', 'タンニン鞣し', []),
    'TWIST':            ('TWIST', 'Lo Stivale / タンニン鞣し', 'Lo Stivale', 'TWIST', 'タンニン鞣し', []),
    'ALASKA':           ('ALASKA', 'La Perla Azzurra / ロウ引き', 'La Perla Azzurra', 'ALASKA', 'タンニン鞣し', []),
    'AMAZZONIA':        ('AMAZZONIA', 'La Perla Azzurra / タンニン鞣し', 'La Perla Azzurra', 'AMAZZONIA', 'タンニン鞣し', []),
    'CRUST':            ('CRUST', 'La Perla Azzurra / タンニン鞣し', 'La Perla Azzurra', 'CRUST', 'タンニン鞣し', []),
    'COUNTRY':          ('COUNTRY', 'La Perla Azzurra / タンニン鞣し', 'La Perla Azzurra', 'COUNTRY', 'タンニン鞣し', []),
    'MARIANO':          ('MARIANO', 'La Perla Azzurra / 植物タンニン鞣し', 'La Perla Azzurra', 'MARIANO', 'タンニン鞣し', []),
    'LV_LISCIO':        ('LINEA VASCA Liscio', 'Virgilio / ピット槽鞣し', 'Virgilio', 'LINEA VASCA Liscio', 'タンニン鞣し', ['リスシオ']),
    'LV_BOX':           ('LINEA VASCA Box', 'Virgilio / ボックスカーフ仕上げ', 'Virgilio', 'LINEA VASCA Box', 'タンニン鞣し', []),
    'MARGOT':           ('MARGOT', 'Virgilio / 植物タンニン鞣し', 'Virgilio', 'MARGOT', 'タンニン鞣し', []),
    'MARGOT_FOG':       ('MARGOT FOG', 'Virgilio / 植物タンニン鞣し', 'Virgilio', 'MARGOT FOG', 'タンニン鞣し', []),
    'TEXAS':            ('TEXAS', 'TEMPESTI / タンニン鞣し', 'TEMPESTI', 'TEXAS', 'タンニン鞣し', []),
    'SIBILLA':          ('SIBILLA Liscio', 'TEMPESTI / タンニン鞣し', 'TEMPESTI', 'SIBILLA Liscio', 'タンニン鞣し', ['リスシオ']),
    'AVANCORPI':        ('AVANCORPI', 'ROCADO / 馬・ホースフロント', 'ROCADO', 'AVANCORPI', 'タンニン鞣し', ['馬革']),
    'HORSE_BUTT':       ('ホースバット', 'MARYAM / 馬革・タンニン鞣し', 'MARYAM', 'HORSE BUTT', 'タンニン鞣し', ['馬革', 'ホースバット']),
    'SC_ROCADO_CLASSIC':('シェルコードバン(ROCADO/CLASSIC)', 'ROCADO / コードバン', 'ROCADO', 'SHELL CORDOVAN', 'タンニン鞣し', ['コードバン', '馬革']),
    'SC_ROCADO_MARBLED':('シェルコードバン(ROCADO/MARBLED)', 'ROCADO / コードバン', 'ROCADO', 'SHELL CORDOVAN', 'タンニン鞣し', ['コードバン', '馬革']),
    'SC_ROCADO_MUSEUM': ('シェルコードバン(ROCADO/MUSEUM)', 'ROCADO / コードバン', 'ROCADO', 'SHELL CORDOVAN', 'タンニン鞣し', ['コードバン', '馬革']),
    'SC_ROCADO_NATURAL':('シェルコードバン(ROCADO/NATURAL)', 'ROCADO / コードバン', 'ROCADO', 'SHELL CORDOVAN', 'タンニン鞣し', ['コードバン', '馬革']),
    'SC_HORWEEN':       ('シェルコードバン(HORWEEN)', 'HORWEEN / コードバン', 'HORWEEN', 'SHELL CORDOVAN', 'タンニン鞣し', ['コードバン', '馬革']),
    'CHROMEXCEL':       ('CHROMEXCEL', 'HORWEEN / コンビ鞣し', 'HORWEEN', 'CHROMEXCEL', 'コンビ鞣し', []),
    'DELOREAN':         ('DELOREAN', 'ECCO LEATHER / ダイニーマ・クロム鞣し', 'ECCO LEATHER', 'DELOREAN', 'クロム鞣し', []),
    'LAUNDERED':        ('LAUNDERED', 'ECCO LEATHER / ウォッシャブル・クロム鞣し', 'ECCO LEATHER', 'LAUNDERED', 'クロム鞣し', []),
    'DRITTON_G8':       ('DRITTON G8', 'ECCO LEATHER / GORE-TEX・クロム鞣し', 'ECCO LEATHER', 'DRITTON G8', 'クロム鞣し', []),
    'DROID':            ('DROID', 'ECCO LEATHER / クロム鞣し', 'ECCO LEATHER', 'DROID', 'クロム鞣し', []),
    'NUME':             ('生成りヌメ革', '国産 / 植物タンニン鞣し・素上げ', '国産', 'ヌメ革', 'タンニン鞣し', []),
}

# ------------------------------------------------------------------
# 色系統タグ（hearing-core.js TONE_KEYWORDS + 追加マッピング表 + 既存カタログ踏襲）
# ------------------------------------------------------------------
TONE_TABLE = [
    ('ブルー系',    ['ネイビー', 'ブルー', 'ターコイズ', 'コバルト', 'トルケーゼ', 'アイスブルー',
                     'マリーネ', 'マリーン', 'オーシャン', 'ロイヤル', 'アヴィオ', 'ペトロリオ']),
    ('レッド系',    ['レッド', 'ピンク', 'ワイン', 'バーガンディ', 'フクシア', 'ラズベリー', 'リラ',
                     'ロッソ', 'プルーニャ', 'プラム', 'フィエスタ', 'ヴィオラ', 'ヴァイオレット',
                     'イリス', 'ローサ', 'フラゴラ']),
    ('ブラウン系',  ['ブラウン', 'キャメル', 'チョコ', 'カスターニャ', 'コニャック', 'シエナ',
                     'キャメロ', 'アンブラ', 'モカ', 'エスプレッソ', 'コーラ', 'ティンバー', 'ナット',
                     'アーモンド', 'マッシュルーム', 'ウィスキー', 'バーボン', 'マローネ',
                     'ティー・モロ', 'エバノ', 'ブリック', 'オルモ', 'クオイオ']),
    ('ダーク系',    ['ブラック', 'ネロ', '茶芯', 'グレー', 'グラファイト', 'チェネレ', 'ピオンボ',
                     'トッポ', 'ムーンロック', 'ストーン', 'トープ']),
    ('イエロー系',  ['イエロー', 'オレンジ', 'マンダリーノ', 'ジラソーレ', 'ジアロ', 'マスタード',
                     'オクラ', 'パパヤ', 'アンバー']),
    ('グリーン系',  ['グリーン', 'オリーブ', 'メンタ', 'アローロ', 'ビリジアン', 'ヴェルデ', 'プラト',
                     'アガベ', 'ラトゥーガ', 'クロロフィラ', 'アルパイン', 'ミリターレ',
                     'オルティーカ', 'ボスコ']),
    ('ナチュラル系', ['ナチュラーレ', 'ナチュラル', 'アイボリー', 'オフホワイト', 'ホワイト',
                     'パウダー', 'サンド', 'ベージュ', 'デセルト', 'トルトラ', 'セサンタ', 'ヌメ']),
]
# 語の長い順で照合（ダークバーガンディ→バーガンディ等の部分一致対策）
_WORDS = sorted([(w, fam) for fam, ws in TONE_TABLE for w in ws],
                key=lambda x: -len(x[0]))


def resolve_tone(series_key, color):
    if series_key == 'NUME':
        return 'ナチュラル系'
    for w, fam in _WORDS:
        if w in color:
            return fam
    return None  # 未分類（ナチュラル系で仮置き・レポート出力）


def build_entry(series_key, pid, color):
    prefix, sub, tanner, stag, tantag, extra = META[series_key]
    if series_key == 'NUME':
        name = ('生成りヌメベリー 2.5-3.0mm' if 'ベリー' in color
                else '生成りヌメ革 ' + color)
    else:
        name = prefix + ' ' + color
    tone = resolve_tone(series_key, color)
    pending = tone is None
    if pending:
        tone = 'ナチュラル系'
    tags = [tanner, stag, tantag, tone] + extra
    return {
        'id': 'kw' + pid,
        'name': name,
        'sub': sub,
        'tags': tags,
        'image': 'assets/leathers/kw%s.jpg' % pid,
    }, tone, pending


def download_images(items):
    import requests
    from PIL import Image
    ok, fail = [], []
    sess = requests.Session()
    sess.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    os.makedirs(IMGDIR, exist_ok=True)
    for i, (pid, url) in enumerate(items):
        dest = os.path.join(IMGDIR, 'kw%s.jpg' % pid)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            ok.append(pid)
            continue
        try:
            r = sess.get(url, timeout=30)
            r.raise_for_status()
            im = Image.open(io.BytesIO(r.content))
            if im.mode != 'RGB':
                im = im.convert('RGB')
            w, h = im.size
            long_side = max(w, h)
            if long_side > 600:
                scale = 600.0 / long_side
                im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))),
                               Image.LANCZOS)
            im.save(dest, 'JPEG', quality=82, optimize=True)
            ok.append(pid)
        except Exception as ex:
            fail.append((pid, str(ex)))
            print('  IMG FAIL kw%s: %s' % (pid, ex))
        time.sleep(0.5)  # 礼儀正しく
        if (i + 1) % 25 == 0:
            print('  img %d/%d' % (i + 1, len(items)), flush=True)
    return ok, fail


def main():
    skip_images = '--skip-images' in sys.argv

    # --- 追加エントリ構築 ---
    adds, tones, pending_colors = [], {}, []
    img_targets = []
    seen_pids = set()
    for series_key, pid, color, img in DATA:
        if pid in seen_pids:
            raise SystemExit('DATA内でpid重複: ' + pid)
        seen_pids.add(pid)
        if pid in SKIP_PIDS:
            continue
        e, tone, pending = build_entry(series_key, pid, color)
        adds.append(e)
        tones[tone] = tones.get(tone, 0) + 1
        if pending:
            pending_colors.append('%s %s (kw%s)' % (series_key, color, pid))
        img_targets.append((pid, img))

    # --- カタログJSON更新（既存エントリ無変更・kw*のみ入替再追加） ---
    raw = open(CATALOG, 'r', encoding='utf-8', newline='').read()
    obj = json.loads(raw)
    base = [e for e in obj['leathers'] if not e['id'].startswith('kw')]
    base_ids = {e['id'] for e in base}
    for e in adds:
        if e['id'] in base_ids:
            raise SystemExit('ID衝突: ' + e['id'])
        dup = [b for b in base if b['name'] == e['name']]
        if dup:
            raise SystemExit('既存と同名: ' + e['name'])
    obj['leathers'] = base + adds
    out = json.dumps(obj, ensure_ascii=False, indent=1) + '\n'
    with open(CATALOG, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(out)

    # --- 在庫CSV更新（既存行無変更・kw*行のみ入替再追加） ---
    with open(STOCK, 'r', encoding='utf-8', newline='') as f:
        lines = f.read().split('\r\n')
    keep = [l for l in lines if l and not l.startswith('kw')]
    new_rows = ['%s,%s,,' % (e['id'], e['name']) for e in adds]
    with open(STOCK, 'w', encoding='utf-8', newline='') as f:
        f.write('\r\n'.join(keep + new_rows) + '\r\n')

    # --- 画像 ---
    ok, fail = ([], [])
    if not skip_images:
        print('画像ダウンロード開始 (%d件・0.5秒間隔)...' % len(img_targets), flush=True)
        ok, fail = download_images(img_targets)
        if fail:
            # 失敗した色は image を空文字にしてJSONを書き直す
            failed_ids = {'kw' + p for p, _ in fail}
            for e in obj['leathers']:
                if e['id'] in failed_ids:
                    e['image'] = ''
            out = json.dumps(obj, ensure_ascii=False, indent=1) + '\n'
            with open(CATALOG, 'w', encoding='utf-8', newline='\r\n') as f:
                f.write(out)

    # --- レポート ---
    print('\n===== ビルド結果 =====')
    print('既存エントリ:', len(base), '/ 新規追加:', len(adds),
          '/ 合計:', len(obj['leathers']))
    print('スキップ（重複）:', len(SKIP_PIDS))
    print('色系統別:', json.dumps(tones, ensure_ascii=False))
    print('色系統合計:', sum(tones.values()))
    if pending_colors:
        print('未分類（ナチュラル系で仮置き）:')
        for c in pending_colors:
            print('  -', c)
    if not skip_images:
        print('画像: 成功 %d / 失敗 %d' % (len(ok), len(fail)))
        for p, msg in fail:
            print('  失敗 kw%s: %s' % (p, msg))
    json.load(open(CATALOG, encoding='utf-8'))
    print('JSON妥当性: OK')


if __name__ == '__main__':
    main()
