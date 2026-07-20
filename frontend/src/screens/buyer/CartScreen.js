import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const CartScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="buyer-cart"
    title="Cart"
    subtitle="Review selected items before escrow checkout."
  />
);

export default CartScreen;
