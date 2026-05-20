import cron from "node-cron";
import { syncFromRemotive } from "./syncJobs";
import { logger } from "../lib/logger";

export function startScheduler(): void {
  // Run full job sync every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    logger.info("Scheduled job sync starting...");
    try {
      const result = await syncFromRemotive(500, true);
      logger.info({ imported: result.imported, skipped: result.skipped }, "Scheduled job sync completed");
    } catch (err) {
      logger.error({ err }, "Scheduled job sync failed");
    }
  });

  logger.info("Job sync scheduler started — runs every 6 hours");
}
