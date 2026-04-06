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

export const ProjectService = {
  createProject,
  getProjectById,
};
