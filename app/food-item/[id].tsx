import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  Platform,
  Dimensions,
} from "react-native";
import { resolveImageUrl } from "../../src/utils/imageUrl";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../../src/store/store";
import { addItemToCart } from "../../src/store/slices/cartSlice";
import { CategoryType } from "../../src/types";
import { Skeleton, SkeletonProvider } from "../../src/components/SkeletonLoader";
import { Theme } from "../../src/styles/theme";
import { rf, rs, hp, wp } from "../../src/utils/responsive";
import {
  ProductHeroImage,
  ProductRating,
  ExtrasScrollSection,
  FloatingCartBar,
  BadgeType,
} from "../../src/components/product";
import FloatingCartButton from "../../src/components/FloatingCartButton";
import { foodItemApi } from "../../src/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_TABLET = SCREEN_WIDTH >= 768;

interface FoodCategory {
  id: number;
  name: string;
  type: string;
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

interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
}

interface FoodItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  isAvailable: boolean;
  quantity: number;
  category: FoodCategory;
  restaurant: Restaurant;
  addons: FoodAddon[];
  variants: FoodItemVariant[];
}

export default function FoodItemDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const itemId = params.id as string;

  const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] =
    useState<FoodItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    fetchFoodItem();
  }, [itemId]);

  const fetchFoodItem = async () => {
    try {
      setLoading(true);
      const response = await foodItemApi.getById(Number(itemId));
      const data = response.data;
      setFoodItem(data);

      if (data.variants && data.variants.length > 0) {
        const firstActiveVariant = data.variants.find(
          (v: FoodItemVariant) => v.isActive,
        );
        if (firstActiveVariant) {
          setSelectedVariant(firstActiveVariant);
        }
      }
    } catch (error) {
      console.error("Failed to fetch food item:", error);
      Alert.alert("Error", "Failed to load food item details");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!foodItem) return;
    try {
      await Share.share({
        message: `Check out ${foodItem.name} at ${foodItem.restaurant.name} on Aaro 360!`,
        title: foodItem.name,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const getCurrentPrice = (): number => {
    if (selectedVariant) {
      return Number(selectedVariant.price) || 0;
    }
    return Number(foodItem?.price) || 0;
  };

  const getTotalPrice = (): number => {
    const basePrice = getCurrentPrice();
    const addonsPrice = selectedAddons.reduce((sum, addonId) => {
      const addon = foodItem?.addons.find((a) => a.id === addonId);
      return sum + (Number(addon?.price) || 0);
    }, 0);
    return (basePrice + addonsPrice) * quantity;
  };

  const toggleAddon = (addonId: number) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId],
    );
  };

  const handleAddToCart = async () => {
    if (!foodItem) return;

    const isSoldOut = foodItem.quantity === 0 || !foodItem.isAvailable;
    if (isSoldOut) {
      Alert.alert("Out of Stock", "This item is currently sold out.");
      return;
    }

    if (isAddingToCart) return;

    let itemType: CategoryType;
    if (foodItem.category?.type === "food") {
      itemType = CategoryType.FOOD;
    } else if (foodItem.category?.type === "grocery") {
      itemType = CategoryType.GROCERY;
    } else {
      itemType = CategoryType.MEDICINE;
    }

    const basePrice = getCurrentPrice();
    const addonsPrice = selectedAddons.reduce((sum, addonId) => {
      const addon = foodItem.addons.find((a) => a.id === addonId);
      return sum + (Number(addon?.price) || 0);
    }, 0);
    const unitPrice = basePrice + addonsPrice;

    let itemName = foodItem.name;
    if (selectedVariant) {
      itemName += ` (${selectedVariant.name})`;
    }
    if (selectedAddons.length > 0) {
      const addonNames = selectedAddons
        .map((id) => foodItem.addons.find((a) => a.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      itemName += ` with ${addonNames}`;
    }

    const parsedRestaurantId = foodItem.restaurant?.id
      ? parseInt(String(foodItem.restaurant.id), 10)
      : undefined;
    const validRestaurantId =
      parsedRestaurantId && !isNaN(parsedRestaurantId)
        ? parsedRestaurantId
        : undefined;

    setIsAddingToCart(true);
    try {
      await dispatch(
        addItemToCart({
          itemId: foodItem.id,
          itemName: itemName,
          itemType: itemType,
          quantity: quantity,
          unitPrice: Number(unitPrice),
          restaurantId: validRestaurantId,
        }),
      ).unwrap();
    } catch (error: any) {
      Alert.alert("Error", error || "Failed to add item to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderSkeleton = () => {
    return (
      <SkeletonProvider>
        <View style={styles.container}>
          <Skeleton height={300} borderRadius={0} />
          <View style={styles.infoContainer}>
            <View style={styles.headerRow}>
              <View style={styles.titleContainer}>
                <Skeleton width="70%" height={32} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={18} />
              </View>
              <Skeleton width={80} height={32} />
            </View>
            <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={16} style={{ marginBottom: 20 }} />
            <View style={styles.restaurantCard}>
              <Skeleton
                width={50}
                height={50}
                borderRadius={25}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Skeleton width="60%" height={18} style={{ marginBottom: 4 }} />
                <Skeleton width="80%" height={14} />
              </View>
            </View>
            <Skeleton width={150} height={24} style={{ marginBottom: 16 }} />
            <View style={styles.variantsContainer}>
              <Skeleton width={120} height={60} borderRadius={12} />
              <Skeleton width={120} height={60} borderRadius={12} />
            </View>
          </View>
        </View>
      </SkeletonProvider>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Loading...",
            headerShown: true,
          }}
        />
        {renderSkeleton()}
      </>
    );
  }

  if (!foodItem) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Item Details",
            headerShown: true,
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>Food item not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const isSoldOut = foodItem.quantity === 0 || !foodItem.isAvailable;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Item Details",
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: Theme.colors.deepBlue,
          headerTitleStyle: { fontWeight: "800" },
          headerRight: () => (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="share-outline"
                size={24}
                color={Theme.colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProductHeroImage
          imageUrl={foodItem.imageUrl}
          badge={isSoldOut ? undefined : "bestseller"}
          isOutOfStock={isSoldOut}
        />

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.foodName}>{foodItem.name}</Text>
              <Text style={styles.foodCategory}>{foodItem.category.name}</Text>
              <ProductRating rating={4.9} reviewCount={120} size={18} />
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                රු{getCurrentPrice().toFixed(2)}
              </Text>
            </View>
          </View>

          {foodItem.description && (
            <Text style={styles.description}>{foodItem.description}</Text>
          )}

          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => router.push(`/restaurant/${foodItem.restaurant.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.restaurantInfo}>
              {foodItem.restaurant.logoUrl && (
                <View style={styles.restaurantLogoContainer}>
                  <View style={styles.restaurantLogoPlaceholder}>
                    <Ionicons name="restaurant" size={24} color={Theme.colors.primary} />
                  </View>
                </View>
              )}
              <View style={styles.restaurantDetails}>
                <Text style={styles.restaurantName}>
                  {foodItem.restaurant.name}
                </Text>
                {foodItem.restaurant.address && (
                  <Text style={styles.restaurantAddress} numberOfLines={1}>
                    {foodItem.restaurant.address}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textGray} />
          </TouchableOpacity>

          {foodItem.variants && foodItem.variants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Size</Text>
              <View style={styles.variantsContainer}>
                {foodItem.variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.variantCard,
                      selectedVariant?.id === variant.id &&
                        styles.variantCardSelected,
                      !variant.isActive && styles.variantCardDisabled,
                    ]}
                    onPress={() =>
                      variant.isActive && setSelectedVariant(variant)
                    }
                    disabled={!variant.isActive}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.variantName,
                        selectedVariant?.id === variant.id &&
                          styles.variantNameSelected,
                        !variant.isActive && styles.variantNameDisabled,
                      ]}
                    >
                      {variant.name}
                    </Text>
                    <Text
                      style={[
                        styles.variantPrice,
                        selectedVariant?.id === variant.id &&
                          styles.variantPriceSelected,
                      ]}
                    >
                      රු{Number(variant.price || 0).toFixed(2)}
                    </Text>
                    {!variant.isActive && (
                      <Text style={styles.variantSoldOut}>Sold Out</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {foodItem.addons && foodItem.addons.length > 0 && (
            <ExtrasScrollSection
              title="Add Extras"
              extras={foodItem.addons}
              selectedIds={selectedAddons}
              onSelect={toggleAddon}
            />
          )}
        </View>
      </ScrollView>

      <FloatingCartBar
        quantity={quantity}
        totalPrice={getTotalPrice()}
        onIncrement={() => setQuantity((q) => q + 1)}
        onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
        onAddToCart={handleAddToCart}
        isDisabled={isSoldOut}
        disabledText="Sold Out"
        isLoading={isAddingToCart}
      />
      <FloatingCartButton />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
  },
  infoContainer: {
    padding: Theme.spacing.xl,
    marginTop: Theme.spacing.xl,
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  foodName: {
    fontSize: rf(Theme.fontSize.hero),
    fontWeight: "800",
    color: Theme.colors.textDark,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  foodCategory: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: rf(Theme.fontSize.xxxl),
    fontWeight: "800",
    color: Theme.colors.primary,
  },
  description: {
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.textGray,
    lineHeight: 24,
    marginTop: Theme.spacing.md,
  },
  restaurantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.backgroundLight,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.xl,
  },
  restaurantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  restaurantLogoContainer: {
    marginRight: Theme.spacing.md,
  },
  restaurantLogoPlaceholder: {
    width: rs(50),
    height: rs(50),
    borderRadius: 25,
    backgroundColor: Theme.colors.orangeLight,
    justifyContent: "center",
    alignItems: "center",
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "600",
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
  },
  section: {
    marginTop: Theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: rf(Theme.fontSize.xxl),
    fontWeight: "700",
    color: Theme.colors.deepBlue,
    marginBottom: Theme.spacing.md,
  },
  variantsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.md,
  },
  variantCard: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    minWidth: rs(120),
    alignItems: "center",
    backgroundColor: Theme.colors.white,
  },
  variantCardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.orangeLight,
  },
  variantCardDisabled: {
    opacity: 0.5,
  },
  variantName: {
    fontSize: rf(Theme.fontSize.md),
    fontWeight: "600",
    color: Theme.colors.deepBlue,
    marginBottom: 4,
  },
  variantNameSelected: {
    color: Theme.colors.primary,
  },
  variantNameDisabled: {
    color: Theme.colors.textGray,
  },
  variantPrice: {
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "700",
    color: Theme.colors.textGray,
  },
  variantPriceSelected: {
    color: Theme.colors.primary,
  },
  variantSoldOut: {
    fontSize: 10,
    color: "#E53E3E",
    marginTop: 4,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.backgroundLight,
    padding: 20,
  },
  errorText: {
    fontSize: rf(Theme.fontSize.lg),
    color: Theme.colors.textGray,
    marginTop: 15,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "600",
  },
});