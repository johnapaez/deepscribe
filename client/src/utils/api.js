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

  // Create new story
  createStory: (data) => api.post('/stories', data),

  // Generate new chapter
  generateChapter: (storyId, prompt) => 
    api.post(`/stories/${storyId}/chapters`, { prompt }),

  // Delete story
  deleteStory: (id) => api.delete(`/stories/${id}`),
};

export default api; 