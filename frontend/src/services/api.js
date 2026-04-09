import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

// Users
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

// Meals (logs antigos)
export const mealsAPI = {
  getLogs: () => api.get('/meals/logs'),
  createLog: (data) => api.post('/meals/logs', data),
};

// Meals (novos - refeições estruturadas)
export const dietAPI = {
  getMeals: (date) => api.get('/meals', { params: { date } }),
  createMeal: (data) => api.post('/meals', data),
  updateMeal: (id, data) => api.patch(`/meals/${id}`, data),
  deleteMeal: (id) => api.delete(`/meals/${id}`),
  addFoodItem: (mealId, data) => api.post(`/meals/${mealId}/food`, data),
  removeFoodItem: (mealId, foodId) => api.delete(`/meals/${mealId}/food/${foodId}`),
  getSuggestions: () => api.get('/meals/suggestions'),
  suggestFoods: (data) => api.post('/meals/suggest', data),
};

// Collaborators
export const collaboratorsAPI = {
  getCollaborators: (specialty) => api.get('/collaborators', { params: { specialty } }),
  requestCollaboration: (data) => api.post('/collaborators/request', data),
  getRequests: () => api.get('/collaborators/requests'),
  getReceivedRequests: () => api.get('/collaborators/received-requests'),
  updateRequest: (id, data) => api.patch(`/collaborators/request/${id}`, data),
};

// Workouts
export const workoutsAPI = {
  getLogs: () => api.get('/workouts'),
  createLog: (data) => api.post('/workouts', data),
};

// Progress
export const progressAPI = {
  getLogs: () => api.get('/progress'),
  createLog: (data) => api.post('/progress', data),
};

export default api;