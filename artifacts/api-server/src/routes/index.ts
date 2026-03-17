import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resourcesRouter from "./resources";
import categoriesRouter from "./categories";
import mapsRouter from "./maps";
import stratigraphicRouter from "./stratigraphic";
import statsRouter from "./stats";
import authRouter from "./auth";
import mapLayersRouter from "./map-layers";
import mapImagesRouter from "./map-images";
import adminRouter from "./admin";
import geoModelsRouter from "./geo-models";
import siteContentRouter from "./site-content";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(mapLayersRouter);
router.use(mapImagesRouter);
router.use(resourcesRouter);
router.use(categoriesRouter);
router.use(mapsRouter);
router.use(stratigraphicRouter);
router.use(statsRouter);
router.use(geoModelsRouter);
router.use(siteContentRouter);
router.use(stripeRouter);

export default router;
