import { NewTaskService } from "./new_task.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";

const parseIfJsonString = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const first = trimmed[0];
  if (first !== "{" && first !== "[") return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const removeAiEnginePdfPath = (value) => {
  if (!value || typeof value !== "object") return value;

  // We don't want to expose the AI engine's internal file path.
  const cloned = structuredClone(value);
  if (cloned?.data?.result?.pdf_path) {
    delete cloned.data.result.pdf_path;
  }
  return cloned;
};

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
        aiResponse: removeAiEnginePdfPath(parseIfJsonString(result.content)),
        aiResponseRaw:
          typeof result.content === "string" ? result.content : null,
        responseType: NewTaskService.detectResponseType
          ? NewTaskService.detectResponseType(result.content)?.type
          : "text",
        pdf: {
          generated: false,
          generateUrl: `/api/user/new-task/${result.id}/pdf`,
          downloadUrl: `/api/user/new-task/${result.id}/pdf/download`,
        },
        codebase: {
          // frontend can show this button only when responseType === "codebase"
          generated: false,
          generateUrl: `/api/user/new-task/${result.id}/codebase`,
          downloadUrl: `/api/user/new-task/${result.id}/codebase/download`,
        },
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

const getNewTaskData = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await NewTaskService.getNewTaskData(userId);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getNewTaskData error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch dashboard data",
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await NewTaskService.getTaskById(userId, id);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Task fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getTaskById error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch task",
    });
  }
};

const continueTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const result = await NewTaskService.continueTask(userId, id, prompt);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "AI response received and conversation updated",
      data: {
        ...result,
        content: parseIfJsonString(result.content),
        contentRaw: typeof result.content === "string" ? result.content : null,
      },
    });
  } catch (error) {
    console.error("continueTask error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to continue conversation",
    });
  }
};

export const NewTaskController = {
  createNewTask,
  getNewTaskData,
  getTaskById,
  continueTask,
  generateTaskPdf: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const result = await NewTaskService.generateTaskPdf(userId, taskId);

      return res.status(httpStatus.OK).json({
        success: true,
        message: result.alreadyExisted
          ? "PDF already generated for this task"
          : "PDF generated successfully",
        data: {
          taskId,
          pdf: {
            path: result.pdfPath,
            downloadUrl: `/api/user/new-task/${taskId}/pdf/download`,
          },
        },
      });
    } catch (error) {
      console.error("generateTaskPdf error:", error);

      if (error instanceof DevBuildError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to generate PDF",
      });
    }
  },
  downloadTaskPdf: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const { absolutePdfPath } = await NewTaskService.getTaskPdfPath(
        userId,
        taskId,
      );

      return res.download(absolutePdfPath, `task-${taskId}.pdf`);
    } catch (error) {
      console.error("downloadTaskPdf error:", error);

      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "PDF not found",
      });
    }
  },
  generateTaskCodebaseZip: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const result = await NewTaskService.generateTaskCodebaseZip(
        userId,
        taskId,
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: result.alreadyExisted
          ? "Codebase ZIP already generated for this task"
          : "Codebase ZIP generated successfully",
        data: {
          taskId,
          filesCount: result.filesCount ?? null,
          codebase: {
            path: result.zipPath,
            downloadUrl: `/api/user/new-task/${taskId}/codebase/download`,
          },
        },
      });
    } catch (error) {
      console.error("generateTaskCodebaseZip error:", error);
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to generate codebase ZIP",
      });
    }
  },
  downloadTaskCodebaseZip: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const { absoluteZipPath } = await NewTaskService.getTaskCodebaseZipPath(
        userId,
        taskId,
      );

      return res.download(absoluteZipPath, `task-${taskId}-codebase.zip`);
    } catch (error) {
      console.error("downloadTaskCodebaseZip error:", error);

      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "ZIP not found",
      });
    }
  },
};
