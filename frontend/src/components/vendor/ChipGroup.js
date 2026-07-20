import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../theme/colors";

// Wrapping row of selectable chips. `selected` is an array for multi-select
// or a single value when `single` is true.
const ChipGroup = ({ options, selected, onToggle, single = false }) => {
  const isSelected = (option) =>
    single ? selected === option : Array.isArray(selected) && selected.includes(option);

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = isSelected(option);

        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  label: {
    fontSize: 13,
    color: COLORS.slate,
  },
  labelActive: {
    color: COLORS.tealDark,
    fontWeight: "600",
  },
});

export default ChipGroup;
