import axios from "axios";
import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const handleNewTask = async (userId, payload) => {
  const { prompt, projectId, title } = payload;

  // 1. Create the Task in DB
  const task = await prisma.task.create({
    data: {
      userId,
      projectId: projectId || null,
      title: title || prompt.substring(0, 50),
      prompt,
      status: "RUNNING",
    },
  });

  // 2. Create the initial user message (chat history)
  await prisma.message.create({
    data: {
      taskId: task.id,
      role: "user",
      content: prompt,
    },
  });

  try {
    // 2. Call teammate's AI Engine
    const aiEngineUrl = envVars.AI_ENGINE_URL || "http://localhost:8000";

    const response = await axios.post(`${aiEngineUrl}/api/generate`, {
      prompt,
    });

    const aiContent = response.data;

    // 3. Update Task with AI Content and status
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
        status: "COMPLETED",
      },
    });

    // 4. Create the final AI message (chat history)
    await prisma.message.create({
      data: {
        taskId: task.id,
        role: "assistant",
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
      },
    });

    return updatedTask;
  } catch (error) {
    console.error("AI Engine Error:", error.response?.data || error.message);

    // Update task to FAILED if AI call fails
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "FAILED" },
    });

    throw new Error(
      error.response?.data?.detail ||
        error.message ||
        "Failed to get response from AI Engine",
    );
  }
};

const getNewTaskData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      credits: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      status: true,
      prompt: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    profile: {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      avatar: user.avatar,
      credits: user.credits,
    },
    projects,
    tasks,
  };
};

const getTaskById = async (userId, taskId) => {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
};

const continueTask = async (userId, taskId, newPrompt) => {
  // 1. Validating the task exists and belongs to the user
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!existingTask) {
    throw new Error("Task not found or unauthorized");
  }

  // 2. Formatting the context for the AI Engine
  // Note: Existing messages are fetched in desc order, so we reverse it
  const contextHistory = existingTask.messages
    .reverse()
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
    )
    .join("\n");

  const combinedPrompt = `${contextHistory}\nUser: ${newPrompt}`;

  // 3. Updating task status to RUNNING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "RUNNING" },
  });

  // 4. Save the new user prompt as a Message
  await prisma.message.create({
    data: {
      taskId,
      role: "user",
      content: newPrompt,
    },
  });

  try {
    const aiEngineUrl = envVars.AI_ENGINE_URL || "http://localhost:8000";

    const response = await axios.post(`${aiEngineUrl}/api/generate`, {
      prompt: combinedPrompt,
    });

    const aiContent = response.data;

    // 5. Update Task with latest AI response and status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
        status: "COMPLETED",
      },
    });

    // 6. Save AI's response message
    await prisma.message.create({
      data: {
        taskId,
        role: "assistant",
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
      },
    });

    return updatedTask;
  } catch (error) {
    console.error(
      "AI Engine Error (Continue):",
      error.response?.data || error.message,
    );

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "FAILED" },
    });

    throw new Error(
      error.response?.data?.detail ||
        error.message ||
        "Failed to get response from AI Engine",
    );
  }
};

export const NewTaskService = {
  handleNewTask,
  getNewTaskData,
  getTaskById,
  continueTask,
  generateTaskPdf: async (userId, taskId) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error("Task not found or unauthorized");
    }

    if (!task.content) {
      throw new Error("Task has no AI content to export");
    }

    // If we already generated a PDF for this task, reuse it.
    const existingStep = await prisma.taskStep.findFirst({
      where: { taskId, stepName: "PDF_EXPORT" },
      orderBy: { createdAt: "desc" },
    });

    if (existingStep?.status === "COMPLETED" && existingStep.output) {
      const existingAbs = path.resolve(process.cwd(), existingStep.output);
      if (fs.existsSync(existingAbs)) {
        return {
          pdfPath: existingStep.output,
          alreadyExisted: true,
        };
      }
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "task-pdfs");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `task-${taskId}-${Date.now()}.pdf`;
    const relativePdfPath = path.join("uploads", "task-pdfs", fileName);
    const absolutePdfPath = path.join(uploadsDir, fileName);

    const extractText = (raw) => {
      if (typeof raw !== "string") return JSON.stringify(raw, null, 2);

      const trimmed = raw.trim();
      if (!trimmed) return "";

      try {
        const parsed = JSON.parse(trimmed);
        const output =
          parsed?.data?.result?.formatted_results?.[0]?.output ??
          parsed?.data?.result?.output ??
          parsed?.output;
        if (typeof output === "string" && output.trim()) return output;
        return JSON.stringify(parsed, null, 2);
      } catch {
        return raw;
      }
    };

    const pdfText = extractText(task.content);

    // Write PDF to disk
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const stream = fs.createWriteStream(absolutePdfPath);
      stream.on("finish", resolve);
      stream.on("error", reject);

      doc.pipe(stream);

      doc.fontSize(18).text(task.title || "AI Report", { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#666").text(`Task ID: ${task.id}`);
      doc.moveDown(0.25);
      doc.text(`Created: ${task.createdAt?.toISOString?.() ?? ""}`);
      doc.moveDown();

      doc.fillColor("#000").fontSize(12).text("Prompt", { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(11).text(task.prompt || "");
      doc.moveDown();

      doc.fontSize(12).text("Answer", { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(11).text(pdfText || "");

      doc.end();
    });

    // Save metadata linked to task without schema changes
    await prisma.taskStep.create({
      data: {
        taskId,
        stepName: "PDF_EXPORT",
        status: "COMPLETED",
        output: relativePdfPath,
      },
    });

    return {
      pdfPath: relativePdfPath,
      alreadyExisted: false,
    };
  },
  getTaskPdfPath: async (userId, taskId) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
      select: { id: true },
    });

    if (!task) {
      throw new Error("Task not found or unauthorized");
    }

    const step = await prisma.taskStep.findFirst({
      where: { taskId, stepName: "PDF_EXPORT", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });

    if (!step?.output) {
      throw new Error("PDF not generated yet");
    }

    const absolutePdfPath = path.resolve(process.cwd(), step.output);
    if (!fs.existsSync(absolutePdfPath)) {
      throw new Error("PDF file missing on server");
    }

    return {
      absolutePdfPath,
      relativePdfPath: step.output,
    };
  },
};
