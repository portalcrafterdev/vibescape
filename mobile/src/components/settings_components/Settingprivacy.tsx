import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ArrowRight } from "lucide-react-native";
import { privacyData } from "../../data/SettingsData2";

const SettingPrivacy= () => {
  const renderItem = ({ item }: any) => {
    const Icon = item.icon;

    return (
      <TouchableOpacity style={styles.item}>
        <View style={styles.left}>
          <Icon size={24} color="#fff" />

          <Text style={styles.title}>
            {item.title}
          </Text>
        </View>

        <View style={styles.right}>
          {item.value !== "" && (
            <Text style={styles.value}>
              {item.value}
            </Text>
          )}

          <ArrowRight
            size={22}
            color="#9CA3AF"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={privacyData}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
    />
  );
};

export default SettingPrivacy;

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  title: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 18,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  value: {
    color: "#9CA3AF",
    fontSize: 16,
    marginRight: 12,
  },
});