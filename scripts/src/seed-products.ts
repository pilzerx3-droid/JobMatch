import { getUncachableStripeClient } from "./stripeClient";

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Checking for existing SwipeJobs products...");

  const existing = await stripe.products.search({
    query: "name:'Job Post — Standard' AND active:'true'",
  });

  if (existing.data.length > 0) {
    console.log("Products already exist. Skipping creation.");
    console.log("Existing product ID:", existing.data[0].id);
    return;
  }

  console.log("Creating SwipeJobs products...");

  // Standard job post — one-time $49
  const standard = await stripe.products.create({
    name: "Job Post — Standard",
    description: "Post a job for 30 days. Visible to all SwipeJobs candidates.",
    metadata: { tier: "standard", durationDays: "30" },
  });

  const standardPrice = await stripe.prices.create({
    product: standard.id,
    unit_amount: 4900, // $49.00
    currency: "usd",
  });

  console.log(`Created: ${standard.name} (${standard.id}) — price ${standardPrice.id}`);

  // Featured job post — one-time $99
  const featured = await stripe.products.create({
    name: "Job Post — Featured",
    description: "Post a featured job for 30 days. Shown at the top of the swipe feed.",
    metadata: { tier: "featured", durationDays: "30", featured: "true" },
  });

  const featuredPrice = await stripe.prices.create({
    product: featured.id,
    unit_amount: 9900, // $99.00
    currency: "usd",
  });

  console.log(`Created: ${featured.name} (${featured.id}) — price ${featuredPrice.id}`);

  console.log("\nProducts seeded successfully!");
  console.log("Webhooks will sync these to your database automatically.");
}

seedProducts().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
