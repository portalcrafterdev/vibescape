import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";

import { X, Zap, ZapOff, RefreshCw } from "lucide-react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from "react-native-vision-camera";

interface cameraprops {
  onClose: () => void;
  // Gives back a plain file path, not a file:// address.
  onCaptured: (filePath: string) => void;
  galleryUri?: string | null;
  onOpenGallery: () => void;
  busy?: boolean;
}

const StoryCamera = ({
  onClose,
  onCaptured,
  galleryUri,
  onOpenGallery,
  busy,
}: cameraprops) => {
  const { hasPermission, requestPermission } = useCameraPermission();

  const [position, setPosition] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [taking, setTaking] = useState(false);

  // Asking for the device gives back undefined when there is none. Passing
  // "back" straight to the Camera would throw instead, which is what breaks
  // on emulators with no camera set up.
  const backDevice = useCameraDevice("back");
  const frontDevice = useCameraDevice("front");

  const device = position === "back"
    ? backDevice ?? frontDevice
    : frontDevice ?? backDevice;

  const photoOutput = usePhotoOutput();

  useEffect(() => {
    if (!hasPermission) requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission]);

  const handleCapture = async () => {
    if (taking || busy) return;

    setTaking(true);

    try {
      const file = await photoOutput.capturePhotoToFile({ flashMode: flash }, {});
      onCaptured(file.filePath);
    } catch (error: any) {
      Alert.alert("Could not take photo", error?.message ?? "Please try again.");
    } finally {
      setTaking(false);
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Camera access is needed to take a story.
        </Text>

        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onOpenGallery}>
          <Text style={styles.buttonText}>Choose from gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Emulators, and some tablets, have no camera at all.
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          This device has no camera. You can still choose a picture from your
          gallery.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onOpenGallery}>
          <Text style={styles.buttonText}>Choose from gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.preview}
        device={device}
        isActive={!busy}
        outputs={[photoOutput]}
      />

      {/* Top row */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onClose}>
          <X size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setFlash(flash === "off" ? "on" : "off")}>
          {flash === "off" ? (
            <ZapOff size={24} color="#fff" />
          ) : (
            <Zap size={24} color="#fff" fill="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={onOpenGallery}>
          {galleryUri ? (
            <Image source={{ uri: galleryUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnail} />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCapture} disabled={taking || busy}>
          <View style={styles.shutterOuter}>
            {taking || busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </View>
        </TouchableOpacity>

        {/* Nothing to flip to unless both cameras are there. */}
        {backDevice && frontDevice ? (
          <TouchableOpacity
            onPress={() => setPosition(position === "back" ? "front" : "back")}
          >
            <RefreshCw size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.thumbnail} />
        )}
      </View>
    </View>
  );
};

export default StoryCamera;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  preview: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  bottomRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },

  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#333",
  },

  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  message: {
    color: "#8e8e93",
    fontSize: 15,
    textAlign: "center",
  },

  button: {
    marginTop: 14,
    paddingHorizontal: 20,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#262626",
    justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
