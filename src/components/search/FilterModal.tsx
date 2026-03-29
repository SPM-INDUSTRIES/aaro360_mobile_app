import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native'
import { rs, rf, wp } from "../../utils/responsive"
import { Ionicons } from '@expo/vector-icons'
import { ProductCategory } from '../../types/product'
import { Theme } from '../../styles/theme'

interface FilterModalProps {
  visible: boolean
  onClose: () => void
  filters: {
    rating: number
    brand: string
    category: string
    minPrice: string
    maxPrice: string
  }
  onApplyFilters: (filters: any) => void
}

export default function FilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState(filters)
  const [priceError, setPriceError] = useState('')

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters)
      setPriceError('')
    }
  }, [visible, filters])

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const newFilters = { ...localFilters, [type + 'Price']: value }
    setLocalFilters(newFilters)

    const min = parseFloat(type === 'min' ? value : localFilters.minPrice || '0')
    const max = parseFloat(type === 'max' ? value : localFilters.maxPrice || '0')

    if ((type === 'min' ? value : localFilters.minPrice) &&
      (type === 'max' ? value : localFilters.maxPrice) &&
      !isNaN(min) && !isNaN(max) && min > max) {
      setPriceError('Min should be less than Max')
    } else {
      setPriceError('')
    }
  }

  const handleApply = () => {
    const min = parseFloat(localFilters.minPrice || '0')
    const max = parseFloat(localFilters.maxPrice || '0')

    if (localFilters.minPrice && isNaN(min)) {
      Alert.alert('Invalid Price', 'Please enter a valid minimum price')
      return
    }

    if (localFilters.maxPrice && isNaN(max)) {
      Alert.alert('Invalid Price', 'Please enter a valid maximum price')
      return
    }

    if (min < 0 || (localFilters.maxPrice && max < 0)) {
      Alert.alert('Invalid Price', 'Price cannot be negative')
      return
    }

    if (localFilters.minPrice && localFilters.maxPrice && min > max) {
      Alert.alert('Invalid Price', 'Minimum price cannot be greater than maximum price')
      return
    }

    onApplyFilters(localFilters)
    onClose()
  }

  const handleReset = () => {
    setLocalFilters({
      rating: 0,
      brand: '',
      category: '',
      minPrice: '',
      maxPrice: '',
    })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Category */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScrollView}
                contentContainerStyle={styles.optionsScrollContent}
              >
                {[
                  { id: '', name: 'All' },
                  { id: ProductCategory.FOOD, name: 'Food' },
                  { id: ProductCategory.GROCERY, name: 'Grocery' },
                  { id: ProductCategory.ECHANELLING, name: 'Echannelling' }
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.optionButton,
                      localFilters.category === cat.id && styles.optionButtonActive,
                    ]}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        category: cat.id,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.optionText,
                        localFilters.category === cat.id && styles.optionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range (රු)</Text>
              <View style={styles.priceInputsRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  value={localFilters.minPrice}
                  onChangeText={(text) => handlePriceChange('min', text)}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <View style={styles.priceDash} />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  value={localFilters.maxPrice}
                  onChangeText={(text) => handlePriceChange('max', text)}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
            </View>

            {/* Rating */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Rating</Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      localFilters.rating >= rating && styles.ratingButtonActive,
                    ]}
                    onPress={() =>
                      setLocalFilters({
                        ...localFilters,
                        rating: localFilters.rating === rating ? 0 : rating,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.ratingText,
                        localFilters.rating >= rating && styles.ratingTextActive,
                      ]}
                    >
                      ⭐
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  ratingButton: {
    width: Theme.touchTarget.large,
    height: Theme.touchTarget.large,
    borderRadius: Theme.touchTarget.large / 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: '#FFF9E6',
  },
  ratingText: {
    fontSize: 24,
  },
  ratingTextActive: {
    // No change needed
  },
  categoriesScrollView: {
    marginHorizontal: -20,
  },
  optionsScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    flexDirection: 'row',
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  optionButtonActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.orangeLight,
  },
  optionText: {
    fontSize: rf(Theme.fontSize.md),
    color: '#666',
  },
  optionTextActive: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    fontSize: rf(Theme.fontSize.base),
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  priceDash: {
    width: 15,
    height: 1,
    backgroundColor: '#CCC',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
    paddingBottom: 30,
  },
  resetButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  resetText: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
  },
  applyText: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: '600',
    color: '#FFF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: rf(Theme.fontSize.sm),
    marginTop: 8,
    fontWeight: '600',
  },
})
