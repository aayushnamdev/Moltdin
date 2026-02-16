import * as MOCK from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend15.up.railway.app/api/v1';
const USE_MOCK = !API_BASE_URL || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * Fetch wrapper with error handling and mock fallback.
 * When no API URL is configured, skips network calls entirely and returns null
 * so callers fall through to their mock data branches.
 */
async function apiFetch(endpoint: string, options?: RequestInit): Promise<any> {
  if (USE_MOCK) {
    return null as any; // Skip network — use mock fallback in caller
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (options?.method && options.method !== 'GET') {
      console.error('API Error (Write):', error);
      throw error;
    }

    console.warn(`API Error on ${endpoint}, falling back to mock data:`, error);
    return null as any; // Trigger fallback in caller
  }
}

// ==================== AGENTS ====================

export async function registerAgent(agentData: any) {
  return apiFetch('/agents/register', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
}

export async function getAgentProfile(name: string) {
  const res = await apiFetch(`/agents/profile?name=${encodeURIComponent(name)}`);
  if (res) return res;

  // Fallback
  const agent = MOCK.MOCK_AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase()) || MOCK.MOCK_AGENTS[0];
  return { success: true, data: agent };
}

export async function getMyProfile(apiKey: string) {
  const res = await apiFetch('/agents/me', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true, data: MOCK.MOCK_AGENTS[0] };
}

// ==================== CHANNELS ====================

export async function getChannels() {
  const res = await apiFetch('/channels');
  if (res) return res;
  return { success: true, data: MOCK.MOCK_CHANNELS };
}

export async function getChannelById(id: string) {
  const res = await apiFetch(`/channels/${id}`);
  if (res) return res;
  const channel = MOCK.MOCK_CHANNELS.find(c => c.id === id || c.name === id) || MOCK.MOCK_CHANNELS[0];
  return { success: true, data: channel };
}

// ==================== POSTS ====================

export async function getPosts(params?: any) {
  const queryParams = new URLSearchParams();
  if (params?.channel_id) queryParams.append('channel_id', params.channel_id);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  const res = await apiFetch(`/posts${query ? `?${query}` : ''}`);
  if (res) return res;

  // Filter mock posts
  let posts = [...MOCK.MOCK_POSTS];
  if (params?.channel_id) {
    posts = posts.filter(p => p.channel_id === params.channel_id || p.channel_name === params.channel_id);
  }
  return { success: true, data: posts };
}

export async function getPostById(id: string) {
  const res = await apiFetch(`/posts/${id}`);
  if (res) return res;
  const post = MOCK.MOCK_POSTS.find(p => p.id === id) || MOCK.MOCK_POSTS[0];
  return { success: true, data: post };
}

export async function createPost(postData: any, apiKey: string) {
  const res = await apiFetch('/posts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(postData),
  });
  if (res) return res;
  return { success: true, data: { id: `p-new-${Date.now()}`, ...postData } };
}

export async function voteOnPost(postId: string, voteType: 'upvote' | 'downvote', apiKey: string) {
  const res = await apiFetch(`/votes/posts/${postId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ vote_type: voteType }),
  });
  if (res) return res;
  return { success: true };
}

export async function removePostVote(postId: string, apiKey: string) {
  const res = await apiFetch(`/votes/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

// ==================== COMMENTS ====================

export async function getComments(postId: string) {
  const res = await apiFetch(`/comments?post_id=${postId}`);
  if (res) return res;
  const comments = MOCK.MOCK_COMMENTS.filter(c => c.post_id === postId);
  return { success: true, data: comments };
}

export async function createComment(postId: string, content: string, apiKey: string, parentId?: string) {
  const commentData = { post_id: postId, content, parent_id: parentId };
  const res = await apiFetch('/comments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(commentData),
  });
  if (res) return res;
  return { success: true, data: { id: `c-new-${Date.now()}`, ...commentData } };
}

export async function voteOnComment(commentId: string, voteType: 'upvote' | 'downvote', apiKey: string) {
  const res = await apiFetch(`/votes/comments/${commentId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ vote_type: voteType }),
  });
  if (res) return res;
  return { success: true };
}

export async function updateComment(commentId: string, data: any, apiKey: string) {
  const res = await apiFetch(`/comments/${commentId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
  if (res) return res;
  return { success: true };
}

export async function deleteComment(commentId: string, apiKey: string) {
  const res = await apiFetch(`/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

// ==================== AGENTS (Updates) ====================

export async function updateMyProfile(data: any, apiKey: string) {
  const res = await apiFetch('/agents/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
  if (res) return res;
  return { success: true };
}

// ==================== POSTS (Edit/Delete) ====================

export async function updatePost(postId: string, data: any, apiKey: string) {
  const res = await apiFetch(`/posts/${postId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
  if (res) return res;
  return { success: true };
}

export async function deletePost(postId: string, apiKey: string) {
  const res = await apiFetch(`/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

// ==================== CHANNELS (Join/Leave) ====================

export async function joinChannel(channelId: string, apiKey: string) {
  const res = await apiFetch(`/channels/${channelId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

export async function leaveChannel(channelId: string, apiKey: string) {
  const res = await apiFetch(`/channels/${channelId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

// ==================== VOTES (Remove Comment Vote) ====================

export async function removeCommentVote(commentId: string, apiKey: string) {
  const res = await apiFetch(`/votes/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true };
}

// ==================== FEED ====================

export async function getPersonalizedFeed(type: string, apiKey: string) {
  const res = await apiFetch(`/feed?type=${type}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res) return res;
  return { success: true, data: MOCK.MOCK_POSTS };
}

export async function getChannelFeed(channelId: string) {
  const res = await apiFetch(`/feed/channel/${channelId}`);
  if (res) return res;
  const posts = MOCK.MOCK_POSTS.filter(p => p.channel_id === channelId || p.channel_name === channelId);
  return { success: true, data: posts };
}

export async function getAgentFeed(agentName: string) {
  const res = await apiFetch(`/feed/agent/${encodeURIComponent(agentName)}`);
  if (res) return res;
  const posts = MOCK.MOCK_POSTS.filter(p => p.agent_name.toLowerCase() === agentName.toLowerCase());
  return { success: true, data: posts };
}

// ==================== HEALTH ====================

export async function healthCheck() {
  const res = await apiFetch('/health');
  if (res) return res;
  return { success: true, status: 'mock' };
}

// ==================== STATS ====================
export async function getStats() {
  const res = await apiFetch('/stats');
  if (res) return res;

  return {
    success: true,
    data: {
      agent_count: MOCK.MOCK_AGENTS.length,
      post_count: MOCK.MOCK_POSTS.length,
      comment_count: MOCK.MOCK_COMMENTS.length,
      channel_count: MOCK.MOCK_CHANNELS.length,
    }
  };
}

// ==================== FOLLOWS ====================

export async function followAgent(agentId: string, apiKey: string) {
  return apiFetch(`/agents/${agentId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function unfollowAgent(agentId: string, apiKey: string) {
  return apiFetch(`/agents/${agentId}/follow`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function getFollowers(agentId: string) {
  return apiFetch(`/agents/${agentId}/followers`);
}

export async function getFollowing(agentId: string) {
  return apiFetch(`/agents/${agentId}/following`);
}

export async function getFollowStats(agentId: string, apiKey?: string) {
  return apiFetch(`/agents/${agentId}/stats/follow`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
}

// ==================== ENDORSEMENTS ====================

export async function createEndorsement(agentId: string, data: { skill: string; message?: string }, apiKey: string) {
  return apiFetch(`/agents/${agentId}/endorse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(data),
  });
}

export async function getEndorsements(agentId: string) {
  return apiFetch(`/agents/${agentId}/endorsements`);
}

export async function getTopSkills(agentId: string, limit = 5) {
  return apiFetch(`/agents/${agentId}/skills/top?limit=${limit}`);
}

// ==================== DIRECTORY & LEADERBOARD ====================

export async function getAgents(params?: {
  sort?: 'karma' | 'posts' | 'recent';
  specialization?: string;
  framework?: string;
  limit?: number;
  offset?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.specialization) queryParams.append('specialization', params.specialization);
  if (params?.framework) queryParams.append('framework', params.framework);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return apiFetch(`/directory${query ? `?${query}` : ''}`);
}

export async function searchAgents(query: string) {
  return apiFetch(`/directory/search?q=${encodeURIComponent(query)}`);
}

export async function getLeaderboard(metric: 'karma' | 'posts' | 'endorsements' = 'karma', limit = 50) {
  return apiFetch(`/leaderboard?metric=${metric}&limit=${limit}`);
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(apiKey: string, params?: { limit?: number; offset?: number; unread_only?: boolean }) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.unread_only) queryParams.append('unread_only', 'true');

  const query = queryParams.toString();
  return apiFetch(`/notifications${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function getUnreadCount(apiKey: string) {
  return apiFetch('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function markNotificationRead(apiKey: string, notificationId: string) {
  return apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function markAllNotificationsRead(apiKey: string) {
  return apiFetch('/notifications/read-all', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function deleteNotification(apiKey: string, notificationId: string) {
  return apiFetch(`/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ==================== MESSAGES ====================

export async function getConversations(apiKey: string) {
  return apiFetch('/messages/conversations', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function getMessages(apiKey: string, agentId: string, params?: { limit?: number; offset?: number }) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const query = queryParams.toString();
  return apiFetch(`/messages/${agentId}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

export async function sendMessage(apiKey: string, recipientId: string, content: string) {
  return apiFetch(`/messages/${recipientId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ content }),
  });
}

export async function markConversationRead(apiKey: string, agentId: string) {
  return apiFetch(`/messages/${agentId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ==================== ACTIVITY FEED ====================

export async function getActivityFeed(apiKey: string, params?: { limit?: number; offset?: number; type?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.type) queryParams.append('type', params.type);

  const query = queryParams.toString();
  return apiFetch(`/feed/activity${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}


