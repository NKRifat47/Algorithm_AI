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

router.post(
  "/:id/pdf",
  checkAuthMiddleware("USER"),
  NewTaskController.generateTaskPdf,
);

router.get(
  "/:id/pdf/download",
  checkAuthMiddleware("USER"),
  NewTaskController.downloadTaskPdf,
);

router.post(
  "/:id/codebase",
  checkAuthMiddleware("USER"),
  NewTaskController.generateTaskCodebaseZip,
);

router.get(
  "/:id/codebase/download",
  checkAuthMiddleware("USER"),
  NewTaskController.downloadTaskCodebaseZip,
);

router.post(
  "/create",
  checkAuthMiddleware("USER"),
  validateRequest(NewTaskValidation.createTaskSchema),
  NewTaskController.createNewTask,
);

export const NewTaskRouter = router;
