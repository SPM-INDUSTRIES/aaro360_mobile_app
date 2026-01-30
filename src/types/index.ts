export enum UserRole {
  CUSTOMER = 'customer',
  RIDER = 'rider',
  ADMIN = 'admin',
}

export enum OrderStatus {
  CREATED = 'created',
  ACCEPTED = 'accepted',
  PICKED = 'picked',
  EN_ROUTE = 'en_route',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum CategoryType {
  FOOD = 'food',
  GROCERY = 'grocery',
  MEDICINE = 'medicine',
  ECHANELLING = 'echannelling',
  VEHICLE = 'vehicle',
}

export interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  role: UserRole
  profilePicture?: string
}

export interface OrderItem {
  id: number
  itemName: string
  itemType?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Order {
  id: number
  orderNumber: string
  status: OrderStatus
  customerId: number
  riderId?: number
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  paymentMethod: string
  deliveryAddress: string
  deliveryLatitude: number
  deliveryLongitude: number
  createdAt: string
  estimatedDeliveryMinutes?: number
}

export interface CartItem {
  id?: number
  itemName: string
  itemType: CategoryType
  quantity: number
  unitPrice: number
  restaurantId?: number
}

export interface Restaurant {
  id: number
  name: string
  category: CategoryType
  rating: number
  deliveryTime: number
  deliveryFee: number
  image?: string
  isOpen: boolean
}
