import { Router, type IRouter } from "express";
import { stripeStorage } from "../stripeStorage";
import { getUncachableStripeClient } from "../stripeClient";
import { requireAuth } from "../middlewares/requireAuth";
import type { AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/stripe/products — list job-post products with prices
router.get("/products", async (_req, res, next) => {
  try {
    const rows = await stripeStorage.listProductsWithPrices();

    const map = new Map<string, { id: string; name: string; description: string; prices: any[] }>();
    for (const row of rows) {
      const pid = row.product_id as string;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: row.product_name as string,
          description: (row.product_description as string) ?? "",
          prices: [],
        });
      }
      if (row.price_id) {
        map.get(pid)!.prices.push({
          id: row.price_id,
          unitAmount: row.unit_amount,
          currency: row.currency,
          recurring: row.recurring,
        });
      }
    }

    res.json({ products: Array.from(map.values()) });
  } catch (err: unknown) {
    // Stripe schema not yet initialised (integration not connected)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("stripe") || msg.includes("schema")) {
      res.json({ products: [] });
      return;
    }
    next(err);
  }
});

// POST /api/stripe/checkout — create a Stripe Checkout session for job posting
router.post("/checkout", requireAuth, async (req, res, next) => {
  try {
    const { userProfile } = req as unknown as AuthRequest;
    const { priceId, jobId } = req.body as { priceId: string; jobId?: number };

    if (!priceId) {
      res.status(400).json({ error: "priceId is required" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: String(userProfile.id),
        clerkId: userProfile.clerkId,
        ...(jobId ? { jobId: String(jobId) } : {}),
      },
      success_url: `${baseUrl}/employer-dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/post-job?payment=cancelled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

export default router;
