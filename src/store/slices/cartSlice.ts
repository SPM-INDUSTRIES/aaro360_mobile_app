import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  total: number
  deliveryFee: number
  discount: number
}

const initialState: CartState = {
  items: [],
  total: 0,
  deliveryFee: 0,
  discount: 0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
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
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.itemName !== action.payload
      )
      cartSlice.caseReducers.calculateTotal(state)
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
    },
    calculateTotal: (state) => {
      const itemsTotal = state.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      )
      state.total = itemsTotal + state.deliveryFee - state.discount
    },
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
