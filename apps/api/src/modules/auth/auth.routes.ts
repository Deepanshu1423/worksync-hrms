import { Router } from "express";
import { loginController, getCurrentUserController } from "./auth.controller";
import { authenticateUser } from "../../middleware/auth.middleware";

const router = Router();

router.post("/login", loginController);

router.get("/me", authenticateUser, getCurrentUserController);

export default router;