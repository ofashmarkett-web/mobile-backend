import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BuyerDashboard from "../screens/buyer/BuyerDashboard";
import BuyerSearchScreen from "../screens/buyer/BuyerSearchScreen";
import SearchFilterScreen from "../screens/buyer/SearchFilterScreen";
import ProductDetailScreen from "../screens/buyer/ProductDetailScreen";
import VendorStorePage from "../screens/buyer/VendorStorePage";
import CartScreen from "../screens/buyer/CartScreen";
import CheckoutEscrowScreen from "../screens/buyer/CheckoutEscrowScreen";
import ActiveOrderTrackingScreen from "../screens/buyer/ActiveOrderTrackingScreen";
import TrackOrderScreen from "../screens/buyer/TrackOrderScreen";
import DeliveryCodeScreen from "../screens/buyer/DeliveryCodeScreen";
import RefundInitiationScreen from "../screens/buyer/RefundInitiationScreen";
import BuyerPersonalInfoScreen from "../screens/buyer/BuyerPersonalInfoScreen";
// The support/privacy/terms screens are generic — reused from the vendor side.
import VendorSupportScreen from "../screens/vendor/VendorSupportScreen";
import VendorPrivacyScreen from "../screens/vendor/VendorPrivacyScreen";
import VendorTermsScreen from "../screens/vendor/VendorTermsScreen";

const Stack = createNativeStackNavigator();

const BuyerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BuyerDashboard" component={BuyerDashboard} />
    <Stack.Screen name="BuyerSearch" component={BuyerSearchScreen} />
    <Stack.Screen name="SearchFilter" component={SearchFilterScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="VendorStore" component={VendorStorePage} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="CheckoutEscrow" component={CheckoutEscrowScreen} />
    <Stack.Screen name="ActiveOrderTracking" component={ActiveOrderTrackingScreen} />
    <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
    <Stack.Screen name="DeliveryCode" component={DeliveryCodeScreen} />
    <Stack.Screen name="RefundInitiation" component={RefundInitiationScreen} />
    <Stack.Screen name="BuyerPersonalInfo" component={BuyerPersonalInfoScreen} />
    <Stack.Screen name="BuyerSupport" component={VendorSupportScreen} />
    <Stack.Screen name="BuyerPrivacy" component={VendorPrivacyScreen} />
    <Stack.Screen name="BuyerTerms" component={VendorTermsScreen} />
  </Stack.Navigator>
);

export default BuyerNavigator;
