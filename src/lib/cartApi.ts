import api from './api'

export interface CartItem {
    id: number
    itemName: string
    itemType: string
    unitPrice: number
    quantity: number
    restaurantId?: number
    createdAt: string
    updatedAt: string
}

export interface AddToCartRequest {
    itemName: string
    itemType: string
    unitPrice: number
    quantity: number
    restaurantId?: number
}

export interface UpdateCartItemRequest {
    quantity: number
}

export const cartApi = {
    // Get all cart items
    getCart: async (): Promise<CartItem[]> => {
        const response = await api.get('/cart')
        return response.data
    },

    // Add item to cart
    addToCart: async (item: AddToCartRequest): Promise<CartItem> => {
        const response = await api.post('/cart', item)
        return response.data
    },

    // Update cart item quantity
    updateCartItem: async (itemId: number, data: UpdateCartItemRequest): Promise<CartItem> => {
        const response = await api.put(`/cart/${itemId}`, data)
        return response.data
    },

    // Remove item from cart
    removeFromCart: async (itemId: number): Promise<void> => {
        await api.delete(`/cart/${itemId}`)
    },

    // Clear entire cart
    clearCart: async (): Promise<void> => {
        await api.delete('/cart')
    },

    // Get cart total
    getCartTotal: async (): Promise<number> => {
        const response = await api.get('/cart/total')
        return response.data.total
    },
}
