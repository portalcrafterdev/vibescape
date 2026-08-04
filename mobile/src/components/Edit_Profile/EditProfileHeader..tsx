import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";

import { ArrowLeft, Check } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

interface headerProps {
  onSave: () => void;
  saving: boolean;
}

const EditProfileHeader = ({ onSave, saving }: headerProps) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft
          size={26}
          color="#fff"
          strokeWidth={2.2}
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        Edit profile
      </Text>

      <TouchableOpacity
        style={styles.placeholder}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#6C63FF" />
        ) : (
          <Check size={26} color="#6C63FF" strokeWidth={2.4} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default EditProfileHeader;

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
  },

  backButton: {
    width: 36,
    alignItems: "flex-start",
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  placeholder: {
    width: 36,
    alignItems: "flex-end",
  },
});