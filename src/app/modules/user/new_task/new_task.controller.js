import { NewTaskService } from "./new_task.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";

const createNewTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, projectId, title } = req.body;

    const result = await NewTaskService.handleNewTask(userId, {
      prompt,
      projectId,
      title,
    });

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Task created and AI responded successfully",
      data: {
        taskId: result.id,
        status: result.status,
        prompt: result.prompt,
        aiResponse: result.content,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error("createNewTask error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process task",
    });
  }
};

export const NewTaskController = {
  createNewTask,
};
