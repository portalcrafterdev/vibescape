import React from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";

import { Maximize2 } from "lucide-react-native";

interface SelectedImageProps {
  imageUri: string | null;
  // "cover" fills the square, "contain" shows the whole picture.
  fit: "cover" | "contain";
  onToggleFit: () => void;
};

const { width } = Dimensions.get("window");

const SelectedImage = ({ imageUri, fit, onToggleFit }: SelectedImageProps) => {
  return (
    <View style={styles.container}>
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode={fit}
          />

          <TouchableOpacity style={styles.fitButton} onPress={onToggleFit}>
            <Maximize2 size={18} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            No Image Selected
          </Text>
        </View>
      )}
    </View>
  );
};

export default SelectedImage;

const styles = StyleSheet.create({
  container: {
    width: width,
    height: width,
    backgroundColor: "#111",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  fitButton: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#00000099",
    justifyContent: "center",
    alignItems: "center",
  },

  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  placeholderText: {
    color: "#888",
    fontSize: 18,
  },
});
