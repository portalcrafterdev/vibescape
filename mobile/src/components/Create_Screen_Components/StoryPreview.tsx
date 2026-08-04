import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { ArrowLeft, ArrowRight, CircleUser } from "lucide-react-native";

interface previewprops {
  uri: string;
  onBack: () => void;
  onShare: () => void;
  busy?: boolean;
}

const StoryPreview = ({ uri, onBack, onShare, busy }: previewprops) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.bottomRow}>
        <View style={styles.audience}>
          <CircleUser size={20} color="#fff" />
          <Text style={styles.audienceText}>Your story</Text>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={onShare}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ArrowRight size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default StoryPreview;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  image: {
    flex: 1,
    width: "100%",
  },

  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00000066",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  audience: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },

  audienceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#4A7CFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
