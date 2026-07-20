import React from "react";
import NodeScreen from "../common/NodeScreen";

const SignupScreen = ({ navigation }) => (
  <NodeScreen
    navigation={navigation}
    nodeId="41-258"
    title="Create your account"
    subtitle="Collect buyer profile details, phone number, email, and password before OTP verification."
    nextRoute="OTPVerification"
    nextLabel="Send OTP"
  />
);

export default SignupScreen;
