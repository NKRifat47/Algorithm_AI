import { Router } from "express";
import { NewTaskController } from "./new_task.controller.js";
import { NewTaskValidation } from "./new_task.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

// POST /api/user/new-task/create
// User sends a prompt → AI responds → saved to DB
router.post(
  "/create",
  checkAuthMiddleware("USER"),
  validateRequest(NewTaskValidation.createTaskSchema),
  NewTaskController.createNewTask,
);

export const NewTaskRouter = router;
