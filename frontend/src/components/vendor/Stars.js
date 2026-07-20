import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

const Stars = ({ rating = 0, size = 14 }) => (
  <View style={styles.row}>
    {[1, 2, 3, 4, 5].map((position) => {
      let icon = "star-outline";
      if (rating >= position - 0.25) icon = "star";
      else if (rating >= position - 0.75) icon = "star-half";

      return (
        <Ionicons
          key={position}
          name={icon}
          size={size}
          color={icon === "star-outline" ? COLORS.faint : COLORS.star}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 2,
  },
});

export default Stars;
