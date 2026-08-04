import React from "react";
import {
  FlatList,
  Image,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";

import { Camera } from "lucide-react-native";
import { PhotoIdentifier } from "@react-native-camera-roll/camera-roll";

interface GalleryGridProps {
  photos: PhotoIdentifier[];
  selectedUri: string | null;
  onSelect: (photo: PhotoIdentifier) => void;
  onEndReached?: () => void;
  // Set to put a camera tile in the first cell, like the reel gallery.
  onCamera?: () => void;
}

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width / 3;

// 9 seconds becomes 0:09.
const duration = (seconds: number) => {
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;

  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const GalleryGrid = ({
  photos,
  selectedUri,
  onSelect,
  onEndReached,
  onCamera,
}: GalleryGridProps) => {
  // null is the camera tile. A header would span the whole row instead of
  // sitting in the first cell.
  const cells: (PhotoIdentifier | null)[] = onCamera
    ? [null, ...photos]
    : photos;

  return (
    <FlatList
      data={cells}
      numColumns={3}
      keyExtractor={(item, index) =>
        item ? `${item.node.id}-${index}` : "camera"
      }
      showsVerticalScrollIndicator={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) =>
        item === null ? (
          <TouchableOpacity style={styles.cameraTile} onPress={onCamera}>
            <Camera size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onSelect(item)}>
            <Image
              source={{ uri: item.node.image.uri }}
              style={[
                styles.image,
                selectedUri === item.node.image.uri &&
                  styles.selectedImage,
              ]}
            />

            {item.node.image.playableDuration > 0 && (
              <View style={styles.durationBox}>
                <Text style={styles.duration}>
                  {duration(item.node.image.playableDuration)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )
      }
    />
  );
};

export default GalleryGrid;

const styles = StyleSheet.create({
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: "#111",
  },

  selectedImage: {
    borderWidth: 3,
    borderColor: "#0095F6",
  },

  cameraTile: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
  },

  durationBox: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },

  duration: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
