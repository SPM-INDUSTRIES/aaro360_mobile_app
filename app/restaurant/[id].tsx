import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
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
import { Skeleton } from "../../src/components/SkeletonLoader";
import { Theme } from "../../src/styles/theme";
import FloatingCartButton from "../../src/components/FloatingCartButton";
import AddToCartModal from "../../src/components/AddToCartModal";
import { addItemToCart } from "../../src/store/slices/cartSlice";
import { CategoryType } from "../../src/types";
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

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const PAGE_SIZE = 10;

  const buildFilters = useCallback(
    (page: number = 1): FoodItemFilters => {
      const filters: FoodItemFilters = { page, limit: PAGE_SIZE };
      if (searchQuery) filters.search = searchQuery;
      if (selectedCategory) filters.categoryId = parseInt(selectedCategory);
      if (minPrice && !isNaN(parseFloat(minPrice)))
        filters.minPrice = parseFloat(minPrice);
      if (maxPrice && !isNaN(parseFloat(maxPrice)))
        filters.maxPrice = parseFloat(maxPrice);
      return filters;
    },
    [searchQuery, selectedCategory, minPrice, maxPrice],
  );

  useEffect(() => {
    fetchFoodItems(1, false);
  }, [restaurantId, searchQuery, selectedCategory, minPrice, maxPrice]);

  useEffect(() => {
    fetchRestaurantAndCategories();
  }, [restaurantId]);

  const fetchRestaurantAndCategories = async () => {
    try {
      const [restaurantRes, categoriesRes] = await Promise.all([
        vendorApi.getById(restaurantId),
        foodCategoryApi.getAll(),
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
    } catch (error) {
      if (__DEV__) console.error("Failed to fetch restaurant data:", error);
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
        setFoodItems((prev) => [...prev, ...newFoodItems]);
      } else {
        setFoodItems(newFoodItems);
      }

      setTotalItems(total);
    } catch (error) {
      if (__DEV__) console.error("Failed to fetch food items:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && foodItems.length < totalItems) {
      const nextPage = Math.ceil(foodItems.length / PAGE_SIZE) + 1;
      fetchFoodItems(nextPage, true);
    }
  };

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

    // Add variant name to item name
    if (selectedVariant) {
      itemName += ` (${selectedVariant.name})`;
    }

    // Add addons to item name and price
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

    // Determine item type based on category
    const itemType = selectedItem.category.name
      .toLowerCase()
      .includes("grocery")
      ? CategoryType.GROCERY
      : CategoryType.FOOD;

    dispatch(
      addItemToCart({
        itemId: selectedItem.id,
        itemName,
        itemType,
        quantity,
        unitPrice: Number(unitPrice),
        restaurantId: parseInt(restaurantId),
      }),
    )
      .unwrap()
      .catch((error) => {
        Alert.alert("Error", error || "Failed to add item to cart");
      });
  };

  // Validate min/max price
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
      <View style={styles.container}>
        {/* Header Skeleton */}
        <View style={styles.restaurantHeader}>
          <Skeleton height={200} borderRadius={0} />
          <View style={styles.restaurantInfo}>
            <View style={{ marginTop: -40, marginRight: 15 }}>
              <Skeleton width={80} height={80} borderRadius={40} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
              <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        </View>

        {/* Filters Skeleton */}
        <View style={styles.filtersContainer}>
          <Skeleton height={45} style={{ marginBottom: 15 }} />
          <View style={styles.filterRow}>
            <Skeleton height={45} style={{ flex: 1 }} />
            <Skeleton height={45} style={{ flex: 1 }} />
          </View>
        </View>

        {/* Menu Items Skeleton */}
        <View style={styles.menuContainer}>
          <Skeleton width={120} height={24} style={{ marginBottom: 15 }} />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.foodCard, { height: 120 }]}>
              <Skeleton width={120} height={120} borderRadius={0} />
              <View style={{ flex: 1, padding: 12 }}>
                <Skeleton width="70%" height={18} style={{ marginBottom: 8 }} />
                <Skeleton
                  width="40%"
                  height={14}
                  style={{ marginBottom: 12 }}
                />
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
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: restaurant?.name || (loading ? "Loading..." : "Restaurant"),
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: "800" },
        }}
      />
      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView style={styles.container}>
          {/* Restaurant Header */}
          {restaurant && (
            <View style={styles.restaurantHeader}>
              {restaurant.coverImageUrl ? (
                <Image
                  source={{
                    uri:
                      resolveImageUrl(restaurant.coverImageUrl) ??
                      restaurant.coverImageUrl,
                  }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.coverImage,
                    { backgroundColor: Theme.colors.blueLight },
                  ]}
                />
              )}
              <View style={styles.restaurantInfo}>
                <View style={styles.logoContainer}>
                  {restaurant.logoUrl ? (
                    <Image
                      source={{
                        uri:
                          resolveImageUrl(restaurant.logoUrl) ??
                          restaurant.logoUrl,
                      }}
                      style={styles.logo}
                    />
                  ) : (
                    <View style={[styles.logo, styles.placeholderLogo]}>
                      <Text style={styles.logoEmoji}>
                        {restaurant.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.restaurantDetails}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  {restaurant.address && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={Theme.colors.textGray}
                      />
                      <Text style={styles.restaurantAddress}>
                        {restaurant.address}
                      </Text>
                    </View>
                  )}
                  {restaurant.phone && (
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="call-outline"
                        size={14}
                        color={Theme.colors.textGray}
                      />
                      <Text style={styles.restaurantPhone}>
                        {restaurant.phone}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Search and Filters */}
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

            <View style={styles.categoryFilterContainer}>
              <Text style={styles.filterLabel}>Categories</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesScrollContent}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryTab,
                    selectedCategory === "" && styles.categoryTabActive,
                  ]}
                  onPress={() => setSelectedCategory("")}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      selectedCategory === "" && styles.categoryTabTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTab,
                      selectedCategory === cat.id.toString() &&
                        styles.categoryTabActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id.toString())}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        selectedCategory === cat.id.toString() &&
                          styles.categoryTabTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
                {priceError ? (
                  <Text style={styles.errorText}>{priceError}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Food Items */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Menu ({totalItems})</Text>
            {foodItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.foodCard}
                onPress={() => {
                  router.push(`/food-item/${item.id}`);
                }}
              >
                {item.imageUrl ? (
                  <Image
                    source={{
                      uri: resolveImageUrl(item.imageUrl) ?? item.imageUrl,
                    }}
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
            ))}

            {foodItems.length < totalItems && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#124569" />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </TouchableOpacity>
            )}

            {foodItems.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  restaurantHeader: {
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: 250,
  },
  restaurantInfo: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginTop: -40,
    backgroundColor: "#FFFFFF",
    ...Theme.shadows.small,
  },
  logo: {
    width: 74,
    height: 74,
    borderRadius: 37,
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
    fontSize: 24,
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
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  restaurantPhone: {
    fontSize: 14,
    color: "#666",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#000",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  categoryFilterContainer: {
    marginBottom: 15,
  },
  categoriesScroll: {
    marginTop: 0,
  },
  categoriesScrollContent: {
    paddingRight: 20,
    gap: 10,
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
    flex: 1,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: "#666",
  },
  menuContainer: {
    padding: 15,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  foodCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodImage: {
    width: 120,
    height: 120,
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
    padding: 12,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 12,
    color: "#124569",
    marginBottom: 4,
  },
  foodDescription: {
    fontSize: 12,
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
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 10,
  },
  loadMoreText: {
    color: "#124569",
    fontSize: 14,
    fontWeight: "600",
  },
});
