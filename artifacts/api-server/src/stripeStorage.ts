import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export class StripeStorage {
  async listProductsWithPrices(active = true) {
    const result = await db.execute(sql`
      WITH active_products AS (
        SELECT id, name, description, metadata, active
        FROM stripe.products
        WHERE active = ${active}
        ORDER BY name
      )
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.active AS product_active,
        p.metadata AS product_metadata,
        pr.id AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring,
        pr.active AS price_active
      FROM active_products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.name, pr.unit_amount
    `);
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`,
    );
    return result.rows[0] ?? null;
  }
}

export const stripeStorage = new StripeStorage();
