import prisma from "../../../prisma/client.js";

const createProject = async (userId, payload) => {
  const { name, description } = payload;

  const project = await prisma.project.create({
    data: {
      userId,
      name,
      description: description || null,
    },
  });

  return project;
};

const getProjectById = async (userId, projectId) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId,
    },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

const getAllProjects = async (userId) => {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt,
    taskCount: p._count.tasks,
  }));
};

export const ProjectService = {
  createProject,
  getAllProjects,
  getProjectById,
};
