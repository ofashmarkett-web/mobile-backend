import React from "react";
import NodeScreen from "../common/NodeScreen";

const MarketingSourceScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="41-725"
    title="Every style has a stall"
    subtitle="Thrift, luxury, Ankara, sneakers, and daily wear all meet in one market."
    nextRoute="Auth"
    nextLabel="Continue"
  />
);

export default MarketingSourceScreen;
