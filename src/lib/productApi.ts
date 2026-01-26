import axios from 'axios';
import { Product, ProductFilters, ProductsResponse } from '../types/product';

// Use local network IP for mobile devices, localhost for web
// Update this IP to match your computer's local IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// For production, set EXPO_PUBLIC_API_URL environment variable to your production API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productApi = {
  // Helper function to normalize product data (ensure numbers are numbers)
  normalizeProduct: (product: any): Product => {
    return {
      ...product,
      price: Number(product.price) || 0,
      discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      stock: Number(product.stock) || 0,
      reviewCount: Number(product.reviewCount) || 0,
      averageRating: Number(product.averageRating) || 0,
    };
  },

  getAll: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/products?${params.toString()}`);
    const data = response.data;
    return {
      ...data,
      data: data.data?.map((product: any) => productApi.normalizeProduct(product)) || [],
    };
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return productApi.normalizeProduct(response.data);
  },

  getFeatured: async (limit: number = 10): Promise<Product[]> => {
    const response = await api.get(`/products/featured?limit=${limit}`);
    return (response.data || []).map((product: any) => productApi.normalizeProduct(product));
  },

  getByCategory: async (category: string, limit: number = 20): Promise<Product[]> => {
    const response = await api.get(`/products/category/${category}?limit=${limit}`);
    return (response.data || []).map((product: any) => productApi.normalizeProduct(product));
  },
};
