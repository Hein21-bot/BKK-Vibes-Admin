// "Market Reference" sheet — example reseller listings observed by the user.
// Landed cost here uses simplified default assumptions:
//   (buyPrice + weight * 300) * 130   — no packaging / other cost.

export const DEFAULT_MARKET_REF = [
  { item: 'Cardigan', buyPriceTHB: 590, estWeightKg: 0.4, resellerPriceMMK: 98500, notes: 'Estimated weight' },
  { item: 'Dry Crew Neck T-Shirt', buyPriceTHB: 100, estWeightKg: 0.2, resellerPriceMMK: 25000, notes: 'Estimated weight' },
  { item: 'Women Jean Jacket', buyPriceTHB: 590, estWeightKg: 0.8, resellerPriceMMK: 140000, notes: 'Estimated weight' },
  { item: 'Women Mini T-Shirt', buyPriceTHB: 290, estWeightKg: 0.15, resellerPriceMMK: 53000, notes: 'Estimated weight' },
  { item: 'Kid T-Shirt', buyPriceTHB: 190, estWeightKg: 0.15, resellerPriceMMK: 37000, notes: 'Estimated weight' },
  { item: 'Bkk vibes Bra Top', buyPriceTHB: 390, estWeightKg: 0.2, resellerPriceMMK: 68900, notes: 'Estimated weight' },
  { item: 'Jacket', buyPriceTHB: 790, estWeightKg: 0.8, resellerPriceMMK: 139000, notes: 'Estimated weight' },
];

export const MARKET_REF_FX = 130;
export const MARKET_REF_CARGO = 300;

export function marketRefLandedCost(buyPriceTHB, weightKg) {
  return (buyPriceTHB + weightKg * MARKET_REF_CARGO) * MARKET_REF_FX;
}

export function marketRefMarkup(item) {
  const landed = marketRefLandedCost(item.buyPriceTHB, item.estWeightKg);
  return landed > 0 ? (item.resellerPriceMMK - landed) / landed : 0;
}
