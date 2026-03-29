import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import { Theme } from "../src/styles/theme";
import * as Location from "expo-location";
import { useRouter, useFocusEffect } from "expo-router";
import { useSelector } from "react-redux";
import { store, RootState, useAppDispatch } from "../src/store/store";
import { clearCartAsync } from "../src/store/slices/cartSlice";
import { orderApi, userApi } from "../src/lib/api";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlert } from "../src/context/AlertContext";
import { SafeAreaView } from 'react-native-safe-area-context';
import { rs, rf, hp } from "../src/utils/responsive";
import { formatPhoneForDisplay, normalizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from "../src/utils/phone-normalizer";

const CUSTOMER_ID_STORAGE_KEY = "@aaro360/customerId";

export default function CheckoutScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { items, total, deliveryFee } = useSelector(
    (state: RootState) => state.cart,
  );
  const { showAlert } = useAlert();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      const fetchUserProfile = async () => {
        if (user?.id) {
          try {
            const response = await userApi.getProfile(user.id);
            if (response.data?.address)
              setDeliveryAddress(response.data.address);
            if (response.data?.phoneNumber)
              setPhoneNumber(formatPhoneForDisplay(response.data.phoneNumber) || response.data.phoneNumber);
          } catch (error) {
            if (__DEV__) console.error("Failed to fetch user profile:", error);
          }
        }
      };
      const fetchLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          }
        } catch (error) {
          if (__DEV__) console.error("Failed to get location:", error);
        }
      };
      fetchUserProfile();
      fetchLocation();
    }, [user?.id]),
  );

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      showAlert({
        title: "Error",
        message: "Please enter delivery address",
        type: "warning",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      showAlert({
        title: "Error",
        message: "Please enter your phone number",
        type: "warning",
      });
      return;
    }

    // Validate phone number - accept both formats
    if (!isValidPhoneNumber(phoneNumber.trim())) {
      showAlert({
        title: "Invalid Phone Number",
        message: getPhoneValidationMessage(),
        type: "warning",
      });
      return;
    }

    // Normalize phone number to international format
    const normalizedPhone = normalizePhoneNumber(phoneNumber.trim());

    setIsSubmitting(true);
    try {
      if (!user?.id) {
        showAlert({
          title: "Error",
          message: "You must be logged in to place an order",
          type: "error",
        });
        return;
      }

      const customerId = user.id;

      if (items.length === 0) {
        showAlert({
          title: "Error",
          message: "Your cart is empty",
          type: "warning",
        });
        return;
      }

      const orderData = {
        customerId: Number(customerId),
        items: items.map((item) => {
          if (!item.itemName || item.quantity <= 0 || !item.itemId) {
            throw new Error(`Invalid item: ${item.itemName}`);
          }
          return {
            itemId: Number(item.itemId),
            itemName: String(item.itemName),
            itemType: String(item.itemType || "food"),
            quantity: Number(item.quantity),
          };
        }),
        deliveryAddress: String(deliveryAddress).trim(),
        phoneNumber: normalizedPhone,
        deliveryLatitude: location?.lat ?? 7.7124,
        deliveryLongitude: location?.lng ?? 81.6924,
        deliveryFee: Number(deliveryFee || 0),
        discount: Number(0),
        paymentMethod: String(paymentMethod || "cash_on_delivery"),
      };

      const response = await orderApi.create(orderData);
      dispatch(clearCartAsync());

      const order = response.data;
      if (__DEV__)
        console.log("Order creation response:", JSON.stringify(order, null, 2));

      if (!order || !order.id) {
        throw new Error("Invalid order response");
      }

      router.push(`/order-tracking?id=${order.id}&fromCheckout=true`);
    } catch (error: any) {
      if (__DEV__) {
        console.error("Order creation error:", error);
        console.error("Error response:", error.response?.data);
      }

      let errorMessage = "Failed to place order";
      if (error.response?.status === 400) {
        const validationErrors = error.response?.data?.message;
        if (Array.isArray(validationErrors)) {
          errorMessage = "Validation errors:\n" + validationErrors.join("\n");
        } else if (typeof validationErrors === "string") {
          errorMessage = validationErrors;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = "Invalid request data. Please check all fields.";
        }
      } else {
        errorMessage =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Unknown error";
      }
      showAlert({ title: "Order Error", message: errorMessage, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={rs(24)} color={Theme.colors.deepBlue} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: rs(24) }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your delivery address"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phone Number</Text>
          <TextInput
            style={styles.inputPhone}
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === "cash_on_delivery" &&
                styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod("cash_on_delivery")}
          >
            <Ionicons
              name="cash-outline"
              size={rs(24)}
              color={Theme.colors.deepBlue}
            />
            <Text style={styles.paymentText}>Cash on Delivery</Text>
            {paymentMethod === "cash_on_delivery" && (
              <Ionicons
                name="checkmark-circle"
                size={rs(24)}
                color={Theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ${(total - deliveryFee).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>රු{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            isSubmitting && styles.placeOrderButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          <Text style={styles.placeOrderButtonText}>
            {isSubmitting ? "Placing Order..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: rs(Theme.spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    fontSize: rf(Theme.fontSize.xl),
    fontWeight: "bold",
    color: Theme.colors.deepBlue,
  },
  content: {
    flex: 1,
    padding: rs(Theme.spacing.lg),
  },
  section: {
    marginBottom: rs(30),
  },
  sectionTitle: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "bold",
    color: Theme.colors.deepBlue,
    marginBottom: rs(15),
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: rs(15),
    fontSize: rf(Theme.fontSize.base),
    minHeight: hp(12),
    textAlignVertical: "top",
  },
  inputPhone: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    padding: rs(15),
    fontSize: rf(Theme.fontSize.base),
    minHeight: Theme.touchTarget.medium,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: rs(15),
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.lg,
    gap: rs(15),
    minHeight: Theme.touchTarget.medium,
  },
  paymentOptionActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.orangeLight,
  },
  paymentText: {
    flex: 1,
    fontSize: rf(Theme.fontSize.base),
    color: Theme.colors.deepBlue,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rs(10),
  },
  summaryLabel: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.textGray,
  },
  summaryValue: {
    fontSize: rf(Theme.fontSize.sm),
    color: Theme.colors.deepBlue,
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: rs(10),
    marginTop: rs(10),
  },
  totalLabel: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "bold",
    color: Theme.colors.deepBlue,
  },
  totalValue: {
    fontSize: rf(Theme.fontSize.lg),
    fontWeight: "bold",
    color: Theme.colors.primary,
  },
  footer: {
    padding: rs(Theme.spacing.lg),
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  placeOrderButton: {
    backgroundColor: Theme.colors.primary,
    padding: rs(18),
    borderRadius: Theme.borderRadius.lg,
    alignItems: "center",
    minHeight: Theme.touchTarget.medium,
    justifyContent: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: Theme.colors.white,
    fontSize: rf(Theme.fontSize.base),
    fontWeight: "bold",
  },
});
