import { Router } from "express";
import { appAuthMiddleware } from "../middlewares/auth.middleware.js";
import { getCode } from "../controllers/codeController.js";
import { getRemoteCode } from "../controllers/codeController.js";

const router = Router();

router.post("/getCode", appAuthMiddleware, getCode);
router.post("/getRemoteCode", appAuthMiddleware, getRemoteCode);

export default router;