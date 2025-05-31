import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/deepscribe/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const storyAPI = {
  // Get all stories
  getStories: () => api.get('/stories'),

  // Get story by ID with chapters
  getStory: (id) => api.get(`/stories/${id}`),

  // Verify story password and get full story data
  verifyStoryPassword: (id, password) => 
    api.post(`/stories/${id}/verify`, { password }),

  // Set password for a story
  setStoryPassword: (id, password) => 
    api.post(`/stories/${id}/password`, { password }),

  // Remove password protection from a story
  removeStoryPassword: (id, password) => 
    api.delete(`/stories/${id}/password`, { data: { password } }),

  // Create new story
  createStory: (data) => api.post('/stories', data),

  // Generate new chapter
  generateChapter: (storyId, prompt, password = null) => 
    api.post(`/stories/${storyId}/chapters`, { prompt, password }),

  // Delete story
  deleteStory: (id) => api.delete(`/stories/${id}`),
};

export default api; 