import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { CartItem, CategoryType } from '@/types'
import { cartApi, AddToCartRequest, CartItem as ApiCartItem } from '../../lib/cartApi'

interface CartState {
  items: CartItem[]
  total: number
  deliveryFee: number
  discount: number
  loading: boolean
  error: string | null
  synced: boolean
}

const initialState: CartState = {
  items: [],
  total: 0,
  deliveryFee: 0,
  discount: 0,
  loading: false,
  error: null,
  synced: false,
}

// Async thunks for API calls
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const items = await cartApi.getCart()
      return items
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart')
    }
  }
)

export const addItemToCart = createAsyncThunk(
  'cart/addItem',
  async (item: AddToCartRequest, { rejectWithValue }) => {
    try {
      const cartItem = await cartApi.addToCart(item)
      return cartItem
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add item to cart')
    }
  }
)

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ id, quantity }: { id: number; quantity: number }, { rejectWithValue }) => {
    try {
      const cartItem = await cartApi.updateCartItem(id, { quantity })
      return cartItem
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update cart item')
    }
  }
)

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (id: number, { rejectWithValue }) => {
    try {
      await cartApi.removeFromCart(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove item from cart')
    }
  }
)

export const clearCartAsync = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      await cartApi.clearCart()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear cart')
    }
  }
)


// Helper function to convert API cart item to local cart item
const convertApiCartItem = (apiItem: ApiCartItem): CartItem => ({
  id: apiItem.id,
  itemName: apiItem.itemName,
  itemType: apiItem.itemType as CategoryType,
  quantity: apiItem.quantity,
  unitPrice: apiItem.unitPrice,
  restaurantId: apiItem.restaurantId,
})

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Local-only actions (for offline support)
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        (item) => item.itemName === action.payload.itemName
      )
      if (existingItem) {
        existingItem.quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }
      cartSlice.caseReducers.calculateTotal(state)
      state.synced = false
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.itemName !== action.payload
      )
      cartSlice.caseReducers.calculateTotal(state)
      state.synced = false
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ itemName: string; quantity: number }>
    ) => {
      const item = state.items.find(
        (item) => item.itemName === action.payload.itemName
      )
      if (item) {
        item.quantity = action.payload.quantity
        if (item.quantity <= 0) {
          state.items = state.items.filter(
            (i) => i.itemName !== action.payload.itemName
          )
        }
      }
      cartSlice.caseReducers.calculateTotal(state)
      state.synced = false
    },
    setDeliveryFee: (state, action: PayloadAction<number>) => {
      state.deliveryFee = action.payload
      cartSlice.caseReducers.calculateTotal(state)
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload
      cartSlice.caseReducers.calculateTotal(state)
    },
    clearCart: (state) => {
      state.items = []
      state.total = 0
      state.deliveryFee = 0
      state.discount = 0
      state.synced = false
    },
    calculateTotal: (state) => {
      const itemsTotal = state.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      )
      state.total = itemsTotal + state.deliveryFee - state.discount
    },
  },
  extraReducers: (builder) => {
    // Fetch cart
    builder.addCase(fetchCart.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.items = action.payload.map(convertApiCartItem)
      state.loading = false
      state.synced = true
      cartSlice.caseReducers.calculateTotal(state)
    })
    builder.addCase(fetchCart.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Add item
    builder.addCase(addItemToCart.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(addItemToCart.fulfilled, (state, action) => {
      const convertedItem = convertApiCartItem(action.payload)
      const existingItem = state.items.find(
        (item) => item.id === convertedItem.id
      )
      if (existingItem) {
        existingItem.quantity = convertedItem.quantity
        existingItem.unitPrice = convertedItem.unitPrice
      } else {
        state.items.push(convertedItem)
      }
      state.loading = false
      state.synced = true
      cartSlice.caseReducers.calculateTotal(state)
    })
    builder.addCase(addItemToCart.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Update quantity
    builder.addCase(updateCartItemQuantity.fulfilled, (state, action) => {
      const convertedItem = convertApiCartItem(action.payload)
      const item = state.items.find((item) => item.id === convertedItem.id)
      if (item) {
        item.quantity = convertedItem.quantity
      }
      state.synced = true
      cartSlice.caseReducers.calculateTotal(state)
    })

    // Remove item
    builder.addCase(removeCartItem.fulfilled, (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload)
      state.synced = true
      cartSlice.caseReducers.calculateTotal(state)
    })

    // Clear cart
    builder.addCase(clearCartAsync.fulfilled, (state) => {
      state.items = []
      state.total = 0
      state.deliveryFee = 0
      state.discount = 0
      state.synced = true
    })
  },
})

export const {
  addItem,
  removeItem,
  updateQuantity,
  setDeliveryFee,
  setDiscount,
  clearCart,
} = cartSlice.actions

export default cartSlice.reducer
