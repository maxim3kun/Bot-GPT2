import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sunoRouter from "./suno";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sunoRouter);
router.use(statsRouter);

export default router;
