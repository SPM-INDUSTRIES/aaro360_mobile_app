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
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch } from "../../src/store/store";
import { addItemToCart } from "../../src/store/slices/cartSlice";
import { CategoryType } from "../../src/types";
import { Skeleton, SkeletonProvider } from "../../src/components/SkeletonLoader";
import { Theme } from "../../src/styles/theme";
import { rf, rs, hp } from "../../src/utils/responsive";
import {
  ProductHeroImage,
  ProductRating,
  ExtrasScrollSection,
  FloatingCartBar,
  BadgeType,
} from "../../src/components/product";
import FloatingCartButton from "../../src/components/FloatingCartButton";
import { productApi } from "../../src/lib/productApi";
import { Product, ProductCategory } from "../../src/types/product";

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productApi.getById(productId);
      setProduct(data);
    } catch (error) {
      console.error("Failed to fetch product:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} on Aaro 360!`,
        title: product.name,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const toggleExtra = (extraId: number) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    );
  };

  const calculateTotal = (): number => {
    if (!product) return 0;
    const basePrice = product.discountPrice ?? product.price;
    const extrasTotal = selectedExtras.reduce((sum, extraId) => {
      const extra = product.extras?.find((e) => e.id === extraId);
      return sum + (extra?.price || 0);
    }, 0);
    return (basePrice + extrasTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!product.inStock || product.stock === 0) {
      Alert.alert("Out of Stock", "This product is currently unavailable.");
      return;
    }

    let itemType: CategoryType;
    if (product.category === ProductCategory.FOOD) {
      itemType = CategoryType.FOOD;
    } else if (product.category === ProductCategory.GROCERY) {
      itemType = CategoryType.GROCERY;
    } else if (product.category === ProductCategory.MEDICINE) {
      itemType = CategoryType.MEDICINE;
    } else {
      itemType = CategoryType.MEDICINE;
    }

    const parsedItemId = parseInt(productId, 10);
    if (isNaN(parsedItemId)) {
      Alert.alert("Error", "Invalid product ID");
      return;
    }

    const unitPrice = calculateTotal() / quantity;

    dispatch(
      addItemToCart({
        itemId: parsedItemId,
        itemName: product.name,
        itemType,
        quantity,
        unitPrice: Number(unitPrice),
        restaurantId: undefined,
      }),
    )
      .unwrap()
      .catch((error) => {
        Alert.alert("Error", error || "Failed to add item to cart");
      });
  };

  const getBadgeType = (): BadgeType | undefined => {
    if (!product) return undefined;
    if (product.isFeatured) return "featured";
    if (product.discountPrice && product.price > product.discountPrice) {
      return "discount";
    }
    if (product.orderCount && product.orderCount > 100) return "bestseller";
    return undefined;
  };

  const getDiscountPercent = (): number | undefined => {
    if (!product?.discountPrice) return undefined;
    const percent = Math.round(
      ((product.price - product.discountPrice) / product.price) * 100
    );
    return percent > 0 ? percent : undefined;
  };

  const renderSkeleton = () => (
    <SkeletonProvider>
      <View style={styles.container}>
        <Skeleton height={300} borderRadius={0} />
        <View style={styles.infoContainer}>
          <Skeleton width="70%" height={32} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={80} style={{ marginBottom: 16 }} />
          <Skeleton width={150} height={40} />
        </View>
      </View>
    </SkeletonProvider>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading...", headerShown: true }} />
        {renderSkeleton()}
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ title: "Product", headerShown: true }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.errorText}>Product not found</Text>
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

  const extras = product.extras || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Product Details",
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
          imageUrl={product.mainImage}
          badge={getBadgeType()}
          isOutOfStock={!product.inStock || product.stock === 0}
          discountPercent={getDiscountPercent()}
        />

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.productName}>{product.name}</Text>
              <View style={styles.categoryRow}>
                <Text style={styles.productCategory}>
                  {product.category.toUpperCase()}
                </Text>
                {product.vendor?.name && (
                  <Text style={styles.vendorText}>
                    • {product.vendor.name}
                  </Text>
                )}
              </View>
              {product.averageRating > 0 && (
                <ProductRating
                  rating={product.averageRating}
                  reviewCount={product.reviewCount}
                  size={18}
                />
              )}
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                රු{Number(product.discountPrice ?? product.price).toFixed(2)}
              </Text>
              {product.discountPrice && (
                <Text style={styles.originalPrice}>
                  රු{Number(product.price).toFixed(2)}
                </Text>
              )}
              <Text style={styles.taxText}>Inclusive of all taxes</Text>
            </View>
          </View>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {product.brand && (
            <View style={styles.brandRow}>
              <Ionicons name="tag-outline" size={20} color={Theme.colors.textGray} />
              <Text style={styles.brandText}>{product.brand}</Text>
            </View>
          )}

          {extras.length > 0 && (
            <ExtrasScrollSection
              title="Add Extras"
              extras={extras}
              selectedIds={selectedExtras}
              onSelect={toggleExtra}
            />
          )}
        </View>
      </ScrollView>

      <FloatingCartBar
        quantity={quantity}
        totalPrice={calculateTotal()}
        onIncrement={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
        onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
        onAddToCart={handleAddToCart}
        isDisabled={!product.inStock || product.stock === 0}
        disabledText="Out of Stock"
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
  productName: {
    fontSize: rf(Theme.fontSize.hero),
    fontWeight: "800",
    color: Theme.colors.textDark,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productCategory: {
    fontSize: rf(Theme.fontSize.sm),
    fontWeight: "600",
    color: Theme.colors.textGray,
    letterSpacing: 1,
  },
  vendorText: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
    marginLeft: 8,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: rf(Theme.fontSize.xxxl),
    fontWeight: "800",
    color: Theme.colors.primary,
  },
  originalPrice: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  taxText: {
    fontSize: rf(Theme.fontSize.xs),
    color: Theme.colors.textGray,
    marginTop: 4,
  },
  description: {
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.textGray,
    lineHeight: 24,
    marginTop: Theme.spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Theme.spacing.md,
  },
  brandText: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: Theme.colors.backgroundLight,
  },
  errorText: {
    fontSize: rf(Theme.fontSize.lg),
    color: Theme.colors.textGray,
    marginTop: 16,
    textAlign: "center",
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "600",
  },
});