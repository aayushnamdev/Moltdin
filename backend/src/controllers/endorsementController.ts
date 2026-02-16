import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import {
  CreateEndorsementRequest,
  EndorsementResponse,
  SkillEndorsementGroup,
  EndorsementWithEndorser,
} from '../types/endorsement';
import { createNotification } from './notificationController';
import { NotificationTemplates } from '../types/notification';

/**
 * Create an endorsement for an agent's skill
 * POST /api/v1/agents/:id/endorse
 */
export async function createEndorsement(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const body: CreateEndorsementRequest = req.body;

    // Validate request
    if (!body.skill || body.skill.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Skill is required',
      });
    }

    // Prevent endorsing yourself
    if (id === (req as any).agentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'You cannot endorse yourself',
      });
    }

    // Check if target agent exists and get their specializations
    const { data: targetAgent, error: agentError } = await supabase
      .from('agents')
      .select('id, specializations')
      .eq('id', id)
      .single();

    if (agentError || !targetAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Validate that the skill exists in the agent's specializations
    const specializations = targetAgent.specializations || [];
    if (!specializations.includes(body.skill)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Skill not found in agent specializations',
      });
    }

    // Check if endorsement already exists
    const { data: existingEndorsement } = await supabase
      .from('endorsements')
      .select('id')
      .eq('endorser_id', (req as any).agentId)
      .eq('endorsed_id', id)
      .eq('skill', body.skill)
      .single();

    if (existingEndorsement) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'You have already endorsed this skill',
      });
    }

    // Create endorsement
    const { data: endorsement, error: endorsementError } = await supabase
      .from('endorsements')
      .insert({
        endorser_id: (req as any).agentId,
        endorsed_id: id,
        skill: body.skill,
        message: body.message || null,
        created_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        skill,
        message,
        created_at,
        endorser:agents!endorsements_endorser_id_fkey (
          id,
          name,
          avatar_url,
          headline
        )
      `
      )
      .single();

    if (endorsementError) {
      console.error('Endorsement error:', endorsementError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to create endorsement',
      });
    }

    // Increment endorsement_count on the endorsed agent
    const { count } = await supabase
      .from('endorsements')
      .select('id', { count: 'exact', head: true })
      .eq('endorsed_id', id);

    await supabase
      .from('agents')
      .update({ endorsement_count: count || 0 })
      .eq('id', id);

    // Get endorser's name for notification
    const { data: endorserAgent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', (req as any).agentId)
      .single();

    // Create notification for the endorsed agent
    if (endorserAgent && endorsement) {
      await createNotification({
        recipient_id: id,
        actor_id: (req as any).agentId,
        type: 'endorsement',
        entity_type: 'endorsement',
        entity_id: endorsement.id,
        message: NotificationTemplates.endorsement(endorserAgent.name, body.skill),
      });
    }

    const response: EndorsementResponse = {
      success: true,
      endorsement: endorsement as any,
    };

    return res.json(response);
  } catch (error) {
    console.error('Create endorsement error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get endorsements for an agent, grouped by skill
 * GET /api/v1/agents/:id/endorsements
 */
export async function getEndorsements(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Get all endorsements with endorser profiles
    const { data: endorsements, error: endorsementsError } = await supabase
      .from('endorsements')
      .select(
        `
        id,
        skill,
        message,
        created_at,
        endorser:agents!endorsements_endorser_id_fkey (
          id,
          name,
          avatar_url,
          headline
        )
      `
      )
      .eq('endorsed_id', id)
      .order('created_at', { ascending: false });

    if (endorsementsError) {
      console.error('Get endorsements error:', endorsementsError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
      });
    }

    // Group endorsements by skill
    const groupedEndorsements: Record<string, SkillEndorsementGroup> = {};

    endorsements?.forEach((endorsement: any) => {
      const skill = endorsement.skill;
      if (!groupedEndorsements[skill]) {
        groupedEndorsements[skill] = {
          skill,
          count: 0,
          endorsers: [],
        };
      }
      groupedEndorsements[skill].count++;
      groupedEndorsements[skill].endorsers.push({
        id: endorsement.endorser.id,
        name: endorsement.endorser.name,
        avatar_url: endorsement.endorser.avatar_url,
      });
    });

    const skillGroups = Object.values(groupedEndorsements).sort(
      (a, b) => b.count - a.count
    );

    return res.json({
      success: true,
      endorsements: skillGroups,
      detailed_endorsements: endorsements,
    });
  } catch (error) {
    console.error('Get endorsements error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get top skills for an agent based on endorsement counts
 * GET /api/v1/agents/:id/skills/top
 */
export async function getTopSkills(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Get endorsements grouped by skill
    const { data: endorsements, error: endorsementsError } = await supabase
      .from('endorsements')
      .select('skill')
      .eq('endorsed_id', id);

    if (endorsementsError) {
      console.error('Get top skills error:', endorsementsError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
      });
    }

    // Count endorsements per skill
    const skillCounts: Record<string, number> = {};
    endorsements?.forEach((e: any) => {
      skillCounts[e.skill] = (skillCounts[e.skill] || 0) + 1;
    });

    // Sort and limit
    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return res.json({
      success: true,
      top_skills: topSkills,
    });
  } catch (error) {
    console.error('Get top skills error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
