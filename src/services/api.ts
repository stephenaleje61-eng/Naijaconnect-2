const TOKEN_KEY = 'naija_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type');
    let data: any = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text || 'An unexpected error occurred.' };
      }
    }

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (data && typeof data === 'object') {
        if (typeof data.error === 'string') errorMessage = data.error;
        else if (typeof data.message === 'string') errorMessage = data.message;
      } else if (typeof data === 'string' && data.trim()) {
        errorMessage = data.trim();
      }

      if (response.status === 404) {
        errorMessage = 'Service endpoint not found (404). Please check backend connection.';
      } else if (response.status === 401 && !data?.error) {
        errorMessage = 'Invalid credentials or session expired. Please sign in again.';
      } else if (response.status === 403 && !data?.error) {
        errorMessage = 'Access denied. You do not have permission for this request.';
      } else if (response.status >= 500 && !data?.error) {
        errorMessage = 'Server is currently unavailable. Please try again in a moment.';
      }

      if (
        typeof errorMessage === 'string' &&
        (errorMessage.includes('<html') ||
          errorMessage.includes('<!DOCTYPE') ||
          errorMessage.includes('<!doctype') ||
          errorMessage.includes('NOT_FOUND'))
      ) {
        errorMessage = `Service endpoint unavailable (${response.status}). Please try again.`;
      }

      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes('[object Object]')) {
        throw new Error('An unexpected response was received. Please try again.');
      }
      throw error;
    }
    throw new Error('Network connection error. Please verify your internet connection.');
  }
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<any>('/api/auth/me'),
  recoverPassword: (email: string) => request<any>('/api/auth/recover-password', { method: 'POST', body: JSON.stringify({ email }) }),

  // Users
  searchUsers: (q = '', state = 'All') => request<any[]>(`/api/users/search?q=${encodeURIComponent(q)}&state=${encodeURIComponent(state)}`),
  getSuggestions: () => request<any[]>('/api/users/suggestions'),
  getProfile: (identifier: string) => request<any>(`/api/users/profile/${encodeURIComponent(identifier)}`),
  updateProfile: (data: any) => request<any>('/api/users/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => request<any>('/api/users/password', { method: 'PUT', body: JSON.stringify(data) }),

  // Posts
  getPosts: (filter = 'all', state?: string, authorId?: string) => {
    let url = `/api/posts?filter=${encodeURIComponent(filter)}`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    if (authorId) url += `&authorId=${encodeURIComponent(authorId)}`;
    return request<any[]>(url);
  },
  createPost: (data: any) => request<any>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  editPost: (id: string, data: any) => request<any>(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id: string) => request<any>(`/api/posts/${id}`, { method: 'DELETE' }),
  reactPost: (id: string, reaction: string) => request<any>(`/api/posts/${id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  sharePost: (id: string) => request<any>(`/api/posts/${id}/share`, { method: 'POST' }),
  getComments: (postId: string) => request<any[]>(`/api/posts/${postId}/comments`),
  addComment: (postId: string, content: string, parentCommentId?: string) =>
    request<any>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content, parentCommentId }) }),
  deleteComment: (postId: string, commentId: string) => request<any>(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  reportPost: (postId: string, reason: string, details?: string) =>
    request<any>(`/api/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) }),

  // Stories
  getStories: () => request<any[]>('/api/stories'),
  createStory: (data: any) => request<any>('/api/stories', { method: 'POST', body: JSON.stringify(data) }),
  viewStory: (storyId: string) => request<any>(`/api/stories/${storyId}/view`, { method: 'POST' }),
  reactStory: (storyId: string, reaction: string) => request<any>(`/api/stories/${storyId}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }),
  deleteStory: (storyId: string) => request<any>(`/api/stories/${storyId}`, { method: 'DELETE' }),

  // Chats
  getConversations: () => request<any[]>('/api/chats/conversations'),
  getChatUsers: () => request<any[]>('/api/chats/users'),
  getDirectConversation: (userId: string) => request<any>(`/api/chats/conversations/direct/${userId}`, { method: 'POST' }),
  createGroupChat: (data: any) => request<any>('/api/chats/conversations/group', { method: 'POST', body: JSON.stringify(data) }),
  updateGroupChat: (id: string, data: any) => request<any>(`/api/chats/conversations/group/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getMessages: (conversationId: string, q = '') => request<any[]>(`/api/chats/conversations/${conversationId}/messages${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  sendMessage: (conversationId: string, data: { text?: string; mediaUrl?: string; mediaType?: string }) =>
    request<any>(`/api/chats/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  // Friends
  getFriends: () => request<any>('/api/friends'),
  sendFriendRequest: (targetId: string) => request<any>(`/api/friends/request/${targetId}`, { method: 'POST' }),
  acceptFriendRequest: (friendshipId: string) => request<any>(`/api/friends/accept/${friendshipId}`, { method: 'POST' }),
  declineFriendRequest: (friendshipId: string) => request<any>(`/api/friends/decline/${friendshipId}`, { method: 'POST' }),
  cancelFriendRequest: (friendshipId: string) => request<any>(`/api/friends/cancel/${friendshipId}`, { method: 'POST' }),
  unfriend: (targetId: string) => request<any>(`/api/friends/${targetId}`, { method: 'DELETE' }),
  blockUser: (targetId: string) => request<any>(`/api/friends/block/${targetId}`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request<any[]>('/api/notifications'),
  markNotificationsRead: (id?: string) => request<any>('/api/notifications/mark-read', { method: 'PUT', body: JSON.stringify({ id }) }),
  deleteNotification: (id: string) => request<any>(`/api/notifications/${id}`, { method: 'DELETE' }),

  // Communities / Groups
  getGroups: (category = 'All', state = 'All', q = '') =>
    request<any[]>(`/api/groups?category=${encodeURIComponent(category)}&state=${encodeURIComponent(state)}&q=${encodeURIComponent(q)}`),
  createGroup: (data: any) => request<any>('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
  joinGroup: (id: string) => request<any>(`/api/groups/${id}/join`, { method: 'POST' }),
  leaveGroup: (id: string) => request<any>(`/api/groups/${id}/leave`, { method: 'POST' }),

  // Announcements (Public)
  getAnnouncements: () => request<any[]>('/api/announcements'),

  // Admin
  getAdminOverview: () => request<any>('/api/admin/overview'),
  applyUserAction: (userId: string, action: string) =>
    request<any>(`/api/admin/users/${userId}/action`, { method: 'PUT', body: JSON.stringify({ action }) }),
  getAdminReports: () => request<any[]>('/api/admin/reports'),
  resolveReport: (reportId: string, status: string, actionTaken?: string) =>
    request<any>(`/api/admin/reports/${reportId}/resolve`, { method: 'PUT', body: JSON.stringify({ status, actionTaken }) }),
  createAnnouncement: (title: string, message: string) =>
    request<any>('/api/admin/announcements', { method: 'POST', body: JSON.stringify({ title, message }) }),
  deleteAnnouncement: (id: string) => request<any>(`/api/admin/announcements/${id}`, { method: 'DELETE' }),

  // Upload
  uploadFile: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string; filename: string }>('/api/upload', {
      method: 'POST',
      body: formData
    });
  },
  uploadBase64: (base64Data: string, filename?: string, mimeType?: string) =>
    request<{ url: string }>('/api/upload/base64', {
      method: 'POST',
      body: JSON.stringify({ base64Data, filename, mimeType })
    })
};
