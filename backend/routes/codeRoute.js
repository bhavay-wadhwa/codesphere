import { Router } from "express";
import { appAuthMiddleware } from "../middlewares/auth.middleware.js";
import { getCode, getRemoteCode, compileCode, compileStatus } from "../controllers/codeController.js";

const router = Router();

router.post("/getCode", appAuthMiddleware, getCode);
router.post("/getRemoteCode", appAuthMiddleware, getRemoteCode);
router.post("/compile", compileCode);
router.get("/status", compileStatus);

export default router;