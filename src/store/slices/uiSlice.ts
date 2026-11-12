import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'

const HAS_SEEN_ONBOARDING_KEY = 'aaro360_has_seen_onboarding'

interface UiState {
  // null = not yet loaded from storage
  hasSeenOnboarding: boolean | null
  onboardingLoaded: boolean
}

const initialState: UiState = {
  hasSeenOnboarding: null,
  onboardingLoaded: false,
}

/**
 * Load the "has seen onboarding" flag from device storage on app start.
 */
export const loadOnboardingStatus = createAsyncThunk(
  'ui/loadOnboardingStatus',
  async () => {
    try {
      const value = await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY)
      return value === 'true'
    } catch {
      // If storage fails, treat as already seen so we never trap the user.
      return true
    }
  }
)

/**
 * Mark onboarding as completed (persist + update state).
 */
export const completeOnboarding = createAsyncThunk(
  'ui/completeOnboarding',
  async () => {
    try {
      await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true')
    } catch {
      // Ignore persistence errors; state still updates for this session.
    }
    return true
  }
)

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setHasSeenOnboarding(state, action: PayloadAction<boolean>) {
      state.hasSeenOnboarding = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOnboardingStatus.fulfilled, (state, action) => {
        state.hasSeenOnboarding = action.payload
        state.onboardingLoaded = true
      })
      .addCase(loadOnboardingStatus.rejected, (state) => {
        state.hasSeenOnboarding = true
        state.onboardingLoaded = true
      })
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.hasSeenOnboarding = true
      })
  },
})

export const { setHasSeenOnboarding } = uiSlice.actions
export default uiSlice.reducer
