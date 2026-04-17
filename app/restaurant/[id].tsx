import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { resolveImageUrl } from "../../src/utils/imageUrl";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../../src/store/store";
import { Skeleton, SkeletonProvider } from "../../src/components/SkeletonLoader";
import { Theme } from "../../src/styles/theme";
import FloatingCartButton from "../../src/components/FloatingCartButton";
import { rs, rf, wp, hp } from "../../src/utils/responsive";
import AddToCartModal from "../../src/components/AddToCartModal";
import { addItemToCart } from "../../src/store/slices/cartSlice";
import { CategoryType } from "../../src/types";
import { useDebounce } from "../../src/hooks/useDebounce";
import {
  vendorApi,
  foodItemApi,
  foodCategoryApi,
  FoodItemFilters,
} from "../../src/lib/api";

interface FoodCategory {
  id: number;
  name: string;
}

interface FoodAddon {
  id: number;
  name: string;
  price: number;
}

interface FoodItemVariant {
  id: number;
  name: string;
  price: number;
  quantity: number;
  isActive: boolean;
}

interface FoodItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  isAvailable: boolean;
  category: FoodCategory;
  addons: FoodAddon[];
  variants?: FoodItemVariant[];
}

interface Restaurant {
  id: number;
  name: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: string;
  phone?: string;
}

const CategoryTabs = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: { 
  categories: FoodCategory[]; 
  selectedCategory: string; 
  onSelectCategory: (id: string) => void;
}) => {
  return (
    <View style={styles.categoryFilterContainer}>
      <Text style={styles.filterLabel}>Categories</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
      >
        <TouchableOpacity
          style={[styles.categoryTab, selectedCategory === "" && styles.categoryTabActive]}
          onPress={() => onSelectCategory("")}
        >
          <Text style={[styles.categoryTabText, selectedCategory === "" && styles.categoryTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryTab,
              selectedCategory === cat.id.toString() && styles.categoryTabActive,
            ]}
            onPress={() => onSelectCategory(cat.id.toString())}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat.id.toString() && styles.categoryTabTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const FiltersSection = ({ 
  searchQuery, 
  setSearchQuery, 
  minPrice, 
  setMinPrice, 
  maxPrice, 
  setMaxPrice, 
  priceError 
}: { 
  searchQuery: string; 
  setSearchQuery: (v: string) => void; 
  minPrice: string; 
  setMinPrice: (v: string) => void; 
  maxPrice: string; 
  setMaxPrice: (v: string) => void; 
  priceError: string;
}) => {
  return (
    <View style={styles.filtersContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Price Range</Text>
          <View style={styles.priceFilters}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min"
              value={minPrice}
              onChangeText={setMinPrice}
              keyboardType="numeric"
            />
            <Text style={styles.priceSeparator}>-</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max"
              value={maxPrice}
              onChangeText={setMaxPrice}
              keyboardType="numeric"
            />
          </View>
          {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
        </View>
      </View>
    </View>
  );
};



export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [allRestaurantItems, setAllRestaurantItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<FoodCategory[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const PAGE_SIZE = 10;

  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const debouncedMinPrice = useDebounce(minPrice, 500);
  const debouncedMaxPrice = useDebounce(maxPrice, 500);

  const buildFilters = useCallback(
    (page: number = 1): FoodItemFilters => {
      const filters: FoodItemFilters = { page, limit: PAGE_SIZE };
      if (debouncedSearchQuery) filters.search = debouncedSearchQuery;
      if (selectedCategory) filters.categoryId = parseInt(selectedCategory);
      if (debouncedMinPrice && !isNaN(parseFloat(debouncedMinPrice)))
        filters.minPrice = parseFloat(debouncedMinPrice);
      if (debouncedMaxPrice && !isNaN(parseFloat(debouncedMaxPrice)))
        filters.maxPrice = parseFloat(debouncedMaxPrice);
      return filters;
    },
    [debouncedSearchQuery, selectedCategory, debouncedMinPrice, debouncedMaxPrice],
  );

  useEffect(() => {
    fetchFoodItems(1, false);
  }, [restaurantId, debouncedSearchQuery, selectedCategory, debouncedMinPrice, debouncedMaxPrice]);

  // Filter categories to only show those with items in this restaurant
  useEffect(() => {
    if (allRestaurantItems.length > 0 && categories.length > 0) {
      const categoryIds = new Set(allRestaurantItems.map(item => item.category?.id).filter(Boolean));
      const filtered = categories.filter(cat => categoryIds.has(cat.id));
      setAvailableCategories(filtered);
    } else if (categories.length > 0) {
      setAvailableCategories(categories);
    } else {
      setAvailableCategories([]);
    }
  }, [allRestaurantItems, categories]);

  useEffect(() => {
    fetchRestaurantAndCategories();
  }, [restaurantId]);

  const fetchRestaurantAndCategories = async () => {
    try {
      const [restaurantRes, categoriesRes, allItemsRes] = await Promise.all([
        vendorApi.getById(restaurantId),
        foodCategoryApi.getAll(),
        foodItemApi.getByRestaurant(restaurantId, { limit: 100 }),
      ]);

      const restaurantData = restaurantRes.data;
      const categoriesData = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : [];

      setRestaurant(restaurantData);

      const targetType =
        restaurantData?.type === "grocery_store" ? "grocery" : "food";
      const filteredCategories = categoriesData.filter(
        (cat: { type: string }) => cat.type === targetType,
      );
      setCategories(filteredCategories);

      const allItemsData = allItemsRes.data;
      const allItems = Array.isArray(allItemsData?.data) ? allItemsData.data : [];
      setAllRestaurantItems(allItems);
    } catch (error) {
      if (__DEV__) console.error("Failed to fetch restaurant data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchFoodItems = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const filters = buildFilters(page);
      const foodItemsRes = await foodItemApi.getByRestaurant(
        restaurantId,
        filters,
      );

      const responseData = foodItemsRes.data;
      const newFoodItems = Array.isArray(responseData?.data)
        ? responseData.data
        : [];
      const total = responseData?.total || 0;

      if (append) {
        setFoodItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNewItems = newFoodItems.filter((item) => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setFoodItems(newFoodItems);
      }

      setTotalItems(total);
    } catch (error) {
      if (__DEV__) console.error("Failed to fetch food items:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFoodItems(1, false);
  }, [buildFilters]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && foodItems.length < totalItems) {
      const nextPage = Math.ceil(foodItems.length / PAGE_SIZE) + 1;
      fetchFoodItems(nextPage, true);
    }
  }, [loadingMore, loading, foodItems.length, totalItems]);

  const handleAddToCart = (item: FoodItem) => {
    setSelectedItem(item);
    setShowAddToCartModal(true);
  };

  const handleConfirmAddToCart = (
    quantity: number,
    selectedVariant?: FoodItemVariant,
    selectedAddons?: number[],
  ) => {
    if (!selectedItem) return;

    let itemName = selectedItem.name;
    let unitPrice = selectedVariant?.price || selectedItem.price;

    if (selectedVariant) {
      itemName += ` (${selectedVariant.name})`;
    }

    if (selectedAddons && selectedAddons.length > 0) {
      const addonNames = selectedAddons
        .map((id) => selectedItem.addons.find((a) => a.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      itemName += ` with ${addonNames}`;

      const addonsTotal = selectedAddons.reduce((sum, id) => {
        const addon = selectedItem.addons.find((a) => a.id === id);
        return sum + (addon?.price || 0);
      }, 0);
      unitPrice += addonsTotal;
    }

    const itemType = selectedItem.category.name
      .toLowerCase()
      .includes("grocery")
      ? CategoryType.GROCERY
      : CategoryType.FOOD;

    const parsedRestaurantId = restaurantId ? parseInt(restaurantId, 10) : undefined;
    const validRestaurantId = parsedRestaurantId && !isNaN(parsedRestaurantId) ? parsedRestaurantId : undefined;

    dispatch(
      addItemToCart({
        itemId: selectedItem.id,
        itemName,
        itemType,
        quantity,
        unitPrice: Number(unitPrice),
        restaurantId: validRestaurantId,
      }),
    )
      .unwrap()
      .catch((error) => {
        Alert.alert("Error", error || "Failed to add item to cart");
      });
  };

  useEffect(() => {
    if (minPrice && maxPrice) {
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      if (!isNaN(min) && !isNaN(max) && min > max) {
        setPriceError("Min should be less than Max");
      } else {
        setPriceError("");
      }
    } else {
      setPriceError("");
    }
  }, [minPrice, maxPrice]);

  const renderSkeleton = () => {
    return (
      <SkeletonProvider>
        <View style={styles.container}>
          <View style={styles.restaurantHeader}>
            <View style={styles.restaurantInfo}>
              <View style={styles.logoContainer}>
                <Skeleton width={80} height={80} borderRadius={40} />
              </View>
              <View style={styles.restaurantDetails}>
                <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="40%" height={14} />
              </View>
            </View>
          </View>

          <View style={styles.filtersContainer}>
            <Skeleton height={45} style={{ marginBottom: 15 }} />
            <View style={styles.filterRow}>
              <Skeleton height={45} style={{ flex: 1 }} />
              <Skeleton height={45} style={{ flex: 1 }} />
            </View>
          </View>

          <View style={styles.listContent}>
            <Skeleton width={120} height={24} style={{ marginBottom: 15 }} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.foodCard, { height: 120 }]}>
                <Skeleton width={120} height={120} borderRadius={0} />
                <View style={{ flex: 1, padding: 12 }}>
                  <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "auto",
                    }}
                  >
                    <Skeleton width={60} height={24} />
                    <Skeleton width={36} height={36} borderRadius={18} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </SkeletonProvider>
    );
  };

  const renderFoodItem = useCallback(
    ({ item }: { item: FoodItem }) => (
      <TouchableOpacity
        style={styles.foodCard}
        onPress={() => router.push(`/food-item/${item.id}`)}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: resolveImageUrl(item.imageUrl) ?? item.imageUrl }}
            style={styles.foodImage}
          />
        ) : (
          <View style={[styles.foodImage, styles.placeholderImage]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>
          <Text style={styles.foodCategory}>{item.category.name}</Text>
          {item.description && (
            <Text style={styles.foodDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.addons.length > 0 && (
            <View style={styles.addonsContainer}>
              <Text style={styles.addonsLabel}>Add-ons available</Text>
            </View>
          )}
          <View style={styles.foodFooter}>
            <Text style={styles.foodPrice}>
              රු{Number(item.price || 0).toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={(e) => {
                e.stopPropagation();
                handleAddToCart(item);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.menuTitleContainer}>
        <Text style={styles.menuTitle}>Menu ({totalItems})</Text>
      </View>
    ),
    [totalItems],
  );

  const ListFooter = useCallback(
    () => {
      if (loadingMore) {
        return (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="large" color="#124569" />
            <Text style={styles.loadingMoreText}>Loading more items...</Text>
          </View>
        );
      }
      if (foodItems.length > 0 && foodItems.length >= totalItems) {
        return (
          <View style={styles.endOfListContainer}>
            <Text style={styles.endOfListText}>No more items</Text>
          </View>
        );
      }
      return null;
    },
    [loadingMore, foodItems.length, totalItems],
  );

  const ListEmpty = useCallback(
    () => {
      if (loading) {
        return (
          <View style={styles.dataLoadingContainer}>
            <ActivityIndicator size="large" color="#124569" />
            <Text style={styles.dataLoadingText}>Loading items...</Text>
          </View>
        );
      }
      return (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No items found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
        </View>
      );
    },
    [loading],
  );

  if (initialLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        {renderSkeleton()}
      </>
    );
  }

return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.container}>
        {/* Restaurant Header - Outside FlatList */}
        {restaurant && (
          <View style={styles.restaurantHeader}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Theme.colors.deepBlue} />
            </TouchableOpacity>
            <View style={styles.restaurantInfo}>
              <View style={styles.logoContainer}>
                {restaurant.logoUrl ? (
                  <Image
                    source={{
                      uri: resolveImageUrl(restaurant.logoUrl) ?? restaurant.logoUrl,
                    }}
                    style={styles.logo}
                  />
                ) : (
                  <View style={[styles.logo, styles.placeholderLogo]}>
                    <Text style={styles.logoEmoji}>{restaurant.name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.restaurantDetails}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                {restaurant.address && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={Theme.colors.textGray} />
                    <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
                  </View>
                )}
                {restaurant.phone && (
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={14} color={Theme.colors.textGray} />
                    <Text style={styles.restaurantPhone}>{restaurant.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Category Tabs - Outside FlatList to maintain scroll position */}
        <View style={styles.stickyCategoryContainer}>
          <CategoryTabs
            categories={availableCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>

        {/* Filters - Outside FlatList to maintain input focus */}
        <FiltersSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          priceError={priceError}
        />

        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFoodItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
/>
      </View>

      <AddToCartModal
        visible={showAddToCartModal}
        onClose={() => setShowAddToCartModal(false)}
        item={selectedItem}
        onAddToCart={handleConfirmAddToCart}
      />
      <FloatingCartButton />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flatList: {
    flex: 1,
  },
  stickyCategoryContainer: {
    backgroundColor: "#FFFFFF",
  },
  restaurantHeader: {
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    overflow: "hidden",
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
    marginBottom: 10,
  },
  restaurantInfo: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  logoContainer: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    marginRight: 15,
    backgroundColor: "#FFFFFF",
    ...Theme.shadows.small,
  },
  logo: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
  },
  placeholderLogo: {
    backgroundColor: Theme.colors.blueLight,
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 32,
    fontWeight: "bold",
    color: Theme.colors.deepBlue,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: rf(Theme.fontSize.xxl),
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 5,
  },
  restaurantAddress: {
    fontSize: rf(Theme.fontSize.md),
    color: "#666",
    flex: 1,
  },
  restaurantPhone: {
    fontSize: rf(Theme.fontSize.md),
    color: "#666",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    paddingBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: rf(Theme.fontSize.base),
    color: "#000",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 5,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: rf(Theme.fontSize.sm),
    color: "#666",
    marginBottom: 8,
  },
  categoryFilterContainer: {
    padding: 15,
    paddingBottom: 0,
  },
  categoriesScrollContent: {
    paddingRight: 20,
    gap: 10,
    flexDirection: "row",
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryTabActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  categoryTabTextActive: {
    color: "#FFF",
  },
  priceFilters: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInput: {
    height: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: rf(Theme.fontSize.md),
    backgroundColor: "#FFFFFF",
    textAlignVertical: "center",
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: "#666",
  },
  menuTitleContainer: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 5,
    backgroundColor: "#FFFFFF",
  },
  menuTitle: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: "bold",
    color: "#000",
  },
  listContent: {
    paddingBottom: 20,
  },
  foodCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodImage: {
    width: rs(120),
    height: rs(120),
  },
  placeholderImage: {
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  foodInfo: {
    flex: 1,
    padding: 14,
  },
  foodName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: rf(Theme.fontSize.sm),
    color: "#124569",
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: rf(Theme.fontSize.sm),
    color: "#666",
    marginBottom: 8,
  },
  addonsContainer: {
    marginBottom: 8,
  },
  addonsLabel: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },
  foodFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodPrice: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "bold",
    color: "#124569",
  },
  addButton: {
    backgroundColor: "#124569",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "600",
    color: "#666",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: rf(Theme.fontSize.md),
    color: "#999",
    marginTop: 5,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 6,
    fontWeight: "600",
  },
  dataLoadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  dataLoadingText: {
    marginTop: 12,
    fontSize: rf(Theme.fontSize.md),
    color: "#666",
    fontWeight: "500",
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: rf(Theme.fontSize.md),
    color: "#666",
    fontWeight: "500",
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    fontSize: rf(Theme.fontSize.md),
    color: "#999",
    fontWeight: "500",
  },
});
