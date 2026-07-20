import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const NodeScreen = ({
  title,
  subtitle,
  nodeId,
  nextRoute,
  nextLabel = "Continue",
  navigation,
}) => {
  const theme = useTheme();
  const handleNext = () => {
    const parent = navigation.getParent?.();
    const parentRoutes = parent?.getState?.().routeNames || [];

    if (parentRoutes.includes(nextRoute)) {
      parent.navigate(nextRoute);
      return;
    }

    navigation.navigate(nextRoute);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.surface} elevation={0}>
        <View style={styles.meta}>
          <Text variant="labelLarge" style={[styles.node, { color: theme.colors.primary }]}>
            Node: {nodeId}
          </Text>
          <Text variant="headlineMedium" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>

        {nextRoute ? (
          <Button
            mode="contained"
            onPress={handleNext}
            contentStyle={styles.buttonContent}
            style={styles.button}
          >
            {nextLabel}
          </Button>
        ) : null}
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  surface: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  meta: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  node: {
    fontWeight: "700",
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    opacity: 0.72,
    lineHeight: 24,
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    height: 52,
  },
});

export default NodeScreen;
