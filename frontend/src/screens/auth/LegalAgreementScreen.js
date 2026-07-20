import React from "react";
import NodeScreen from "../common/NodeScreen";

const LegalAgreementScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="41-566"
    title="Legal agreement"
    subtitle="Accept the buyer, vendor, or rider marketplace terms before KYC."
    nextRoute="KYC"
    nextLabel="Accept"
  />
);

export default LegalAgreementScreen;
