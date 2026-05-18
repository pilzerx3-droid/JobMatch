import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import jobsRouter from "./jobs";
import savedJobsRouter from "./savedJobs";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/jobs", jobsRouter);
router.use("/saved-jobs", savedJobsRouter);
router.use("/admin", adminRouter);

export default router;
