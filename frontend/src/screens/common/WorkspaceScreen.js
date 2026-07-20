import React from "react";
import NodeScreen from "./NodeScreen";

const WorkspaceScreen = ({ navigation, nodeId, title, subtitle }) => (
  <NodeScreen
    navigation={navigation}
    nodeId={nodeId}
    title={title}
    subtitle={subtitle}
  />
);

export default WorkspaceScreen;
