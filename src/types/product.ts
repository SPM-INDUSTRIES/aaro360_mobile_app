export enum ProductCategory {
  FOOD = 'food',
  GROCERY = 'grocery',
  MEDICINE = 'medicine',
  ECHANELLING = 'echannelling',
  VEHICLE = 'vehicle',
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  subCategory?: string;
  price: number;
  brand?: string;
  restaurant?: string;
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
    type: string;
  };
  location?: string;
  images?: string[];
  mainImage?: string;
  stock: number;
  inStock: boolean;
  isActive: boolean;
  tags?: string[];
  reviewCount: number;
  averageRating: number;
  isFeatured: boolean;
  discountPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: ProductCategory;
  subCategory?: string;
  restaurant?: string;
  location?: string;
  isFeatured?: boolean;
  inStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}
