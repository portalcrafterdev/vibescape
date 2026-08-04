import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const modes = ["POST", "STORY", "REEL"];

interface modeprops {
  mode: string;
  onChange: (mode: string) => void;
}

const CreateModeBar = ({ mode, onChange }: modeprops) => {
  return (
    <View style={styles.container}>
      {modes.map((item) => (
        <TouchableOpacity key={item} onPress={() => onChange(item)}>
          <Text style={[styles.text, mode === item && styles.active]}>
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default CreateModeBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 22,
  },

  text: {
    color: "#8e8e93",
    fontSize: 14,
    fontWeight: "600",
  },

  active: {
    color: "#fff",
    fontWeight: "700",
  },
});
