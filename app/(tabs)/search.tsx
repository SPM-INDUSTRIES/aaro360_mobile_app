import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveImageUrl } from "../../src/utils/imageUrl";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../../src/store/store";
import FilterModal from "../../src/components/search/FilterModal";
import { productApi } from "../../src/lib/productApi";
import { foodItemApi, vendorApi } from "../../src/lib/api";
import { Product, ProductCategory } from "../../src/types/product";
import { addItemToCart } from "../../src/store/slices/cartSlice";
import { CategoryType } from "../../src/types";
import FloatingCartButton from "../../src/components/FloatingCartButton";
import { useDebounce } from "../../src/hooks/useDebounce";
import { Theme } from "../../src/styles/theme";
import { rs, rf, wp, hp } from "../../src/utils/responsive";

export default function SearchScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { category: initialCategory, isFeatured } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    rating: 0,
    brand: "",
    category: (initialCategory as string) || "",
    minPrice: "",
    maxPrice: "",
  });
  const [vendors, setVendors] = useState<any[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const PAGE_SIZE = 10;

  useEffect(() => {
    if (initialCategory) {
      setFilters((prev) => ({ ...prev, category: initialCategory as string }));
    }
  }, [initialCategory]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      let itemType: CategoryType;
      if (product.category === ProductCategory.FOOD) {
        itemType = CategoryType.FOOD;
      } else if (product.category === ProductCategory.GROCERY) {
        itemType = CategoryType.GROCERY;
      } else {
        itemType = CategoryType.MEDICINE;
      }

      const isFoodItem = typeof product.id === "string" && product.id.startsWith("food-");
      const itemId = isFoodItem
        ? parseInt(product.id.replace("food-", ""), 10)
        : typeof product.id === "number"
          ? product.id
          : parseInt(String(product.id), 10);

      if (isNaN(itemId)) {
        Alert.alert("Error", "Invalid product ID");
        return;
      }

      const restaurantId = product.vendorId ? Number(product.vendorId) : undefined;

      dispatch(
        addItemToCart({
          itemId,
          itemName: product.name,
          itemType: itemType,
          quantity: 1,
          unitPrice: Number(product.price || 0),
          restaurantId,
        }),
      )
        .unwrap()
        .catch((error) => {
          Alert.alert("Error", error || "Failed to add item to cart");
        });
    },
    [dispatch],
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchSearchResults(1, false);
  }, [debouncedSearchQuery, filters, isFeatured]);

  const applyFilters = (products: Product[]): Product[] => {
    let filtered = [...products];

    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category);
    }

    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min)) {
        filtered = filtered.filter((p) => p.price >= min);
      }
    }

    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max)) {
        filtered = filtered.filter((p) => p.price <= max);
      }
    }

    if (filters.rating > 0) {
      filtered = filtered.filter((p) => (p.averageRating || 0) >= filters.rating);
    }

    if (filters.brand) {
      filtered = filtered.filter((p) => {
        const brandMatch = p.brand?.toLowerCase().includes(filters.brand.toLowerCase());
        const vendorMatch = p.vendor?.name?.toLowerCase().includes(filters.brand.toLowerCase());
        const restaurantMatch = p.restaurant?.toLowerCase().includes(filters.brand.toLowerCase());
        return brandMatch || vendorMatch || restaurantMatch;
      });
    }

    return filtered;
  };

  const fetchSearchResults = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      if (filters.category === ProductCategory.ECHANELLING) {
        setProducts([]);
        try {
          const res = await vendorApi.getAll({ type: "pharmacy" });
          const vendorsData = res.data;
          const vendorList = Array.isArray(vendorsData) ? vendorsData : vendorsData?.data || [];
          setVendors(vendorList);
        } catch (error) {
          if (__DEV__) console.error("Failed to fetch vendors:", error);
          setVendors([]);
        }
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        setHasMore(false);
        return;
      }

      setVendors([]);
      let allProducts: Product[] = [];

      const categoryFilter = filters.category ? (filters.category as ProductCategory) : undefined;
      const shouldFetchProducts = !categoryFilter || categoryFilter === ProductCategory.FOOD || categoryFilter === ProductCategory.GROCERY;

      if (shouldFetchProducts) {
        try {
          const response = await productApi.getAll({
            search: debouncedSearchQuery,
            page: page,
            limit: PAGE_SIZE,
            category: categoryFilter === ProductCategory.FOOD || categoryFilter === ProductCategory.GROCERY ? categoryFilter : undefined,
          });

          const productsData = response.data || [];
          allProducts = productsData;

          if (categoryFilter) {
            allProducts = allProducts.filter((p) => p.category === categoryFilter);
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to search products:", error);
        }
      }

      const shouldFetchFoodItems = !categoryFilter || categoryFilter === ProductCategory.FOOD || categoryFilter === ProductCategory.GROCERY;

      if (shouldFetchFoodItems) {
        try {
          const categoryTypeFilter = categoryFilter === ProductCategory.FOOD
            ? "food"
            : categoryFilter === ProductCategory.GROCERY
              ? "grocery"
              : undefined;

          const foodItemsRes = await foodItemApi.getAll({
            page,
            limit: PAGE_SIZE,
            search: debouncedSearchQuery || undefined,
            categoryType: categoryTypeFilter,
          });

          const responseData = foodItemsRes.data;
          const foodItems = Array.isArray(responseData?.data) ? responseData.data : [];

          const itemsAsProducts: Product[] = foodItems.map((item: any) => {
            let productCategory = ProductCategory.FOOD;
            if (item.category?.type === "grocery") {
              productCategory = ProductCategory.GROCERY;
            } else if (item.category?.type === "food") {
              productCategory = ProductCategory.FOOD;
            }

            return {
              id: `food-${item.id}`,
              name: item.name,
              description: item.description || "",
              category: productCategory,
              subCategory: item.category?.name || "",
              price: Number(item.price) || 0,
              brand: "",
              restaurant: item.restaurant?.name || "",
              vendorId: item.restaurantId,
              location: item.restaurant?.address || "",
              mainImage: item.imageUrl || "",
              images: [],
              stock: item.quantity || (item.isAvailable ? 1 : 0),
              inStock: item.isAvailable && (item.quantity || 0) > 0,
              isActive: item.isAvailable,
              tags: [],
              isFeatured: false,
              discountPrice: undefined,
              reviewCount: 0,
              averageRating: 0,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          });

          allProducts = [...allProducts, ...itemsAsProducts];
        } catch (error) {
          if (__DEV__) console.error("Failed to search food items:", error);
        }
      }

      const uniqueProducts = allProducts.filter(
        (product, index, self) => index === self.findIndex((p) => p.id === product.id),
      );

      const filteredProducts = applyFilters(uniqueProducts);

      if (append) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id.toString()));
          const uniqueNewProducts = filteredProducts.filter((p) => !existingIds.has(p.id.toString()));
          return [...prev, ...uniqueNewProducts];
        });
      } else {
        setProducts(filteredProducts);
      }

      setHasMore(uniqueProducts.length >= PAGE_SIZE);
    } catch (error) {
      if (__DEV__) console.error("Failed to search:", error);
      setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchSearchResults(1, false);
  }, [debouncedSearchQuery, filters, isFeatured]);

  const loadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSearchResults(nextPage, true);
    }
  }, [loadingMore, loading, hasMore, currentPage]);

  const getCategoryTitle = () => {
    if (filters.category === ProductCategory.FOOD) return "Food Products";
    if (filters.category === ProductCategory.GROCERY) return "Grocery Products";
    if (filters.category === ProductCategory.ECHANELLING) return "Echannelling Services";
    if (isFeatured === "true") return "Featured Products";
    return "Explore All Product";
  };

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={styles.productItem}
        activeOpacity={0.7}
        onPress={() => {
          if (typeof item.id === "string" && item.id.startsWith("food-")) {
            const foodItemId = item.id.replace("food-", "");
            router.push(`/food-item/${foodItemId}`);
          } else {
            router.push(`/product/${item.id}`);
          }
        }}
      >
        <View style={styles.productImageContainer}>
          {item.mainImage ? (
            <Image
              source={{ uri: resolveImageUrl(item.mainImage) ?? item.mainImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={32} color="#CCC" />
            </View>
          )}
        </View>
        <View style={styles.productDetails}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {(item.vendor?.name || item.restaurant) && (
              <View style={styles.vendorRow}>
                <Ionicons name="location" size={14} color="#999" />
                <Text style={styles.productVendor} numberOfLines={1}>
                  {item.vendor?.name || item.restaurant}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.productFooter}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>
                රු{Number(item.price || 0).toFixed(2)}
              </Text>
              {item.discountPrice && (
                <Text style={styles.productOriginalPrice}>
                  රු{Number(item.discountPrice || 0).toFixed(2)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router, handleAddToCart],
  );

  const handleCallVendor = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderVendor = useCallback(
    ({ item }: { item: any }) => {
      const imageUrl = item.coverImageUrl || item.logoUrl;
      const isValidImage = imageUrl && (imageUrl.startsWith("http") || imageUrl.startsWith("data:") || imageUrl.startsWith("/"));
      const resolvedUrl = imageUrl ? (resolveImageUrl(imageUrl) ?? imageUrl) : null;

      return (
        <TouchableOpacity
          style={styles.vendorCard}
          onPress={() => item.phone && handleCallVendor(item.phone)}
          activeOpacity={0.7}
        >
          {isValidImage && resolvedUrl ? (
            <Image source={{ uri: resolvedUrl }} style={styles.vendorImage} resizeMode="cover" />
          ) : (
            <View style={[styles.vendorImage, styles.placeholderImage]}>
              <Ionicons name="medical" size={40} color="#8B5CF6" />
            </View>
          )}
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{item.name}</Text>
            {item.address && (
              <Text style={styles.vendorAddress} numberOfLines={2}>{item.address}</Text>
            )}
            {item.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCallVendor(item.phone!)}
              >
                <Ionicons name="call" size={20} color="#FFF" />
                <Text style={styles.callButtonText}>Call {item.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [],
  );

  const VendorListHeader = useCallback(
    () => (
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {vendors.length} {vendors.length === 1 ? "hospital" : "hospitals"}
        </Text>
      </View>
    ),
    [vendors.length],
  );

  const VendorListEmpty = useCallback(
    () => {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f27424" />
            <Text style={styles.loadingText}>Loading hospitals...</Text>
          </View>
        );
      }
      return (
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No hospitals found</Text>
          <Text style={styles.emptySubtext}>Try selecting a different category</Text>
        </View>
      );
    },
    [loading],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.resultsCountContainer}>
        <Text style={styles.resultsCount}>
          {products.length} {products.length === 1 ? "result" : "results"}
        </Text>
      </View>
    ),
    [products.length],
  );

  const ListFooter = useCallback(
    () => {
      if (loadingMore) {
        return (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="large" color="#124569" />
            <Text style={styles.loadingMoreText}>Loading more products...</Text>
          </View>
        );
      }
      if (products.length > 0 && !hasMore) {
        return (
          <View style={styles.endOfListContainer}>
            <Text style={styles.endOfListText}>No more products</Text>
          </View>
        );
      }
      return null;
    },
    [loadingMore, products.length, hasMore],
  );

  const ListEmpty = useCallback(
    () => {
      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#f27424" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        );
      }
      if (searchQuery.length === 0 && !filters.category && !isFeatured) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="compass-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Exploring Products...</Text>
            <Text style={styles.emptySubtext}>No products available at the moment.</Text>
          </View>
        );
      }
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      );
    },
    [loading, searchQuery.length, filters.category, isFeatured],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchHeader}>
        <View style={styles.categoryTitleContainer}>
          <Text style={styles.categoryTitle}>{getCategoryTitle()}</Text>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                filters.category
                  ? `Search ${filters.category}...`
                  : "Search for Pizza, Painkiller, etc..."
              }
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options" size={24} color="#f27424" />
          </TouchableOpacity>
        </View>
      </View>

      {filters.category === ProductCategory.ECHANELLING ? (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.id}
          renderItem={renderVendor}
          ListHeaderComponent={VendorListHeader}
          ListEmptyComponent={VendorListEmpty}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={ListEmpty}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApplyFilters={setFilters}
      />
      <FloatingCartButton />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchHeader: {
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryTitleContainer: {
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#124569",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    flex: 1,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: rf(Theme.fontSize.base),
    color: "#000000",
    paddingVertical: 12,
  },
  filterButton: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  resultsCountContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsCount: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  productImageContainer: {
    width: rs(120),
    height: rs(150),
    backgroundColor: "#F8F8F8",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  productDetails: {
    flex: 1,
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    justifyContent: "space-between",
  },
  productHeader: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 22,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  productVendor: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  productPrice: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "700",
    color: "#124569",
  },
  productOriginalPrice: {
    fontSize: rf(Theme.fontSize.md),
    color: "#999",
    textDecorationLine: "line-through",
    fontWeight: "400",
  },
  addButton: {
    backgroundColor: "#f27424",
    width: Theme.touchTarget.medium,
    height: Theme.touchTarget.medium,
    borderRadius: Theme.touchTarget.medium / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#f27424",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
    fontSize: 15,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 24,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  vendorCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  vendorImage: {
    width: rs(100),
    height: rs(120),
    backgroundColor: "#F8F8F8",
  },
  vendorInfo: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  vendorName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  vendorAddress: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#124569",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  callButtonText: {
    color: "#FFF",
    fontSize: rf(Theme.fontSize.md),
    fontWeight: "600",
  },
});