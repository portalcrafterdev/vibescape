import React from "react";
import { View, Text, StyleSheet, Image} from "react-native";

const NoteItem = ({image, username, note}: any)=>{
    return(
        <View style={styles.container}>
         <View style= {styles.bubble}>
            <Text style={styles.notetext} numberOfLines={2}>
                {note}
            </Text>
        </View>

        <Image
        source={{ uri: image }}
        style= {styles.image}
        />

        <Text style= {styles.username} numberOfLines={2}>
         {username}
        </Text>
        </View>
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
 },

 username:{
    color: "#fff",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
 },
});