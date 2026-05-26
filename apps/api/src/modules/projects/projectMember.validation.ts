import { z } from "zod";

/**
 * Project member role is not system role.
 * This role is only for project-level responsibility.
 */
export const projectMemberRoleSchema = z.enum([
  "PROJECT_LEAD",
  "TEAM_MEMBER",
  "TECHNICIAN",
  "ENGINEER",
  "COORDINATOR",
  "SUPPORT",
]);

/**
 * Validate project id from URL params.
 */
export const projectIdParamSchema = z.object({
  projectId: z.string().uuid("Invalid project id"),
});

/**
 * Validate project id and member id from URL params.
 */
export const projectMemberParamSchema = z.object({
  projectId: z.string().uuid("Invalid project id"),
  memberId: z.string().uuid("Invalid project member id"),
});

/**
 * Create project member validation.
 */
export const addProjectMemberSchema = z.object({
  userId: z.string().uuid("Invalid employee id"),

  role: projectMemberRoleSchema.optional(),
});

/**
 * Update project member role validation.
 */
export const updateProjectMemberSchema = z.object({
  role: projectMemberRoleSchema,
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<
  typeof updateProjectMemberSchema
>;