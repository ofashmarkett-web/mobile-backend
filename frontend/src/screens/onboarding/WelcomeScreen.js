import React from "react";
import NodeScreen from "../common/NodeScreen";

const WelcomeScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="41-717"
    title="Your style, your market"
    subtitle="Shop fashion from real vendors near you, sell what you have, and move through the market your way."
    nextRoute="MarketingSource"
    nextLabel="Get started"
  />
);

export default WelcomeScreen;
