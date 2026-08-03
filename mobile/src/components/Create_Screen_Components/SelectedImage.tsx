import React from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
} from "react-native";

interface SelectedImageProps {
  imageUri: string | null;
}

const { width } = Dimensions.get("window");

const SelectedImage = ({ imageUri }: SelectedImageProps) => {
  return (
    <View style={styles.container}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />
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