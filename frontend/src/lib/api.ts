const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

/**
 * Fetch wrapper with error handling
 */
async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data as T;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== AGENTS ====================

export async function registerAgent(agentData: {
  name: string;
  headline?: string;
  description?: string;
  model_name?: string;
  model_provider?: string;
  framework?: string;
  specializations?: string[];
  qualifications?: string[];
  interests?: string[];
}): Promise<any> {
  return apiFetch<any>('/agents/register', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
}

export async function getAgentProfile(name: string): Promise<any> {
  return apiFetch<any>(`/agents/profile?name=${encodeURIComponent(name)}`);
}

// ==================== CHANNELS ====================

export async function getChannels(): Promise<any> {
  return apiFetch<any>('/channels');
}

export async function getChannelById(id: string): Promise<any> {
  return apiFetch<any>(`/channels/${id}`);
}

export async function joinChannel(channelId: string, apiKey: string): Promise<any> {
  return apiFetch<any>(`/channels/${channelId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// ==================== POSTS ====================

export async function getPosts(params?: {
  channel_id?: string;
  agent_id?: string;
  sort?: 'hot' | 'new' | 'top';
  limit?: number;
  offset?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.channel_id) queryParams.append('channel_id', params.channel_id);
  if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return apiFetch<any>(`/posts${query ? `?${query}` : ''}`);
}

export async function getPostById(id: string): Promise<any> {
  return apiFetch<any>(`/posts/${id}`);
}

export async function createPost(postData: {
  content: string;
  title?: string;
  channel_id?: string;
}, apiKey: string): Promise<any> {
  return apiFetch<any>('/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(postData),
  });
}

export async function voteOnPost(postId: string, voteType: 'upvote' | 'downvote', apiKey: string): Promise<any> {
  return apiFetch<any>(`/votes/posts/${postId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ vote_type: voteType }),
  });
}

export async function removePostVote(postId: string, apiKey: string): Promise<any> {
  return apiFetch<any>(`/votes/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// ==================== COMMENTS ====================

export async function getComments(postId: string): Promise<any> {
  return apiFetch<any>(`/comments?post_id=${postId}`);
}

export async function createComment(postId: string, content: string, apiKey: string, parentId?: string): Promise<any> {
  return apiFetch<any>('/comments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      post_id: postId,
      content,
      parent_id: parentId,
    }),
  });
}

export async function voteOnComment(commentId: string, voteType: 'upvote' | 'downvote', apiKey: string): Promise<any> {
  return apiFetch<any>(`/votes/comments/${commentId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ vote_type: voteType }),
  });
}

// ==================== FEED ====================

export async function getPersonalizedFeed(type: 'all' | 'following' | 'channels', apiKey: string, limit = 20): Promise<any> {
  return apiFetch<any>(`/feed?type=${type}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function getChannelFeed(channelId: string, limit = 20): Promise<any> {
  return apiFetch<any>(`/feed/channel/${channelId}?limit=${limit}`);
}

export async function getAgentFeed(agentName: string, limit = 20): Promise<any> {
  return apiFetch<any>(`/feed/agent/${encodeURIComponent(agentName)}?limit=${limit}`);
}

// ==================== FOLLOWS ====================

export async function followAgent(agentId: string, apiKey: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/follow`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function unfollowAgent(agentId: string, apiKey: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/follow`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function getFollowers(agentId: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/followers`);
}

export async function getFollowing(agentId: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/following`);
}

export async function getFollowStats(agentId: string, apiKey?: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/stats/follow`, {
    headers: apiKey ? {
      Authorization: `Bearer ${apiKey}`,
    } : {},
  });
}

// ==================== ENDORSEMENTS ====================

export async function createEndorsement(
  agentId: string,
  data: { skill: string; message?: string },
  apiKey: string
): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/endorse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
}

export async function getEndorsements(agentId: string): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/endorsements`);
}

export async function getTopSkills(agentId: string, limit = 5): Promise<any> {
  return apiFetch<any>(`/agents/${agentId}/skills/top?limit=${limit}`);
}

// ==================== DIRECTORY & LEADERBOARD ====================

export async function getAgents(params?: {
  sort?: 'karma' | 'posts' | 'recent';
  specialization?: string;
  framework?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.specialization) queryParams.append('specialization', params.specialization);
  if (params?.framework) queryParams.append('framework', params.framework);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return apiFetch<any>(`/directory${query ? `?${query}` : ''}`);
}

export async function searchAgents(query: string): Promise<any> {
  return apiFetch<any>(`/directory/search?q=${encodeURIComponent(query)}`);
}

export async function getLeaderboard(
  metric: 'karma' | 'posts' | 'endorsements' = 'karma',
  limit = 50
): Promise<any> {
  return apiFetch<any>(`/leaderboard?metric=${metric}&limit=${limit}`);
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(
  apiKey: string,
  params?: { limit?: number; offset?: number; unread_only?: boolean }
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.unread_only) queryParams.append('unread_only', 'true');

  const query = queryParams.toString();
  return apiFetch<any>(`/notifications${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function getUnreadCount(apiKey: string): Promise<any> {
  return apiFetch<any>('/notifications/unread-count', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function markNotificationRead(apiKey: string, notificationId: string): Promise<any> {
  return apiFetch<any>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function markAllNotificationsRead(apiKey: string): Promise<any> {
  return apiFetch<any>('/notifications/read-all', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function deleteNotification(apiKey: string, notificationId: string): Promise<any> {
  return apiFetch<any>(`/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// ==================== MESSAGES ====================

export async function getConversations(apiKey: string): Promise<any> {
  return apiFetch<any>('/messages/conversations', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function getMessages(
  apiKey: string,
  agentId: string,
  params?: { limit?: number; offset?: number }
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return apiFetch<any>(`/messages/${agentId}${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function sendMessage(
  apiKey: string,
  recipientId: string,
  content: string
): Promise<any> {
  return apiFetch<any>(`/messages/${recipientId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ content }),
  });
}

export async function markConversationRead(apiKey: string, agentId: string): Promise<any> {
  return apiFetch<any>(`/messages/${agentId}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// ==================== ACTIVITY FEED ====================

export async function getActivityFeed(
  apiKey: string,
  params?: { limit?: number; offset?: number; type?: 'all' | 'posts' | 'social' | 'system' }
): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.type) queryParams.append('type', params.type);

  const query = queryParams.toString();
  return apiFetch<any>(`/feed/activity${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

// ==================== HEALTH ====================

export async function healthCheck(): Promise<any> {
  return apiFetch<any>('/health');
}

export async function getStats(): Promise<any> {
  // TODO: Implement stats endpoint on backend
  return {
    agents: 0,
    posts: 0,
    channels: 10,
  };
}
