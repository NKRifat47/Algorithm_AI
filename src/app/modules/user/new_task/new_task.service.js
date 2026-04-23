import axios from "axios";
import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import archiver from "archiver";

const getAiOutputText = (rawContent) => {
  if (typeof rawContent !== "string") return "";
  const trimmed = rawContent.trim();
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed);
    const output =
      parsed?.data?.result?.formatted_results?.[0]?.output ??
      parsed?.data?.result?.output ??
      parsed?.output;
    return typeof output === "string" ? output : trimmed;
  } catch {
    return rawContent;
  }
};

const extractCodeFilesFromText = (text) => {
  if (!text || typeof text !== "string") return [];

  const files = [];
  const pushFile = (filePath, content) => {
    if (!filePath || !content) return;
    const normalized = filePath
      .replaceAll("\\", "/")
      .replace(/^["'`]/, "")
      .replace(/["'`]$/, "")
      .trim();

    // reject paths that could escape the zip folder
    if (
      !normalized ||
      normalized.startsWith("/") ||
      normalized.includes("..") ||
      normalized.length > 200
    ) {
      return;
    }

    // keep it somewhat realistic (avoid things like "javascript")
    if (!/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(normalized)) return;

    files.push({ path: normalized, content });
  };

  // Pattern 1: fenced blocks where the info string is a file path
  // ```src/index.html
  // <html>...</html>
  // ```
  const fencePathRegex = /```([^\n`]{1,200})\n([\s\S]*?)```/g;
  for (const match of text.matchAll(fencePathRegex)) {
    const header = (match[1] || "").trim();
    const content = (match[2] || "").replace(/\n$/, "");

    // If header looks like a language tag (js, html, etc.) ignore.
    if (/^[a-zA-Z]{1,12}$/.test(header)) continue;
    pushFile(header, content);
  }

  // Pattern 2: "File: path" followed by a normal fenced block
  const fileThenFenceRegex =
    /(?:^|\n)\s*(?:File|Filename|Path)\s*:\s*([^\n]{1,200})\s*\n```[^\n]*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(fileThenFenceRegex)) {
    pushFile((match[1] || "").trim(), (match[2] || "").replace(/\n$/, ""));
  }

  // Pattern 3: "### path" followed by fenced block
  const headingThenFenceRegex =
    /(?:^|\n)#+\s*([^\n]{1,200})\s*\n```[^\n]*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(headingThenFenceRegex)) {
    pushFile((match[1] || "").trim(), (match[2] || "").replace(/\n$/, ""));
  }

  // Pattern 4: path on its own line, then fenced block with a language tag
  // src/index.js
  // ```javascript
  // ...
  // ```
  const pathLineThenFenceRegex =
    /(?:^|\n)\s*([^\n`]{1,200}\.[a-zA-Z0-9]{1,12})\s*\n```[^\n]*\n([\s\S]*?)```/g;
  for (const match of text.matchAll(pathLineThenFenceRegex)) {
    pushFile((match[1] || "").trim(), (match[2] || "").replace(/\n$/, ""));
  }

  // Deduplicate by path, prefer first occurrence
  const seen = new Set();
  return files.filter((f) => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });
};

export const detectResponseType = (rawContent) => {
  const text = getAiOutputText(rawContent);
  const files = extractCodeFilesFromText(text);
  // Treat as codebase only if it looks like a multi-file output.
  if (files.length >= 2) return { type: "codebase", filesCount: files.length };
  return { type: "text", filesCount: files.length };
};

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

    const response = await axios.post(
      `${aiEngineUrl}/api/generate`,
      {
        intent: "new_task",
        prompt,
      },
      {
        params: { intent: "new_task" },
        headers: { "Content-Type": "application/json" },
      },
    );

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

    const response = await axios.post(
      `${aiEngineUrl}/api/generate`,
      {
        intent: "continue_task",
        prompt: combinedPrompt,
      },
      {
        params: { intent: "continue_task" },
        headers: { "Content-Type": "application/json" },
      },
    );

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
  detectResponseType,
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
  generateTaskCodebaseZip: async (userId, taskId) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error("Task not found or unauthorized");
    }
    if (!task.content) {
      throw new Error("Task has no AI content to export");
    }

    const outputText = getAiOutputText(task.content);
    const files = extractCodeFilesFromText(outputText);
    if (files.length < 2) {
      throw new Error(
        "This task doesn't look like a multi-file codebase. ZIP export is available only for codebase responses.",
      );
    }

    // If we already generated a ZIP for this task, reuse it.
    const existingStep = await prisma.taskStep.findFirst({
      where: { taskId, stepName: "CODEBASE_ZIP" },
      orderBy: { createdAt: "desc" },
    });
    if (existingStep?.status === "COMPLETED" && existingStep.output) {
      const existingAbs = path.resolve(process.cwd(), existingStep.output);
      if (fs.existsSync(existingAbs)) {
        return { zipPath: existingStep.output, alreadyExisted: true };
      }
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "task-zips");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `task-${taskId}-${Date.now()}.zip`;
    const relativeZipPath = path.join("uploads", "task-zips", fileName);
    const absoluteZipPath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(absoluteZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", resolve);
      output.on("error", reject);
      archive.on("warning", (err) => {
        if (err.code === "ENOENT") return;
        reject(err);
      });
      archive.on("error", reject);

      archive.pipe(output);

      // Put everything inside a single folder in the zip
      const rootFolder = `task-${taskId}`;
      for (const f of files) {
        archive.append(f.content, { name: `${rootFolder}/${f.path}` });
      }

      archive.finalize();
    });

    await prisma.taskStep.create({
      data: {
        taskId,
        stepName: "CODEBASE_ZIP",
        status: "COMPLETED",
        output: relativeZipPath,
      },
    });

    return {
      zipPath: relativeZipPath,
      alreadyExisted: false,
      filesCount: files.length,
    };
  },
  getTaskCodebaseZipPath: async (userId, taskId) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId },
      select: { id: true },
    });

    if (!task) {
      throw new Error("Task not found or unauthorized");
    }

    const step = await prisma.taskStep.findFirst({
      where: { taskId, stepName: "CODEBASE_ZIP", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });

    if (!step?.output) {
      throw new Error("ZIP not generated yet");
    }

    const absoluteZipPath = path.resolve(process.cwd(), step.output);
    if (!fs.existsSync(absoluteZipPath)) {
      throw new Error("ZIP file missing on server");
    }

    return {
      absoluteZipPath,
      relativeZipPath: step.output,
    };
  },
};
