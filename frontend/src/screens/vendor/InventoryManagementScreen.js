import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const InventoryManagementScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="124-2500"
    title="Inventory management"
    subtitle="Update stock, pause products, manage variants, and review catalog status."
  />
);

export default InventoryManagementScreen;
