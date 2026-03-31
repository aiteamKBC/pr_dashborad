import apiClient from '../../../backend/lib/api-client';
import type { SystemSettings } from '../../../shared/types/settings';

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/api/v1/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const response = await apiClient.patch<SystemSettings>('/api/v1/settings', settings);
    return response.data;
  },

  resetToDefaults: async (): Promise<SystemSettings> => {
    const response = await apiClient.post<SystemSettings>('/api/v1/settings/reset');
    return response.data;
  },
};
