import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { X, ArrowLeft } from "lucide-react-native";

interface headerprops {
  title: string;
  // Left out when the screen has its own Share button at the bottom.
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
  // Step two goes back to the gallery instead of closing the screen.
  back?: boolean;
  busy?: boolean;
}

const CreateHeader = ({
  title,
  actionText,
  onAction,
  onClose,
  back,
  busy,
}: headerprops) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onClose}>
        {back ? (
          <ArrowLeft size={28} color="white" strokeWidth={2} />
        ) : (
          <X size={28} color="white" strokeWidth={2} />
        )}
      </TouchableOpacity>

      <Text style={styles.title}>
        {title}
      </Text>

      {actionText ? (
        <TouchableOpacity onPress={onAction} disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color="#4A7CFF" />
          ) : (
            <Text style={styles.next}>
              {actionText}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

export default CreateHeader;

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },

  next: {
    color: "#4A7CFF",
    fontSize: 18,
    fontWeight: "600",
  },

  placeholder: {
    width: 28,
  },
});
