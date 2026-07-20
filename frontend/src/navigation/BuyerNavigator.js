import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BuyerDashboard from "../screens/buyer/BuyerDashboard";
import SearchFilterScreen from "../screens/buyer/SearchFilterScreen";
import ProductDetailScreen from "../screens/buyer/ProductDetailScreen";
import VendorStorePage from "../screens/buyer/VendorStorePage";
import CartScreen from "../screens/buyer/CartScreen";
import CheckoutEscrowScreen from "../screens/buyer/CheckoutEscrowScreen";
import ActiveOrderTrackingScreen from "../screens/buyer/ActiveOrderTrackingScreen";
import DeliveryCodeScreen from "../screens/buyer/DeliveryCodeScreen";
import RefundInitiationScreen from "../screens/buyer/RefundInitiationScreen";

const Stack = createNativeStackNavigator();

const BuyerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BuyerDashboard" component={BuyerDashboard} />
    <Stack.Screen name="SearchFilter" component={SearchFilterScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
    <Stack.Screen name="VendorStore" component={VendorStorePage} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="CheckoutEscrow" component={CheckoutEscrowScreen} />
    <Stack.Screen name="ActiveOrderTracking" component={ActiveOrderTrackingScreen} />
    <Stack.Screen name="DeliveryCode" component={DeliveryCodeScreen} />
    <Stack.Screen name="RefundInitiation" component={RefundInitiationScreen} />
  </Stack.Navigator>
);

export default BuyerNavigator;
