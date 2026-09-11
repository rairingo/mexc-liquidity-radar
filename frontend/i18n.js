// MEXC Liquidity Terminal - i18n Internationalization Module
// Supported Languages: en (English - Default), ja (Japanese), zh (Simplified Chinese), ko (Korean), es (Spanish), vi (Vietnamese)

const TRANSLATIONS = {
  en: {
    // Header & Meta
    appTitle: "MEXC Liquidity Terminal",
    appSubtitle: "Altcoin Orderbook Radar & Liquidation Hunter",
    marketLive: "MEXC SPOT LIVE",
    lastSync: "Last Update: {time}",
    syncing: "Scanning...",
    btnRefresh: "Scan Market",
    btnMethodology: "Methodology & Specs",
    navRegisterBtn: "Sign Up MEXC (Code: 3tZTP)",
    btnSettings: "Filters & Alerts",
    settingsTitle: "Screener & Alert Threshold Settings",
    secFilterDisplay: "Screener Display Criteria",
    secFilterAlert: "Sound Alert Trigger Criteria",
    lblMinProb: "Minimum Probability Score (0 - 99)",
    lblMinImpact: "Minimum Impact Multiplier (0 - 99)",
    lblMaxCost: "Maximum Trigger Capital (USDT)",
    lblMinVol: "Minimum 24h Volume (USDT)",
    lblMaxDistance: "Maximum Distance to Barrier (%)",
    lblAlertMinProb: "Audio Alert: Min Probability Score",
    lblAlertMaxCost: "Audio Alert: Max Trigger Capital ($USDT)",
    btnApply: "Apply & Save Filters",
    btnReset: "Reset Defaults",
    
    // Stats Summary
    statMonitored: "Monitored Pairs",
    statMonitoredSub: "Active MEXC Altcoins ($20k-$2.5M Vol)",
    statHighAlert: "High Squeeze / Break Alert",
    statHighAlertSub: "Probability > 75% | Vulnerable Levels",
    statMinTrigger: "Lowest Trigger Capital",
    statMinTriggerSub: "Cost to pierce key support/resistance",
    statImbalance: "Avg Book Imbalance",
    statImbalanceSub: "Bid vs Ask Volume (±3% Depth)",

    // Tabs
    tabAll: "All Opportunities",
    tabAllDesc: "Unified ranking of top structural orderbook anomalies",
    tabAvalanche: "Long Liquidation Cascades",
    tabAvalancheDesc: "Fragile bid books prone to dump through support",
    tabSqueeze: "Short Squeeze Breakouts",
    tabSqueezeDesc: "Thin ask books vulnerable to explosive pump",

    // Controls
    searchPlaceholder: "Search symbol (e.g. PEPE, SOL, KAVA)...",
    sortLabel: "Sort:",
    sortProb: "Probability",
    sortImpact: "Impact Multiplier",
    sortCost: "Trigger Cost (Low)",
    sortDistance: "Distance to Line",
    sortVolume: "24h Volume",
    viewCards: "Grid View",
    viewTable: "Screener Table",

    // Status
    loadingTitle: "Analyzing MEXC Orderbooks...",
    loadingDesc: "Calculating cumulative depth and swing levels across pairs",
    noData: "No qualifying pairs found for the current filters.",
    loadMore: "Load More ({count} remaining)",

    // Card & Table
    directionLong: "LONG CASCADE",
    directionShort: "SHORT SQUEEZE",
    labelCostDown: "Dump to Trigger Long Stop",
    labelCostUp: "Pump to Pierce Short Stop",
    distance: "Distance",
    targetPrice: "Trigger Level",
    vol24h: "24h Vol",
    imbalance3pct: "Depth Imbalance (±3%)",
    tradeOnMexc: "Trade on MEXC",
    probScore: "Probability",
    impactScore: "Impact",
    action: "Action",
    symbol: "Symbol",
    price: "Price",
    change24h: "24h Change",

    // Descriptions
    descDown: "Market sell of {cost} pierces support (${price}) triggering long stop losses",
    descUp: "Market buy of {cost} breaks resistance (${price}) triggering short liquidations",

    // Methodology Modal
    modalTitle: "Methodology & Calculation Specifications",
    modalClose: "Close",
    sec1Title: "1. Stop Loss Cluster Zone (P_stop)",
    sec1Text: "Retail stops cluster tightly beneath recent key 24h swing support/resistance levels. The system identifies these levels dynamically:",
    sec2Title: "2. Cumulative Depth Trigger Cost (USDT)",
    sec2Text: "The system computes the exact cumulative capital needed to exhaust all resting limit orders up to the cluster zone:",
    sec3Title: "3. Dual-Score Evaluation Model",
    sec3Text: "• Probability Score (0-99): Derived from proximity to line, low trigger capital, and orderbook imbalance.\n• Impact Multiplier (0-99): Evaluates liquidity trap severity by comparing 24h turnover against the thin wall.",
    sec4Title: "Disclaimer & Risk Warning",
    sec4Text: "All metrics are computed objectively from public MEXC orderbook data. This terminal does not provide financial advice, trading signals, or solicitation. Crypto trading entails high risk.",
    
    // MEXC Smart Gateway Modal
    gatewayTitle: "Trade {symbol} on MEXC",
    gatewayDesc: "Do you already have an official MEXC trading account?",
    gatewayRegister: "New User: Sign Up (Permanent Fee Discount: 3tZTP)",
    gatewayTrade: "Existing User: Open Trading Chart Directly",
    gatewayRemember: "Remember my choice and skip this dialog next time"
  },
  ja: {
    appTitle: "MEXC板監視ターミナル",
    appSubtitle: "現物アルトコイン板不均衡・損切り連鎖検知システム",
    marketLive: "MEXC現物ライブフィード",
    lastSync: "最終更新: {time}",
    syncing: "スキャン中...",
    btnRefresh: "最新データ再取得",
    btnMethodology: "計算仕様・数式定義",
    navRegisterBtn: "MEXC口座開設（招待コード: 3tZTP）",
    btnSettings: "フィルター＆アラート設定",
    settingsTitle: "スクリーナー表示基準 ＆ アラート発火設定",
    secFilterDisplay: "スクリーナー表示基準（フィルター）",
    secFilterAlert: "サウンドアラート通知基準",
    lblMinProb: "最小発生確率スコア (0 - 99)",
    lblMinImpact: "最小破壊力倍率 (0 - 99)",
    lblMaxCost: "最大トリガー必要資本 (USDT)",
    lblMinVol: "最小24H出来高 (USDT)",
    lblMaxDistance: "節目までの最大距離 (%)",
    lblAlertMinProb: "音声アラート: 最小発生確率",
    lblAlertMaxCost: "音声アラート: 最大トリガー必要額 ($USDT)",
    btnApply: "設定を保存・適用",
    btnReset: "初期値にリセット",

    statMonitored: "監視銘柄数",
    statMonitoredSub: "MEXC現物アルトコイン (出来高2万〜250万$)",
    statHighAlert: "高警戒・高確率シグナル",
    statHighAlertSub: "発生確率 > 75% | 防衛ライン脆弱",
    statMinTrigger: "最少突破コスト",
    statMinTriggerSub: "節目ラインを突き崩す成行必要資金",
    statImbalance: "平均板不均衡比率",
    statImbalanceSub: "買い板厚 vs 売り板厚 (±3%デプス)",

    tabAll: "総合チャンス順 (全銘柄)",
    tabAllDesc: "上下問わず最も構造的歪みが大きい銘柄を統合ランキング",
    tabAvalanche: "下落雪崩 (ロング損切り)",
    tabAvalancheDesc: "買い板が極端に薄くサポート割れ直前の銘柄",
    tabSqueeze: "上昇踏み上げ (ショート損切り)",
    tabSqueezeDesc: "売り板が蒸発しており天井突破・急騰が狙える銘柄",

    searchPlaceholder: "銘柄シンボルで検索 (例: PEPE, SOL, KAVA)...",
    sortLabel: "並び順:",
    sortProb: "発生確率順",
    sortImpact: "破壊力倍率順",
    sortCost: "必要資本（低順）",
    sortDistance: "節目最接近順",
    sortVolume: "24H出来高順",
    viewCards: "カード表示",
    viewTable: "スクリーナー表",

    loadingTitle: "MEXC板情報・累積デプス解析中...",
    loadingDesc: "全現物ペアの板厚みとスイング節目をリアルタイム集計しています",
    noData: "該当する健全な銘柄が見つかりませんでした。",
    loadMore: "さらに読み込む (残り {count} 件)",

    directionLong: "下落雪崩 (ロング損切り)",
    directionShort: "上昇踏み上げ (ショート損切り)",
    labelCostDown: "突き崩し売りコスト",
    labelCostUp: "天井突破買いコスト",
    distance: "距離",
    targetPrice: "ターゲット節目価格",
    vol24h: "24H出来高",
    imbalance3pct: "板不均衡 (±3%)",
    tradeOnMexc: "MEXCで取引",
    probScore: "確率",
    impactScore: "威力",
    action: "アクション",
    symbol: "銘柄",
    price: "現在価格",
    change24h: "24H変動",

    descDown: "成行売り {cost} で防衛ライン (${price}) を貫通しロング損切り連鎖",
    descUp: "成行買い {cost} で天井 (${price}) を突破しショート損切り連鎖",

    modalTitle: "当システムの算出仕様・数式定義について",
    modalClose: "閉じる",
    sec1Title: "1. 損切り密集ライン (P_stop) の定義",
    sec1Text: "一般トレーダーの逆指値（ストップロス）は直近のサポート安値/レジスタンス高値の直前直下に集中します。",
    sec2Title: "2. トリガー額（Trigger Cost USDT）の計算式",
    sec2Text: "現在価格から節目ラインまでに並んでいる板の累積金額（USDT）を合算し、ライン突破に必要な実資金を算出します。",
    sec3Title: "3. 確率 ＆ 破壊力の二軸評価モデル",
    sec3Text: "• 発生確率スコア (0-99): 節目までの距離の近さ、必要資金の少なさ、板不均衡から算出。\n• 破壊力スコア (0-99): 出来高に対して板がどれほど薄いか（流動性トラップ倍率）を評価。",
    sec4Title: "免責事項・データ利用上の注意",
    sec4Text: "本システムで表示されるデータはMEXC公開APIより取得した数値を機械的に分析した客観的指標です。投資助言や勧誘を目的としたものではありません。",

    // MEXC Smart Gateway Modal
    gatewayTitle: "MEXCで {symbol} を取引",
    gatewayDesc: "MEXCの取引口座をお持ちですか？",
    gatewayRegister: "新規口座開設して取引（招待コード: 3tZTP で手数料永久割引）",
    gatewayTrade: "既存のアカウントで取引画面へ移動",
    gatewayRemember: "次回からこの確認を表示せず直接取引画面を開く"
  },
  zh: {
    appTitle: "MEXC 深度清算终端",
    appSubtitle: "现货山寨币盘口失衡与止损清算雷达",
    marketLive: "MEXC 现货实时数据",
    lastSync: "更新时间: {time}",
    syncing: "扫描中...",
    btnRefresh: "刷新行情",
    btnMethodology: "计算规范与公式",
    navRegisterBtn: "注册 MEXC (邀请码: 3tZTP)",
    btnSettings: "筛选与报警设置",
    settingsTitle: "筛选指标与警报阈值自定义",
    secFilterDisplay: "选币筛选显示标准",
    secFilterAlert: "声音警报触发标准",
    lblMinProb: "最低突破概率分 (0 - 99)",
    lblMinImpact: "最低破坏力倍数 (0 - 99)",
    lblMaxCost: "最大突破所需资金 (USDT)",
    lblMinVol: "最低 24H 成交额 (USDT)",
    lblMaxDistance: "距关键位最大距离 (%)",
    lblAlertMinProb: "声音警报: 最低概率",
    lblAlertMaxCost: "声音警报: 最大所需资金 ($USDT)",
    btnApply: "保存并应用筛选",
    btnReset: "恢复默认值",

    statMonitored: "监控币对数",
    statMonitoredSub: "MEXC 活跃山寨币 (成交额 2万-250万美元)",
    statHighAlert: "高危异动预警",
    statHighAlertSub: "概率 > 75% | 关键支撑阻力脆弱",
    statMinTrigger: "最低突破资金",
    statMinTriggerSub: "击穿防守线所需的市价资金",
    statImbalance: "平均盘口倾斜度",
    statImbalanceSub: "买盘量 vs 卖盘量 (±3% 深度)",

    tabAll: "综合异动机会",
    tabAllDesc: "多空双向结构性失衡币对的综合排名",
    tabAvalanche: "多头踩踏雪崩",
    tabAvalancheDesc: "买盘极薄、跌破关键支撑即引发多头踩踏",
    tabSqueeze: "空头挤压爆拉",
    tabSqueezeDesc: "卖盘薄弱、少量资金即可突破天花板轧空",

    searchPlaceholder: "搜索币种 (如 PEPE, SOL, KAVA)...",
    sortLabel: "排序:",
    sortProb: "发生概率",
    sortImpact: "破坏力倍数",
    sortCost: "突破资金最低",
    sortDistance: "距关键位最近",
    sortVolume: "24H 成交额",
    viewCards: "卡片视图",
    viewTable: "专业筛选表",

    loadingTitle: "正在分析 MEXC 订单簿与深度...",
    loadingDesc: "实时计算全币种累计盘口深度与突破成本",
    noData: "未找到符合当前筛选条件的有效币对。",
    loadMore: "加载更多 (剩余 {count} 个)",

    directionLong: "多头踩踏",
    directionShort: "空头轧空",
    labelCostDown: "砸穿支撑所需资金",
    labelCostUp: "拉穿阻力所需资金",
    distance: "距离",
    targetPrice: "目标关键位",
    vol24h: "24H 成交额",
    imbalance3pct: "盘口不平衡 (±3%)",
    tradeOnMexc: "前往 MEXC 交易",
    probScore: "概率",
    impactScore: "破坏力",
    action: "操作",
    symbol: "币种",
    price: "现价",
    change24h: "24H 涨跌幅",

    descDown: "仅需 {cost} 市价抛盘即可击穿支撑位 (${price}) 引发多头止损连环踩踏",
    descUp: "仅需 {cost} 市价买盘即可突破阻力位 (${price}) 诱发空头爆仓拉升",

    modalTitle: "算法指标与计算规范",
    modalClose: "关闭",
    sec1Title: "1. 止损集中带 (P_stop) 定义",
    sec1Text: "市场常规挂单集中在近期 24 小时波段高低点之外，系统据此自动锚定潜在止损密集区。",
    sec2Title: "2. 累计深度触发成本 (Trigger Cost)",
    sec2Text: "累计计算从现价到目标止损位之间所有的真实挂单金额，量化击穿所需净资金。",
    sec3Title: "3. 双维度评估系统",
    sec3Text: "• 概率得分 (0-99): 基于距关键位百分比、突破成本及深度失衡。\n• 破坏力得分 (0-99): 比较 24 小时成交量与盘口薄厚，评估流动性陷阱引发的波动幅度。",
    sec4Title: "免责声明",
    sec4Text: "本终端所有数据均源自 MEXC 公开 API 自动化计算，不构成任何投资建议或交易邀请。",

    // MEXC Smart Gateway Modal
    gatewayTitle: "在 MEXC 交易 {symbol}",
    gatewayDesc: "您已拥有 MEXC 官方交易账户吗？",
    gatewayRegister: "新用户：立即注册（永久手续费折扣：3tZTP）",
    gatewayTrade: "已有账户：直接前往交易图表",
    gatewayRemember: "记住我的选择，下次不再显示此提示"
  },
  ko: {
    appTitle: "MEXC 오더북 유동성 터미널",
    appSubtitle: "알트코인 호가 불균형 & 스퀴즈·스탑로스 감지 레이더",
    marketLive: "MEXC 현물 실시간 피드",
    lastSync: "마지막 업데이트: {time}",
    syncing: "스캔 중...",
    btnRefresh: "데이터 새로고침",
    btnMethodology: "산출 로직 및 사양",
    navRegisterBtn: "MEXC 가입 (초대코드: 3tZTP)",
    btnSettings: "필터 및 알림 설정",
    settingsTitle: "스크리너 조건 및 사운드 알림 설정",
    secFilterDisplay: "스크리너 종목 필터 조건",
    secFilterAlert: "사운드 알림 발생 조건",
    lblMinProb: "최소 발생 확률 (0 - 99)",
    lblMinImpact: "최소 파괴력 배수 (0 - 99)",
    lblMaxCost: "최대 돌파 소요 자금 (USDT)",
    lblMinVol: "최소 24H 거래대금 (USDT)",
    lblMaxDistance: "라인까지 최대 거리 (%)",
    lblAlertMinProb: "음성 알림: 최소 확률",
    lblAlertMaxCost: "음성 알림: 최대 소요 자금 ($USDT)",
    btnApply: "설정 저장 및 적용",
    btnReset: "기본값 초기화",

    statMonitored: "모니터링 종목 수",
    statMonitoredSub: "MEXC 현물 알트코인 (거래대금 2만~250만$)",
    statHighAlert: "고위험·고확률 시그널",
    statHighAlertSub: "발생 확률 > 75% | 지지/저항선 취약",
    statMinTrigger: "최소 돌파 필요 자금",
    statMinTriggerSub: "라인을 뚫는 데 필요한 시장가 체결 금액",
    statImbalance: "평균 호가 불균형",
    statImbalanceSub: "매수잔량 vs 매도잔량 (±3% 깊이)",

    tabAll: "전체 기회 순위",
    tabAllDesc: "상하방 구조적 왜곡이 가장 큰 종목 통합 랭킹",
    tabAvalanche: "롱 스탑로스 폭락 (하락 눈사태)",
    tabAvalancheDesc: "매수벽이 얇아 지지선 붕괴 시 투매 연쇄가 발생하는 종목",
    tabSqueeze: "숏 스퀴즈 급등 (상승 돌파)",
    tabSqueezeDesc: "매도벽이 얇아 적은 매수세로도 천장 돌파 및 급등이 가능한 종목",

    searchPlaceholder: "종목 검색 (예: PEPE, SOL, KAVA)...",
    sortLabel: "정렬:",
    sortProb: "발생 확률순",
    sortImpact: "파괴력순",
    sortCost: "필요 자금 최저순",
    sortDistance: "라인 최접근순",
    sortVolume: "24H 거래대금순",
    viewCards: "카드 뷰",
    viewTable: "스크리너 표",

    loadingTitle: "MEXC 호가 데이터 분석 중...",
    loadingDesc: "전체 종목의 누적 호가 잔량 및 스윙 레벨을 실시간 계산 중입니다",
    noData: "조건에 부합하는 종목이 없습니다.",
    loadMore: "더 보기 (남은 {count}개)",

    directionLong: "롱 손절 연쇄",
    directionShort: "숏 스퀴즈 돌파",
    labelCostDown: "지지선 돌파 필요 매도액",
    labelCostUp: "저항선 돌파 필요 매수액",
    distance: "거리",
    targetPrice: "목표 레벨",
    vol24h: "24H 거래대금",
    imbalance3pct: "호가 불균형 (±3%)",
    tradeOnMexc: "MEXC에서 거래",
    probScore: "확률",
    impactScore: "위력",
    action: "작업",
    symbol: "종목",
    price: "현재가",
    change24h: "24H 변동률",

    descDown: "시장가 매도 {cost}로 지지선(${price}) 관통 시 롱 손절 연쇄 폭락",
    descUp: "시장가 매수 {cost}로 저항선(${price}) 돌파 시 숏 청산 유발 급등",

    modalTitle: "시스템 산출 공식 및 사양",
    modalClose: "닫기",
    sec1Title: "1. 손절 밀집 라인 (P_stop) 정의",
    sec1Text: "일반 참여자들의 스탑로스는 직전 24시간 스윙 지지/저항선 바로 바깥에 집중됩니다.",
    sec2Title: "2. 누적 호가 돌파 비용 (Trigger Cost)",
    sec2Text: "현재가부터 손절 라인까지 깔려 있는 실제 잔량 금액을 누적 합산하여 실질적인 필요 자금을 산출합니다.",
    sec3Title: "3. 확률 및 파괴력 이중 평가 모델",
    sec3Text: "• 발생 확률 (0-99): 라인과의 거리, 소요 자금의 적음, 호가 불균형 종합.\n• 파괴력 (0-99): 24시간 거래대금 대비 호가벽 두께를 비교해 유동성 트랩의 폭발성을 평가.",
    sec4Title: "면책 사항",
    sec4Text: "본 터미널의 모든 데이터는 MEXC 공개 API로부터 기계적으로 분석한 객관적 지표이며, 투자 권유가 아닙니다.",

    // MEXC Smart Gateway Modal
    gatewayTitle: "MEXC에서 {symbol} 거래",
    gatewayDesc: "공식 MEXC 거래 계정을 이미 보유하고 계신가요?",
    gatewayRegister: "신규 가입: 회원가입 (영구 수수료 할인: 3tZTP)",
    gatewayTrade: "기존 계정으로 거래 화면 이동",
    gatewayRemember: "다음에는 이 안내를 건너뛰고 바로 거래 화면으로 이동"
  },
  es: {
    appTitle: "Terminal de Liquidez MEXC",
    appSubtitle: "Radar de Libro de Órdenes y Caza de Liquidaciones",
    marketLive: "FEED EN VIVO MEXC",
    lastSync: "Actualizado: {time}",
    syncing: "Escaneando...",
    btnRefresh: "Escanear Mercado",
    btnMethodology: "Metodología y Fórmulas",
    navRegisterBtn: "Registrarse en MEXC (Código: 3tZTP)",
    btnSettings: "Filtros y Alertas",
    settingsTitle: "Configuración de Filtros y Alertas",
    secFilterDisplay: "Criterios de Visualización del Screener",
    secFilterAlert: "Criterios de Alerta Sonora",
    lblMinProb: "Puntaje Mínimo de Probabilidad (0 - 99)",
    lblMinImpact: "Multiplicador de Impacto Mínimo (0 - 99)",
    lblMaxCost: "Capital Máximo de Disparo (USDT)",
    lblMinVol: "Volumen Mínimo 24h (USDT)",
    lblMaxDistance: "Distancia Máxima al Nivel (%)",
    lblAlertMinProb: "Alerta Sonora: Probabilidad Mínima",
    lblAlertMaxCost: "Alerta Sonora: Capital Máximo ($USDT)",
    btnApply: "Guardar y Aplicar Filtros",
    btnReset: "Restablecer Valores",

    statMonitored: "Pares Monitoreados",
    statMonitoredSub: "Altcoins Activas MEXC (Volumen $20k-$2.5M)",
    statHighAlert: "Alerta Alta de Ruptura",
    statHighAlertSub: "Probabilidad > 75% | Niveles Frágiles",
    statMinTrigger: "Capital de Ruptura Mínimo",
    statMinTriggerSub: "Costo para perforar soporte o resistencia",
    statImbalance: "Desequilibrio Promedio",
    statImbalanceSub: "Volumen Compra vs Venta (Profundidad ±3%)",

    tabAll: "Todas las Oportunidades",
    tabAllDesc: "Clasificación unificada de las mayores anomalías estructurales",
    tabAvalanche: "Cascadas de Liquidación Long",
    tabAvalancheDesc: "Libros de compra delgados al borde de colapso",
    tabSqueeze: "Rupturas por Short Squeeze",
    tabSqueezeDesc: "Libros de venta evaporados vulnerables a subidas explosivas",

    searchPlaceholder: "Buscar par (ej. PEPE, SOL, KAVA)...",
    sortLabel: "Ordenar:",
    sortProb: "Probabilidad",
    sortImpact: "Multiplicador de Impacto",
    sortCost: "Costo Mínimo de Disparo",
    sortDistance: "Distancia al Nivel",
    sortVolume: "Volumen 24h",
    viewCards: "Vista Cuadrícula",
    viewTable: "Tabla Screener",

    loadingTitle: "Analizando libros de órdenes MEXC...",
    loadingDesc: "Calculando profundidad acumulada y niveles clave en tiempo real",
    noData: "No se encontraron pares coincidentes.",
    loadMore: "Cargar más ({count} restantes)",

    directionLong: "CASCADA LONG",
    directionShort: "SHORT SQUEEZE",
    labelCostDown: "Costo Venta para Romper Soporte",
    labelCostUp: "Costo Compra para Perforar Resistencia",
    distance: "Distancia",
    targetPrice: "Nivel de Disparo",
    vol24h: "Volumen 24h",
    imbalance3pct: "Desequilibrio (±3%)",
    tradeOnMexc: "Operar en MEXC",
    probScore: "Probabilidad",
    impactScore: "Impacto",
    action: "Acción",
    symbol: "Símbolo",
    price: "Precio",
    change24h: "Cambio 24h",

    descDown: "Venta de {cost} perfora soporte (${price}) detonando stop losses long",
    descUp: "Compra de {cost} rompe resistencia (${price}) forzando liquidaciones short",

    modalTitle: "Metodología y Especificaciones de Cálculo",
    modalClose: "Cerrar",
    sec1Title: "1. Zona de Concentración de Stop Loss (P_stop)",
    sec1Text: "Las órdenes de stop loss se concentran justo detrás de los niveles de soporte/resistencia de 24 horas.",
    sec2Title: "2. Costo Acumulado de Disparo (Trigger Cost)",
    sec2Text: "Suma las órdenes limitadas reales hasta el nivel objetivo para medir el capital neto requerido.",
    sec3Title: "3. Modelo de Evaluación Dual",
    sec3Text: "• Probabilidad (0-99): Proximidad, bajo costo y asimetría del libro.\n• Impacto (0-99): Relación entre volumen 24h y profundidad de la pared de órdenes.",
    sec4Title: "Aviso Legal",
    sec4Text: "Datos analizados objetivamente desde la API pública de MEXC. No constituye asesoramiento financiero.",

    // MEXC Smart Gateway Modal
    gatewayTitle: "Operar {symbol} en MEXC",
    gatewayDesc: "¿Ya tienes una cuenta oficial de trading en MEXC?",
    gatewayRegister: "Nuevo usuario: Regístrate (Descuento permanente de comisiones: 3tZTP)",
    gatewayTrade: "Usuario existente: Ir directamente al gráfico",
    gatewayRemember: "Recordar mi elección y omitir este diálogo la próxima vez"
  },
  vi: {
    appTitle: "Terminal Thanh Khoản MEXC",
    appSubtitle: "Radar Sổ Lệnh & Săn Thanh Lý Altcoin",
    marketLive: "DỮ LIỆU MEXC TRỰC TIẾP",
    lastSync: "Cập nhật: {time}",
    syncing: "Đang quét...",
    btnRefresh: "Quét Thị Trường",
    btnMethodology: "Phương Pháp & Công Thức",
    navRegisterBtn: "Đăng ký MEXC (Mã: 3tZTP)",
    btnSettings: "Cài Đặt Bộ Lọc & Cảnh Báo",
    settingsTitle: "Tùy Chỉnh Tiêu Chuẩn Bộ Lọc & Chuông Báo",
    secFilterDisplay: "Tiêu Chuẩn Hiển Thị Screener",
    secFilterAlert: "Tiêu Chuẩn Kích Hoạt Âm Báo",
    lblMinProb: "Điểm Xác Suất Tối Thiểu (0 - 99)",
    lblMinImpact: "Hệ Số Tác Động Tối Thiểu (0 - 99)",
    lblMaxCost: "Vốn Kích Hoạt Tối Đa (USDT)",
    lblMinVol: "Khối Lượng 24h Tối Thiểu (USDT)",
    lblMaxDistance: "Khoảng Cách Tối Đa Đến Ngưỡng (%)",
    lblAlertMinProb: "Chuông Báo: Điểm Xác Suất Tối Thiểu",
    lblAlertMaxCost: "Chuông Báo: Vốn Kích Hoạt Tối Đa ($USDT)",
    btnApply: "Lưu & Áp Dụng Bộ Lọc",
    btnReset: "Đặt Lại Mặc Định",

    statMonitored: "Cặp Theo Dõi",
    statMonitoredSub: "Altcoin MEXC Sôi Động (Khối Lượng $20k-$2.5M)",
    statHighAlert: "Cảnh Báo Phá Vỡ Cao",
    statHighAlertSub: "Xác Suất > 75% | Ngưỡng Rất Mỏng",
    statMinTrigger: "Vốn Phá Vỡ Nhỏ Nhất",
    statMinTriggerSub: "Chi phí để đâm thủng hỗ trợ hoặc kháng cự",
    statImbalance: "Chênh Lệch Sổ Lệnh TB",
    statImbalanceSub: "Lệnh Mua vs Bán (Độ sâu ±3%)",

    tabAll: "Tất Cả Cơ Hội",
    tabAllDesc: "Xếp hạng tổng hợp các điểm mất cân bằng cấu trúc sổ lệnh",
    tabAvalanche: "Thanh Lý Long Đổ Vỡ",
    tabAvalancheDesc: "Tường mua cực mỏng có nguy cơ sập qua hỗ trợ",
    tabSqueeze: "Bùng Nổ Short Squeeze",
    tabSqueezeDesc: "Tường bán cạn kiệt dễ bùng nổ khi có lực mua nhỏ",

    searchPlaceholder: "Tìm kiếm mã (ví dụ: PEPE, SOL, KAVA)...",
    sortLabel: "Sắp xếp:",
    sortProb: "Xác Suất",
    sortImpact: "Sức Tác Động",
    sortCost: "Vốn Kích Hoạt Thấp Nhất",
    sortDistance: "Gần Ngưỡng Nhất",
    sortVolume: "Khối Lượng 24h",
    viewCards: "Dạng Thẻ",
    viewTable: "Bảng Screener",

    loadingTitle: "Đang phân tích sổ lệnh MEXC...",
    loadingDesc: "Tính toán độ sâu tích lũy và các ngưỡng kỹ thuật thời gian thực",
    noData: "Không tìm thấy cặp thỏa mãn điều kiện lọc.",
    loadMore: "Tải thêm ({count} cặp còn lại)",

    directionLong: "SẬP LONG",
    directionShort: "BÙNG NỔ SHORT",
    labelCostDown: "Chi Phí Bán Phá Hỗ Trợ",
    labelCostUp: "Chi Phí Mua Phá Kháng Cự",
    distance: "Khoảng cách",
    targetPrice: "Mức Kích Hoạt",
    vol24h: "Khối lượng 24h",
    imbalance3pct: "Lệch sổ lệnh (±3%)",
    tradeOnMexc: "Giao dịch trên MEXC",
    probScore: "Xác Suất",
    impactScore: "Uy Lực",
    action: "Thao tác",
    symbol: "Mã",
    price: "Giá",
    change24h: "Biến động 24h",

    descDown: "Lệnh bán thị trường {cost} sẽ phá vỡ hỗ trợ (${price}) kích hoạt chuỗi cắt lỗ Long",
    descUp: "Lệnh mua thị trường {cost} sẽ đục thủng kháng cự (${price}) ép thanh lý Short bùng nổ",

    modalTitle: "Quy Chuẩn & Công Thức Tính Toán",
    modalClose: "Đóng",
    sec1Title: "1. Vùng Tập Trung Dừng Lỗ (P_stop)",
    sec1Text: "Lệnh dừng lỗ của các nhà giao dịch thường tập trung ngay phía ngoài các mức đỉnh/đáy 24h gần nhất.",
    sec2Title: "2. Chi Phí Kích Hoạt Tích Lũy (Trigger Cost)",
    sec2Text: "Tính tổng vốn các lệnh chờ thực tế từ giá hiện tại đến ngưỡng mục tiêu để đo lường vốn cần thiết.",
    sec3Title: "3. Mô Hình Đánh Giá Kép",
    sec3Text: "• Điểm xác suất (0-99): Gần ngưỡng, vốn kích hoạt nhỏ và chênh lệch sổ lệnh.\n• Điểm tác động (0-99): So sánh khối lượng 24h với độ mỏng của tường lệnh để đo độ nén thanh khoản.",
    sec4Title: "Cảnh Báo Rủi Ro",
    sec4Text: "Dữ liệu được tính toán khách quan từ API công khai của MEXC. Không cấu thành lời khuyên đầu tư.",

    // MEXC Smart Gateway Modal
    gatewayTitle: "Giao dịch {symbol} trên MEXC",
    gatewayDesc: "Bạn đã có tài khoản giao dịch chính thức trên MEXC chưa?",
    gatewayRegister: "Người dùng mới: Đăng ký ngay (Giảm phí vĩnh viễn: 3tZTP)",
    gatewayTrade: "Người dùng cũ: Đi thẳng đến biểu đồ giao dịch",
    gatewayRemember: "Nhớ lựa chọn của tôi và bỏ qua hộp thoại này lần sau"
  }
};

// 当前语言状态（默认英文 en）
let currentLang = localStorage.getItem("mexc_terminal_lang") || "en";
if (!TRANSLATIONS[currentLang]) {
  currentLang = "en";
}

// 国际化文本获取函数
function t(key, params = {}) {
  const langDict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  let text = langDict[key] || TRANSLATIONS.en[key] || key;
  for (const [paramKey, paramVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), paramVal);
  }
  return text;
}

// 切换语言并更新界面
function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem("mexc_terminal_lang", lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();

  // 触发页面重新渲染（若 app.js 已加载）
  if (typeof window.onLanguageChange === "function") {
    window.onLanguageChange(lang);
  }
}

// 应用所有 data-i18n 属性的静态文本
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.setAttribute("placeholder", t(key));
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) {
      el.setAttribute("title", t(key));
    }
  });

  // 更新语言下拉框的值
  const langSelect = document.getElementById("lang-select");
  if (langSelect && langSelect.value !== currentLang) {
    langSelect.value = currentLang;
  }
}

// DOM 加载完成时初始化
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = currentLang;
  applyStaticTranslations();

  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }
});
