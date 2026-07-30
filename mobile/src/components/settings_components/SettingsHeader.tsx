import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, View, Text } from "react-native";

const SettingsHeader = ()=>{
    return(
  <View style={styles.container}>
   <ArrowLeft
   size={25}
   color={"#fff"}
   strokeWidth={2.5}/> 
 <Text style={styles.text}>
    Settings and activity
 </Text>
  </View>
    );
};

export default SettingsHeader;

const styles = StyleSheet.create({
 container:{
  flexDirection: "row",
  marginHorizontal: 20,
  marginTop:20,
 },

 text:{
 color:"#fff",
 fontSize: 18,
 marginLeft: 50,
 fontWeight: "700",
 }
});