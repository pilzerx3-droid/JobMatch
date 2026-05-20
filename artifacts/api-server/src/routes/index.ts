import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import savedJobsRouter from "./savedJobs";
import adminRouter from "./admin";
import employerRouter from "./employer";
import stripeRouter from "./stripe";
import anthropicRouter from "./anthropic/index";
import applicationsRouter from "./applications";
import storageRouter from "./storage";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/users", usersRouter);
router.use("/users/me/documents", documentsRouter);
router.use("/jobs", jobsRouter);
router.use("/saved-jobs", savedJobsRouter);
router.use("/admin", adminRouter);
router.use("/employer", employerRouter);
router.use("/stripe", stripeRouter);
router.use("/anthropic", anthropicRouter);
router.use("/applications", applicationsRouter);

export default router;
