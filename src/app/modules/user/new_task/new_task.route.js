import { Router } from "express";
import { NewTaskController } from "./new_task.controller.js";
import { NewTaskValidation } from "./new_task.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("USER"), NewTaskController.getNewTaskData);

router.get("/:id", checkAuthMiddleware("USER"), NewTaskController.getTaskById);

router.post(
  "/:id/continue",
  checkAuthMiddleware("USER"),
  NewTaskController.continueTask,
);

// Generate PDF only when user requests it
router.post(
  "/:id/pdf",
  checkAuthMiddleware("USER"),
  NewTaskController.generateTaskPdf,
);

// Download the generated PDF
router.get(
  "/:id/pdf/download",
  checkAuthMiddleware("USER"),
  NewTaskController.downloadTaskPdf,
);

router.post(
  "/create",
  checkAuthMiddleware("USER"),
  validateRequest(NewTaskValidation.createTaskSchema),
  NewTaskController.createNewTask,
);

export const NewTaskRouter = router;
