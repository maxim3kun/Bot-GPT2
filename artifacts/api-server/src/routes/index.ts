import { Router, type IRouter } from "express";
import healthRouter  from "./health.js";
import sunoRouter    from "./suno.js";
import statsRouter   from "./stats.js";
import authRouter    from "./auth.js";
import featuresRouter from "./features.js";
import guildsRouter  from "./guilds.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sunoRouter);
router.use(statsRouter);
router.use(authRouter);
router.use(featuresRouter);
router.use(guildsRouter);

export default router;
