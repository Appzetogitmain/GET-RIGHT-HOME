import { api } from './apiService';

export const reelService = {
    getFeed: (params = {}) =>
        api.get('/reels/feed', { params: { limit: 10, ...params } }).then((r) => r.data),

    getReelById: (id) => api.get(`/reels/${id}`).then((r) => r.data),

    uploadReel: (file, caption = '', category = 'General') => {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('caption', caption != null ? String(caption).trim().slice(0, 500) : '');
        formData.append('category', category);
        return api
            .post('/reels/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            })
            .then((r) => r.data);
    },

    like: (id) => api.post(`/reels/like/${id}`).then((r) => r.data),

    comment: (id, text) => api.post(`/reels/comment/${id}`, { text }).then((r) => r.data),

    getComments: (id, params = {}) =>
        api.get(`/reels/${id}/comments`, { params }).then((r) => r.data),

    likeComment: (commentId) => api.post(`/reels/comment/${commentId}/like`).then((r) => r.data),

    share: (id) => api.post(`/reels/share/${id}`).then((r) => r.data),

    recordView: (id, watchedSeconds) =>
        api.post(`/reels/${id}/view`, { watchedSeconds }).then((r) => r.data),

    deleteReel: (id) => api.delete(`/reels/${id}`).then((r) => r.data),

    getMostViewed: (params = {}) =>
        api.get('/reels/most-viewed', { params }).then((r) => r.data),
};
