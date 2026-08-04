import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";

import { X, Zap, ZapOff, RefreshCw } from "lucide-react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  useVideoOutput,
} from "react-native-vision-camera";

import type { Recorder, CameraRef } from "react-native-vision-camera";

// The lengths offered by the timer button on the left, like Instagram.
const lengths = [15, 30, 60, 90];
// Stopping a recording that holds almost no frames makes the native recorder
// fail while closing the file, so the button waits a moment.
const MIN_SECONDS = 1;

interface reelcameraprops {
  onClose: () => void;
  // Gives back a plain file path, not a file:// address.
  onRecorded: (filePath: string) => void;
  galleryUri?: string | null;
  onOpenGallery: () => void;
}

const ReelCamera = ({
  onClose,
  onRecorded,
  galleryUri,
  onOpenGallery,
}: reelcameraprops) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const microphone = useMicrophonePermission();

  const [position, setPosition] = useState<"back" | "front">("back");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [donePath, setDonePath] = useState<string | null>(null);

  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxSeconds, setMaxSeconds] = useState(90);

  const backDevice = useCameraDevice("back");
  const frontDevice = useCameraDevice("front");

  const device = position === "back"
    ? backDevice ?? frontDevice
    : frontDevice ?? backDevice;

  // Audio only works if the microphone was allowed.
  const videoOutput = useVideoOutput({ enableAudio: microphone.hasPermission });

  const camera = useRef<CameraRef>(null);
  const recorder = useRef<Recorder | null>(null);
  // stopRecording and the max-duration timeout can both finish the same take.
  const finished = useRef(false);

  useEffect(() => {
    if (!hasPermission) requestPermission();
    if (!microphone.hasPermission) microphone.requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, microphone.hasPermission]);

  // Counts up while recording so the user can see the length.
  useEffect(() => {
    if (!recording) return;

    const timer = setInterval(() => setSeconds((old) => old + 1), 1000);

    return () => clearInterval(timer);
  }, [recording]);

  // The hand-over happens here, on the JS thread, and not inside the native
  // callback that produced the file.
  useEffect(() => {
    if (donePath) onRecorded(donePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donePath]);

  // Leaving mid-take would otherwise leave native recording to a file
  // nobody is waiting for.
  useEffect(() => {
    return () => {
      finished.current = true;
      recorder.current?.stopRecording().catch(() => {});
    };
  }, []);

  // The torch lives on the camera itself, not on a prop, so it is set once the
  // camera has started and again whenever the button is tapped.
  const handleTorch = async () => {
    const next = !torch;

    try {
      await camera.current?.controller?.setTorchMode(next ? "on" : "off");
      setTorch(next);
    } catch (error) {
      console.log("Torch failed", error);
    }
  };

  const handleLength = () => {
    const next = lengths[(lengths.indexOf(maxSeconds) + 1) % lengths.length];
    setMaxSeconds(next);
  };

  const handleStart = async () => {
    try {
      const instance = await videoOutput.createRecorder({
        maxDuration: maxSeconds,
      });

      recorder.current = instance;
      finished.current = false;
      setSeconds(0);
      setRecording(true);

      await instance.startRecording(
        (filePath) => {
          // Also fires on its own once the max length is reached, so it can
          // arrive twice for one take.
          if (finished.current) return;
          finished.current = true;

          // Nothing else belongs here. The recorder is a native object that
          // is still inside this call, so releasing it or closing the camera
          // now would pull it out from under itself.
          setRecording(false);
          setDonePath(filePath);
        },
        (error) => {
          if (finished.current) return;
          finished.current = true;

          setRecording(false);
          Alert.alert("Recording failed", error?.message ?? "Please try again.");
        },
      );
    } catch (error: any) {
      setRecording(false);
      Alert.alert("Could not record", error?.message ?? "Please try again.");
    }
  };

  const handleStop = async () => {
    try {
      await recorder.current?.stopRecording();
    } catch (error: any) {
      Alert.alert("Could not stop", error?.message ?? "Please try again.");
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Camera access is needed to record a reel.
        </Text>

        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onOpenGallery}>
          <Text style={styles.buttonText}>Choose a video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Emulators, and some tablets, have no camera at all.
  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          This device has no camera. You can still choose a video from your
          gallery.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onOpenGallery}>
          <Text style={styles.buttonText}>Choose a video</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canStop = seconds >= MIN_SECONDS;
  const canZoom = device.maxZoom >= 2;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={styles.preview}
        device={device}
        isActive
        zoom={zoom}
        outputs={[videoOutput]}
      />

      <View style={styles.topRow}>
        <TouchableOpacity onPress={onClose} disabled={recording}>
          <X size={28} color={recording ? "#555" : "#fff"} />
        </TouchableOpacity>

        {device.hasTorch ? (
          <TouchableOpacity onPress={handleTorch}>
            {torch ? (
              <Zap size={24} color="#fff" fill="#fff" />
            ) : (
              <ZapOff size={24} color="#fff" />
            )}
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {recording ? (
          <View style={styles.timer}>
            <View style={styles.dot} />
            <Text style={styles.timerText}>
              {`0:${seconds < 10 ? "0" : ""}${seconds}`}
            </Text>
          </View>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* The tool rail down the left, hidden mid-take like Instagram does. */}
      {!recording && (
        <View style={styles.rail}>
          <TouchableOpacity style={styles.tool} onPress={handleLength}>
            <Text style={styles.toolText}>{maxSeconds}</Text>
          </TouchableOpacity>

          {canZoom && (
            <TouchableOpacity
              style={styles.tool}
              onPress={() => setZoom(zoom === 1 ? 2 : 1)}
            >
              <Text style={styles.toolText}>{`${zoom}x`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={onOpenGallery} disabled={recording}>
          {galleryUri ? (
            <Image source={{ uri: galleryUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnail} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={recording ? handleStop : handleStart}
          disabled={recording && !canStop}
        >
          <View style={[styles.shutterOuter, recording && !canStop && styles.waiting]}>
            <View style={recording ? styles.stopInner : styles.recordInner} />
          </View>
        </TouchableOpacity>

        {/* Nothing to flip to unless both cameras are there. */}
        {backDevice && frontDevice && !recording ? (
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

export default ReelCamera;

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

  spacer: {
    width: 28,
  },

  timer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00000088",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff3040",
  },

  timerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  rail: {
    position: "absolute",
    left: 14,
    top: 110,
  },

  tool: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  toolText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
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

  waiting: {
    opacity: 0.5,
  },

  recordInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ff3040",
  },

  stopInner: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#ff3040",
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
