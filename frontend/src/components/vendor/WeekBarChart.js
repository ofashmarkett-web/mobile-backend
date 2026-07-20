import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../theme/colors";
import { naira } from "../../utils/format";

const CHART_HEIGHT = 120;

// Revenue-by-weekday bars. The highest bar is highlighted and shows a value
// tooltip; tapping any bar moves the tooltip to it.
const WeekBarChart = ({ values = [], labels = [] }) => {
  const max = useMemo(() => Math.max(...values, 0), [values]);
  const defaultIndex = max > 0 ? values.indexOf(max) : -1;
  const [selected, setSelected] = useState(null);
  const activeIndex = selected != null ? selected : defaultIndex;

  return (
    <View>
      <View style={styles.plot}>
        {values.map((value, index) => {
          const height = max > 0 ? Math.max((value / max) * CHART_HEIGHT, value > 0 ? 6 : 3) : 3;
          const isActive = index === activeIndex && value > 0;

          return (
            <TouchableOpacity
              key={labels[index] || index}
              style={styles.column}
              onPress={() => setSelected(index)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>{naira(value)}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.bar,
                  { height },
                  isActive ? styles.barActive : null,
                ]}
              />
              <Text style={styles.label}>{labels[index]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: CHART_HEIGHT + 52,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  bar: {
    width: "62%",
    borderRadius: 6,
    backgroundColor: "#F6DAD3",
  },
  barActive: {
    backgroundColor: "#C0392B",
  },
  tooltip: {
    backgroundColor: COLORS.ink,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
  },
});

export default WeekBarChart;
