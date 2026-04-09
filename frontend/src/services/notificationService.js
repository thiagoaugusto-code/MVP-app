import api from './api';

export const notificationAPI = {
  subscribe: (subscription) => api.post('/notifications/subscribe', { subscription }),
  unsubscribe: (endpoint) => api.post('/notifications/unsubscribe', { endpoint }),
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`)
};

export default notificationAPI;