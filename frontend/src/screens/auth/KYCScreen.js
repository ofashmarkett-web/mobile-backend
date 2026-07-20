import React from "react";
import NodeScreen from "../common/NodeScreen";

const KYCScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="41-479"
    title="Identity verification"
    subtitle="Run NIN, document, and liveness checks through the backend Dojah workflow."
    nextRoute="BiometricSetup"
    nextLabel="Start KYC"
  />
);

export default KYCScreen;
