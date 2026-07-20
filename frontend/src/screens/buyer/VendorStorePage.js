import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const VendorStorePage = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="buyer-vendor-store"
    title="Vendor store"
    subtitle="Review a vendor profile, catalog, ratings, and store availability."
  />
);

export default VendorStorePage;
