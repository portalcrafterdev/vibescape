import React from "react";
import {
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

interface GalleryImage {
  id: string;
  uri: string;
}

interface GalleryGridProps {
  images: GalleryImage[];
  selectedImage: string | null;
  onSelectImage: (uri: string) => void;
}

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width / 3;

const GalleryGrid = ({
  images,
  selectedImage,
  onSelectImage,
}: GalleryGridProps) => {
  return (
    <FlatList
      data={images}
      numColumns={3}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onSelectImage(item.uri)}
        >
          <Image
            source={{ uri: item.uri }}
            style={[
              styles.image,
              selectedImage === item.uri &&
                styles.selectedImage,
            ]}
          />
        </TouchableOpacity>
      )}
    />
  );
};

export default GalleryGrid;

const styles = StyleSheet.create({
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },

  selectedImage: {
    borderWidth: 3,
    borderColor: "#0095F6",
  },
});