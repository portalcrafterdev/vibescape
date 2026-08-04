import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity} from "react-native";

interface noteprops {
  image?: string | null;
  username: string;
  // The API has no notes, so the bubble is left off when there is nothing
  // to put in it.
  note?: string | null;
  onPress?: () => void;
}

const NoteItem = ({image, username, note, onPress}: noteprops)=>{
    return(
        <TouchableOpacity style={styles.container} onPress={onPress}>
         {!!note && (
           <View style= {styles.bubble}>
              <Text style={styles.notetext} numberOfLines={2}>
                  {note}
              </Text>
          </View>
         )}

        <Image
        source={
          image
            ? { uri: image }
            : require("../../assets/images/Portelcrafterlogo.png")
        }
        style= {[styles.image, !note && styles.imageNoNote]}
        />

        <Text style= {styles.username} numberOfLines={2}>
         {username}
        </Text>
        </TouchableOpacity>
    );
};
export default NoteItem;

const styles= StyleSheet.create({
   container: {
    width: 86,
    alignItems: "center",
    marginRight: 16,
},

 bubble:{
    position: "absolute",
    top: 0,
    zIndex: 10,

    width: 78,
    minHeight: 46,

    backgroundColor: "#3A3A3C",
    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",

    paddingHorizontal: 8,
    paddingVertical: 6,
 },

 notetext: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
 },

 image:{
    width: 72,
    height: 72,
    borderRadius: 36,
    marginTop: 34,

    borderWidth: 2,
    borderColor: "#262626",
    backgroundColor: "#262626",
 },

 // Without a bubble above it there is no gap to leave.
 imageNoNote: {
    marginTop: 0,
 },

 username:{
    color: "#fff",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
 },
});