import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import savedJobsRouter from "./savedJobs";
import adminRouter from "./admin";
import employerRouter from "./employer";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/saved-jobs", savedJobsRouter);
router.use("/admin", adminRouter);
router.use("/employer", employerRouter);
router.use("/stripe", stripeRouter);

export default router;
