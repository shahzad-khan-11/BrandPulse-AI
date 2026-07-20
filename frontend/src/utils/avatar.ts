import api from '../services/api';
import type { User } from '../context/AuthContext';

export const getUserAvatarUrl = (user: User | null | undefined) => {
  if (!user) return '';
  const removed = localStorage.getItem(`avatar-removed-${user._id || user.id}`);
  if (removed === 'true') return '';
  if (user.profileImage) {
    if (user.profileImage.startsWith('http')) {
      return user.profileImage;
    }
    // Dynamically retrieve base URL from API default settings
    const baseURL = api.defaults.baseURL || 'http://localhost:5000/api';
    const host = baseURL.replace('/api', '');
    return `${host}${user.profileImage}`;
  }
  return '';
};

export const getInitials = (name: string | undefined) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
};
