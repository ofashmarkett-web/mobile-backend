import React from "react";
import NodeScreen from "../common/NodeScreen";

const BiometricSetupScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="42-587"
    title="Biometric setup"
    subtitle="Enable fast, secure access for returning marketplace sessions."
    nextRoute="ProfileSwitch"
    nextLabel="Enable"
  />
);

export default BiometricSetupScreen;
