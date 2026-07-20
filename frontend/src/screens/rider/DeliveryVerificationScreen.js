import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const DeliveryVerificationScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="147-3010"
    title="Delivery verification"
    subtitle="Validate pickup and dropoff codes before escrow release."
  />
);

export default DeliveryVerificationScreen;
