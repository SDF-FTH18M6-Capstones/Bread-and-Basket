const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

// Deadlines are set relative to now so "days left" always looks right.
const inHours = (hours) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

const RAW = [
  {
    id: 1,
    title: "Rice November Drive",
    price: 130,
    min: 20,
    max: 200,
    ordered: 36,
    households: 4,
    hours: 62,
    product: {
      id: 1,
      name: "Pishori rice",
      unit: "1kg",
      category: "rice_grains",
      retail_price: 170,
    },
  },
  {
    id: 2,
    title: "Tomato Crate Share",
    price: 450,
    min: 15,
    max: 40,
    ordered: 12,
    households: 5,
    hours: 30,
    product: {
      id: 13,
      name: "Tomatoes",
      unit: "5kg crate",
      category: "vegetables",
      retail_price: 600,
    },
  },
  {
    id: 3,
    title: "Maize Flour Bulk",
    price: 150,
    min: 30,
    max: 150,
    ordered: 18,
    households: 6,
    hours: 96,
    product: {
      id: 4,
      name: "Maize flour",
      unit: "2kg",
      category: "flour",
      retail_price: 190,
    },
  },
  {
    id: 4,
    title: "Cooking Oil Share",
    price: 820,
    min: 25,
    max: 100,
    ordered: 100,
    households: 14,
    hours: 120,
    product: {
      id: 6,
      name: "Cooking oil",
      unit: "3L",
      category: "cooking_oil",
      retail_price: 980,
    },
  },
  {
    id: 5,
    title: "Sugar Weekly Drive",
    price: 270,
    min: 40,
    max: 200,
    ordered: 77,
    households: 11,
    hours: 150,
    product: {
      id: 8,
      name: "Sugar",
      unit: "2kg",
      category: "sugar",
      retail_price: 330,
    },
  },
  {
    id: 6,
    title: "Green Grams Share",
    price: 175,
    min: 20,
    max: 120,
    ordered: 9,
    households: 3,
    hours: 200,
    product: {
      id: 10,
      name: "Green grams",
      unit: "1kg",
      category: "pulses",
      retail_price: 220,
    },
  },
  {
    id: 7,
    title: "Egg Tray Drive",
    price: 440,
    min: 20,
    max: 80,
    ordered: 27,
    households: 8,
    hours: 20,
    product: {
      id: 11,
      name: "Eggs",
      unit: "Tray of 30",
      category: "dairy_eggs",
      retail_price: 520,
    },
  },
  {
    id: 8,
    title: "Banana Bunch Share",
    price: 190,
    min: 12,
    max: 60,
    ordered: 5,
    households: 2,
    hours: 70,
    product: {
      id: 12,
      name: "Ripe bananas",
      unit: "1 bunch",
      category: "fruits",
      retail_price: 250,
    },
  },
];

function build(r) {
  return {
    id: r.id,
    title: r.title,
    status: "active",
    campaign_price: r.price,
    min_quantity: r.min,
    max_quantity: r.max,
    deadline: inHours(r.hours),
    ordered_quantity: r.ordered,
    households: r.households,
    min_reached: r.ordered >= r.min,
    sold_out: r.ordered >= r.max,
    savings_per_unit: r.product.retail_price - r.price,
    product: { image_url: null, ...r.product },
  };
}

export async function listCampaigns(filters = {}) {
  await wait();

  let campaigns = RAW.map(build).sort(
    (a, b) => new Date(a.deadline) - new Date(b.deadline),
  );

  // Search campaign titles and product names.
  if (filters.q?.trim()) {
    const query = filters.q.trim().toLowerCase();

    campaigns = campaigns.filter(
      (campaign) =>
        campaign.title.toLowerCase().includes(query) ||
        campaign.product.name.toLowerCase().includes(query),
    );
  }

  // Filter by product category.
  if (filters.category) {
    campaigns = campaigns.filter(
      (campaign) => campaign.product.category === filters.category,
    );
  }

  // Match the backend: campaigns closing within 48 hours.
  if (filters.filter === "ending_soon") {
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    campaigns = campaigns.filter((campaign) => {
      const remaining = new Date(campaign.deadline).getTime() - now;

      return remaining > 0 && remaining <= fortyEightHours;
    });
  }

  // Campaigns that have not yet reached their minimum quantity.
  if (filters.filter === "almost_unlocked") {
    campaigns = campaigns.filter((campaign) => !campaign.min_reached);
  }

  return campaigns;
}
