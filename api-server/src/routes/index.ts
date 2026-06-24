import { Router, type IRouter } from "express";
import healthRouter from "./health";
import jobsRouter from "./jobs";
import settingsRouter from "./settings";
import resumeRouter from "./resume";
import runsRouter from "./runs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(jobsRouter);
router.use(settingsRouter);
router.use(resumeRouter);
router.use(runsRouter);

export default router;
