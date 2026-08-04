import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ArrowRight } from "lucide-react-native";
import { settingsData } from "../../data/SettingsData";

const SettingsFlat1 = () => {
  const renderItem = ({ item }: any) => {
    const Icon = item.icon;

    return (
      <TouchableOpacity style={styles.item}>
        <View style={styles.leftSection}>
          <Icon size={27} color="#fff" strokeWidth={2} />

          <Text style={styles.title}>
            {item.title}
          </Text>
        </View>

        <ArrowRight
          size={24}
          color="#fff"
          strokeWidth={2}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={settingsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
};

export default SettingsFlat1;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0b0f14",
    marginTop:8,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingVertical: 10,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 25,
  },
});