import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

const STEPS = [
  { key: "pickedUp", label: "Rider picked up", icon: "moped-outline", set: "mci" },
  { key: "delivered", label: "Delivered", icon: "cube-outline", set: "ion" },
  { key: "released", label: "Payment released", icon: "card-outline", set: "ion" },
];

const StepIcon = ({ step, state }) => {
  const color =
    state === "done" ? COLORS.teal : state === "current" ? COLORS.orange : COLORS.faint;
  const iconProps = { size: 22, color };

  return (
    <View
      style={[
        styles.circle,
        state === "done" && styles.circleDone,
        state === "current" && styles.circleCurrent,
      ]}
    >
      {step.set === "mci" ? (
        <MaterialCommunityIcons name={step.icon} {...iconProps} />
      ) : (
        <Ionicons name={step.icon} {...iconProps} />
      )}
    </View>
  );
};

// order status → which steps are complete
const stateFor = (stepKey, status) => {
  const reached = {
    pickedUp: ["shipped", "delivered", "completed"],
    delivered: ["delivered", "completed"],
    released: ["completed"],
  };

  if (reached[stepKey].includes(status)) return "done";

  const current =
    (stepKey === "pickedUp" && ["packaging", "ready_for_pickup"].includes(status)) ||
    (stepKey === "delivered" && status === "shipped") ||
    (stepKey === "released" && status === "delivered");

  return current ? "current" : "todo";
};

const ProgressSteps = ({ status }) => (
  <View style={styles.row}>
    {STEPS.map((step, index) => {
      const state = stateFor(step.key, status);

      return (
        <React.Fragment key={step.key}>
          {index > 0 ? (
            <View
              style={[
                styles.connector,
                state !== "todo" && { borderColor: COLORS.teal },
              ]}
            />
          ) : null}
          <View style={styles.step}>
            <StepIcon step={step} state={state} />
            <Text style={[styles.label, state === "todo" && styles.labelTodo]}>{step.label}</Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  step: {
    alignItems: "center",
    gap: 6,
    width: 92,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  circleDone: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.teal,
    borderStyle: "dashed",
  },
  circleCurrent: {
    backgroundColor: COLORS.orangeSoft,
    borderColor: COLORS.orange,
  },
  connector: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    marginTop: 26,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.slate,
    textAlign: "center",
  },
  labelTodo: {
    color: COLORS.faint,
  },
});

export default ProgressSteps;
