import React from "react";
import WorkspaceScreen from "../common/WorkspaceScreen";

const RefundInitiationScreen = ({ navigation }) => (
  <WorkspaceScreen
    navigation={navigation}
    nodeId="buyer-refund"
    title="Refund request"
    subtitle="Submit order issues and supporting evidence for escrow review."
  />
);

export default RefundInitiationScreen;
