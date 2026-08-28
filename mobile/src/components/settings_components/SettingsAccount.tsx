import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import SettingsPerson from "../icons/Settingsperson";
import { ChevronRight } from "lucide-react-native";

const SettingsAccount = () => {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>

      <SettingsPerson width={28} height={28} fill="#fff" />

      <View style={styles.textContainer}>
        <Text style={styles.txt}>Accounts Centre</Text>

        <Text style={styles.subtitle}>
          Password, security, personal details, connected experiences, ad
          preferences
        </Text>
      </View>
      
      <ChevronRight size={20} color="#8e8e93" strokeWidth={2.5} />

    </TouchableOpacity>
  );
};

export default SettingsAccount;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#262626",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },

  textContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },

  txt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },

  subtitle: {
    color: "#a8a8a8",
    fontSize: 13,
    lineHeight: 18,
  },
});
