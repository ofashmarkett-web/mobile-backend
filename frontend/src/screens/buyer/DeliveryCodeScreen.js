import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const DeliveryCodeScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="buyer-delivery-code"
    title="Delivery code"
    subtitle="Share the delivery code only after your order has arrived."
  />
);

export default DeliveryCodeScreen;
