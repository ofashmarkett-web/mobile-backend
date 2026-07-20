import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const SearchFilterScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="buyer-search"
    title="Search and filters"
    subtitle="Find fashion by vendor, category, price, location, and availability."
  />
);

export default SearchFilterScreen;
