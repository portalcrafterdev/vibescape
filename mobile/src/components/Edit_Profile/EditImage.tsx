import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";

import { PhotoIdentifier } from "@react-native-camera-roll/camera-roll";

import PhotoPickerModal from "../PhotoPickerModal";
import { toUploadable } from "../../utils/photo";
import { uploadImage } from "../../../api/media";

interface imageprops {
  avatarUrl: string;
  onUploaded: (url: string) => void;
}

const EditImage = ({ avatarUrl, onUploaded }: imageprops)=>{
    const [showPicker, setShowPicker] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSelect = async (photo: PhotoIdentifier) => {
      setShowPicker(false);
      setUploading(true);

      try {
        const file = await toUploadable(photo);
        const asset = await uploadImage(file);

        onUploaded(asset.url);
      } catch (error: any) {
        Alert.alert('Upload failed', error?.message ?? 'Please try again.');
      } finally {
        setUploading(false);
      }
    };

    return (
   <View style={styles.container}>
    <View>
      <Image
        source={
          avatarUrl
            ? { uri: avatarUrl }
            : require("../../assets/images/Portelcrafterlogo.png")
        }
        style={styles.imageavatar}
      />

      {uploading && (
        <View style={styles.uploading}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>

    <TouchableOpacity onPress={() => setShowPicker(true)} disabled={uploading}>
      <Text style={styles.txt}>
        {uploading ? 'Uploading...' : 'Edit Picture or Avatar'}
      </Text>
    </TouchableOpacity>

    <PhotoPickerModal
      visible={showPicker}
      onClose={() => setShowPicker(false)}
      onSelect={handleSelect}
    />
   </View>
    )
}

export default EditImage;

const styles = StyleSheet.create({
    imageavatar: {
        width: 90,
        height:90,
        borderRadius: 45,
        backgroundColor: "#262626",
    },

    container: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 38,
    },

    uploading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 45,
        backgroundColor: "#000000A0",
        justifyContent: "center",
        alignItems: "center",
    },

    txt:{
       color: "#6C63FF",
       fontWeight: "700",
       marginTop: 15
    },
})
