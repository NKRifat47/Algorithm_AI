import { Router } from "express";
import { NewTaskController } from "./new_task.controller.js";
import { NewTaskValidation } from "./new_task.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("USER"), NewTaskController.getNewTaskData);

router.get("/:id", checkAuthMiddleware("USER"), NewTaskController.getTaskById);

router.get(
  "/project/:id",
  checkAuthMiddleware("USER"),
  NewTaskController.getProjectById,
);

router.post(
  "/:id/continue",
  checkAuthMiddleware("USER"),
  NewTaskController.continueTask,
);

router.post(
  "/create",
  checkAuthMiddleware("USER"),
  validateRequest(NewTaskValidation.createTaskSchema),
  NewTaskController.createNewTask,
);

export const NewTaskRouter = router;
