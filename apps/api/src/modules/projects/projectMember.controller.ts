import { Request, Response } from "express";
import {
  addProjectMemberSchema,
  projectIdParamSchema,
  projectMemberParamSchema,
  updateProjectMemberSchema,
} from "./projectMember.validation";
import {
  addProjectMemberService,
  getProjectMembersService,
  removeProjectMemberService,
  updateProjectMemberService,
} from "./projectMember.service";

/**
 * Add member to project controller.
 */
export const addProjectMemberController = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId } = projectIdParamSchema.parse(req.params);
    const validatedData = addProjectMemberSchema.parse(req.body);

    const member = await addProjectMemberService(projectId, validatedData);

    return res.status(201).json({
      success: true,
      message: "Project member added successfully",
      data: {
        member,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to add project member",
    });
  }
};

/**
 * Get project members controller.
 */
export const getProjectMembersController = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId } = projectIdParamSchema.parse(req.params);

    const members = await getProjectMembersService(projectId);

    return res.status(200).json({
      success: true,
      message: "Project members fetched successfully",
      data: {
        members,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to fetch project members",
    });
  }
};

/**
 * Update project member role controller.
 */
export const updateProjectMemberController = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId, memberId } = projectMemberParamSchema.parse(req.params);
    const validatedData = updateProjectMemberSchema.parse(req.body);

    const member = await updateProjectMemberService(
      projectId,
      memberId,
      validatedData
    );

    return res.status(200).json({
      success: true,
      message: "Project member updated successfully",
      data: {
        member,
      },
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to update project member",
    });
  }
};

/**
 * Remove project member controller.
 */
export const removeProjectMemberController = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId, memberId } = projectMemberParamSchema.parse(req.params);

    const result = await removeProjectMemberService(projectId, memberId);

    return res.status(200).json({
      success: true,
      message: "Project member removed successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error?.message || "Failed to remove project member",
    });
  }
};