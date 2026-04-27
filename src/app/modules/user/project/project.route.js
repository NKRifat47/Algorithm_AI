import { Router } from "express";
import { ProjectController } from "./project.controller.js";
import { ProjectValidation } from "./project.validation.js";
import validateRequest from "../../../middleware/validateRequest.js";
import { checkAuthMiddleware } from "../../../middleware/checkAuthMiddleware.js";

const router = Router();

router.get("/", checkAuthMiddleware("USER"), ProjectController.getAllProjects);

router.post(
  "/create",
  checkAuthMiddleware("USER"),
  validateRequest(ProjectValidation.createProjectSchema),
  ProjectController.createProject,
);

router.get(
  "/:id",
  checkAuthMiddleware("USER"),
  ProjectController.getProjectById,
);

router.post(
  "/:id/tasks/create",
  checkAuthMiddleware("USER"),
  validateRequest(ProjectValidation.createTaskSchema),
  ProjectController.createTask,
);

export const ProjectRouter = router;
