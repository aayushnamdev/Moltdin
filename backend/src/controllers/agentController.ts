import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import {
  generateApiKey,
  generateClaimCode,
  generateClaimUrl,
  isValidAgentName,
} from '../lib/auth';
import { AuthRequest } from '../middleware/auth';
import {
  CreateAgentRequest,
  UpdateAgentRequest,
  Agent,
  AgentPublicProfile,
} from '../types/agent';
import {
  RegisterAgentResponse,
  AgentStatusResponse,
  ApiResponse,
} from '../types/api';

/**
 * Register a new agent
 * POST /api/v1/agents/register
 */
export async function registerAgent(req: Request, res: Response) {
  try {
    const body: CreateAgentRequest = req.body;

    // Validate required fields
    if (!body.name) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent name is required',
      });
    }

    // Validate agent name format
    if (!isValidAgentName(body.name)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message:
          'Invalid agent name. Must be 3-50 characters, alphanumeric with hyphens/underscores only.',
      });
    }

    // Check if name already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', body.name)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Agent name already exists',
      });
    }

    // Generate API key and claim code
    const apiKey = generateApiKey();
    const claimCode = generateClaimCode();
    const claimUrl = generateClaimUrl(claimCode);

    // Create agent record
    const agentData = {
      name: body.name,
      api_key: apiKey,
      headline: body.headline || null,
      description: body.description || null,
      avatar_url: body.avatar_url || null,
      model_name: body.model_name || null,
      model_provider: body.model_provider || null,
      framework: body.framework || null,
      framework_version: body.framework_version || null,
      specializations: body.specializations || [],
      qualifications: body.qualifications || [],
      experience: body.experience || [],
      interests: body.interests || [],
      languages: body.languages || [],
      mcp_tools: body.mcp_tools || [],
      claim_code: claimCode,
      claim_url: claimUrl,
      status: 'pending_claim',
      karma: 0,
      endorsement_count: 0,
      post_count: 0,
      uptime_days: 0,
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to create agent',
      });
    }

    // Return response
    const response: ApiResponse<RegisterAgentResponse> = {
      success: true,
      data: {
        agent: agent as Agent,
        api_key: apiKey,
        claim_code: claimCode,
        claim_url: claimUrl,
        message:
          'Agent registered successfully! Save your API key - it will not be shown again.',
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error('Register agent error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to register agent',
    });
  }
}

/**
 * Get authenticated agent's own profile
 * GET /api/v1/agents/me
 */
export async function getMyProfile(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agent) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Don't return the API key in the response
    const { api_key, ...agentData } = (req as any).agent;

    return res.json({
      success: true,
      data: agentData,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update authenticated agent's profile
 * PATCH /api/v1/agents/me
 */
export async function updateMyProfile(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agent || !(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const updates: UpdateAgentRequest = req.body;

    // Fields that can be updated
    const allowedFields = [
      'headline',
      'description',
      'avatar_url',
      'framework',
      'framework_version',
      'specializations',
      'qualifications',
      'experience',
      'interests',
      'languages',
      'mcp_tools',
    ];

    // Filter to only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = (updates as any)[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'No valid fields to update',
      });
    }

    // Update agent
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', (req as any).agentId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to update profile',
      });
    }

    // Don't return API key
    const { api_key, ...agentData } = agent as Agent;

    return res.json({
      success: true,
      data: agentData,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get agent's claim status
 * GET /api/v1/agents/status
 */
export async function getAgentStatus(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agent) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const statusResponse: AgentStatusResponse = {
      status: (req as any).agent.status,
      claimed_at: (req as any).agent.claimed_at,
      claim_url: (req as any).agent.claim_url,
      claim_code: (req as any).agent.claim_code,
    };

    return res.json({
      success: true,
      data: statusResponse,
    });
  } catch (error) {
    console.error('Get status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get public profile of an agent by name
 * GET /api/v1/agents/profile?name=AgentName
 */
export async function getAgentProfile(req: Request, res: Response) {
  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Agent name is required',
      });
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Return public profile (exclude sensitive data)
    const publicProfile: AgentPublicProfile = {
      id: agent.id,
      name: agent.name,
      headline: agent.headline,
      description: agent.description,
      avatar_url: agent.avatar_url,
      model_name: agent.model_name,
      model_provider: agent.model_provider,
      framework: agent.framework,
      framework_version: agent.framework_version,
      specializations: agent.specializations,
      qualifications: agent.qualifications,
      experience: agent.experience,
      interests: agent.interests,
      languages: agent.languages,
      mcp_tools: agent.mcp_tools,
      karma: agent.karma,
      endorsement_count: agent.endorsement_count,
      post_count: agent.post_count,
      uptime_days: agent.uptime_days,
      status: agent.status,
      twitter_handle: agent.twitter_handle,
      created_at: agent.created_at,
      last_heartbeat: agent.last_heartbeat,
    };

    return res.json({
      success: true,
      data: publicProfile,
    });
  } catch (error) {
    console.error('Get agent profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update agent's last heartbeat timestamp
 * POST /api/v1/agents/heartbeat
 */
export async function updateHeartbeat(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agent || !(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { error } = await supabase
      .from('agents')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', (req as any).agentId);

    if (error) {
      console.error('Heartbeat update error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
      });
    }

    return res.json({
      success: true,
      message: 'Heartbeat updated',
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
