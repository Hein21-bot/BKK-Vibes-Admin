// Core pricing math — a faithful port of the "Bkk vibes Preorder Price
// Calculator" spreadsheet (Thailand → Myanmar preorder reseller).
// Ported from the standalone uniqlo-calculator project (TS -> JS).

/** Business assumptions — shared by the single and batch calculators. */
export const DEFAULT_ASSUMPTIONS = {
  cargoRate: 300, // THB per kg
  fx: 133, // MMK per THB
  thLocalDelivery: 0, // THB
  paymentFee: 0, // THB
  packaging: 200, // MMK
  otherCost: 0, // MMK
  riskPct: 0.03, // fraction
  minProfit: 5000, // MMK per item
  roundTo: 500, // MMK — CEILING nearest
  lowDelta: 0.03, // fraction subtracted from base markup for LOW
  lowFloor: 0.05, // fraction — minimum LOW markup
  premiumDelta: 0.05, // fraction added to base markup for PREMIUM
};

export const DEFAULT_WEIGHT_PRESETS = [
  { category: 'T-shirt', weightKg: 0.2 },
  { category: 'Shirt', weightKg: 0.3 },
  { category: 'Pants', weightKg: 0.4 },
  { category: 'Dress', weightKg: 0.4 },
  { category: 'Hoodie', weightKg: 0.6 },
  { category: 'Sweater', weightKg: 0.5 },
  { category: 'Jacket', weightKg: 0.5 },
  { category: 'Heavy Jacket', weightKg: 0.7 },
  { category: 'Other', weightKg: 0.6 },
  { category: 'Underware', weightKg: 0.6 },
];

/** Weight used when a category has no preset (spreadsheet IFERROR fallback). */
export const FALLBACK_WEIGHT_KG = 0.3;

export const DEFAULT_TIERS = [
  { id: 't1', label: '≤ 20,000', min: 0, max: 20000, markup: 0.25, notes: 'Low-price items' },
  { id: 't2', label: '20,001 – 35,000', min: 20001, max: 35000, markup: 0.22, notes: '' },
  { id: 't3', label: '35,001 – 50,000', min: 35001, max: 50000, markup: 0.2, notes: 'Normal' },
  { id: 't4', label: '50,001 – 80,000', min: 50001, max: 80000, markup: 0.18, notes: 'Higher-price items' },
  { id: 't5', label: '80,001 – 120,000', min: 80001, max: 120000, markup: 0.15, notes: 'High-price items' },
  { id: 't6', label: '120,001+', min: 120001, max: 999999999, markup: 0.1, notes: 'Very high-price items' },
];

export function ceilingTo(value, step) {
  if (!step || step <= 0) return value;
  return Math.ceil(value / step) * step;
}

export function presetWeight(category, presets) {
  const hit = presets.find(
    (p) => p.category.trim().toLowerCase() === String(category).trim().toLowerCase(),
  );
  return hit ? hit.weightKg : FALLBACK_WEIGHT_KG;
}

/** Base markup % for a landed cost, matching the nested-IF tier lookup. */
export function baseMarkupFor(trueLandedMMK, tiers) {
  for (const t of tiers) {
    if (trueLandedMMK <= t.max) return t.markup;
  }
  return tiers.length ? tiers[tiers.length - 1].markup : 0;
}

/**
 * computeItem(input, assumptions, tiers)
 * input: { buyPriceTHB, weightKg, overrides?, marketPriceMMK? }
 */
export function computeItem(input, assumptions, tiers) {
  const a = { ...assumptions, ...(input.overrides ?? {}) };

  const cargoCostTHB = input.weightKg * a.cargoRate;
  const thTotalCostTHB = input.buyPriceTHB + cargoCostTHB + a.thLocalDelivery + a.paymentFee;
  const baseCostMMK = thTotalCostTHB * a.fx;
  const subtotalLandedMMK = baseCostMMK + a.packaging + a.otherCost;
  const riskAllowanceMMK = subtotalLandedMMK * a.riskPct;
  const trueLandedCostMMK = subtotalLandedMMK + riskAllowanceMMK;

  const baseMarkup = baseMarkupFor(trueLandedCostMMK, tiers);

  const markups = {
    LOW: Math.max(baseMarkup - a.lowDelta, a.lowFloor),
    NORMAL: baseMarkup,
    PREMIUM: baseMarkup + a.premiumDelta,
  };

  const mkRow = (tier) => {
    const markup = markups[tier];
    const profit = Math.max(trueLandedCostMMK * markup, a.minProfit);
    const sellingPrice = ceilingTo(trueLandedCostMMK + profit, a.roundTo);
    const grossMargin = sellingPrice > 0 ? profit / sellingPrice : 0;
    return { tier, markup, sellingPrice, profit, grossMargin };
  };

  const rows = { LOW: mkRow('LOW'), NORMAL: mkRow('NORMAL'), PREMIUM: mkRow('PREMIUM') };

  const market =
    input.marketPriceMMK != null && !Number.isNaN(input.marketPriceMMK)
      ? input.marketPriceMMK
      : null;

  return {
    cargoCostTHB,
    thTotalCostTHB,
    baseCostMMK,
    subtotalLandedMMK,
    riskAllowanceMMK,
    trueLandedCostMMK,
    baseMarkup,
    rows,
    marketComparison: {
      marketPriceMMK: market,
      normalVsMarketMMK: market != null ? rows.NORMAL.sellingPrice - market : null,
      verdict:
        market != null
          ? rows.NORMAL.sellingPrice <= market
            ? 'At / Below Market'
            : 'Above Market'
          : null,
    },
  };
}
