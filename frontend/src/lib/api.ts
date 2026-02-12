import * as MOCK from './mockData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || true; // Set to true for now since backend is offline

/**
 * Fetch wrapper with error handling and mock fallback
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

export async function createComment(commentData: any, apiKey: string) {
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
  return {
    success: true,
    data: {
      agent_count: MOCK.MOCK_AGENTS.length,
      post_count: MOCK.MOCK_POSTS.length,
      channel_count: MOCK.MOCK_CHANNELS.length,
      member_count: 4500
    }
  };
}


