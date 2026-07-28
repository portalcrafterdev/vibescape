import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import ChevronDown from "lucide-react-native/icons/chevron-down";

const EditProfileGender = ()=>{
    return(
        <TouchableOpacity style={styles.container}>
         <View>
            <Text style={styles.text}>Gender</Text>
            <Text style={styles.label}>Male</Text>
         </View>
        <ChevronDown
        size={22}
        color="#8e8e93"
        strokeWidth={2}
      />
        </TouchableOpacity>
    )
}

export default EditProfileGender;

const styles = StyleSheet.create({
 container: {
  marginTop: 15,
  paddingHorizontal:18,
  paddingVertical: 5,
  marginHorizontal:18,
  borderWidth: 1,
  borderColor: "#3a3a3a",
  borderRadius: 12,
  backgroundColor: "#111",
  justifyContent: "space-between",
  flexDirection: "row"
 },

 text:{
    fontSize: 13,
    color: "#8e8e93",
    marginBottom: 4,
 },

 label:{
    fontSize:17,
    color: "#fff"
 }

});