const BASE = "/images/products";

// Used when a product has no image_url of its own
const CATEGORY_IMAGES = {
  vegetables: `${BASE}/vegetables.svg`,
  fruits: `${BASE}/oranges.webp`,
  rice_grains: `${BASE}/rice.svg`,
  flour: `${BASE}/maize-flour.svg`,
  cooking_oil: `${BASE}/cooking-oil.svg`,
  sugar: `${BASE}/sugar.svg`,
  pulses: `${BASE}/beans.svg`,
  dairy_eggs: `${BASE}/milk.svg`,
};

export function productImage(product) {
  return (
    product?.image_url ||
    CATEGORY_IMAGES[product?.category] ||
    `${BASE}/vegetables.svg`
  );
}
