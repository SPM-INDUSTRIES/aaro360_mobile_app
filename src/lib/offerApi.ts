import axios from 'axios';

// Use local network IP for mobile devices, localhost for web
// Update this IP to match your computer's local IP address
// For production, set EXPO_PUBLIC_API_URL environment variable to your production API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Offer {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  linkType?: string;
  linkId?: string;
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  displayLocation: string;
  createdAt: string;
  updatedAt: string;
}

export const offerApi = {
  getCarousel: async (): Promise<Offer[]> => {
    try {
      // Add timestamp to prevent caching
      const response = await api.get('/offers/carousel', {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch carousel offers:', error);
      return [];
    }
  },

  getActive: async (): Promise<Offer[]> => {
    try {
      const response = await api.get('/offers/active');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch active offers:', error);
      return [];
    }
  },
};