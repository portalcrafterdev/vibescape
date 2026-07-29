import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const Reordergrid = ()=>{
    return (
   <View style={styles.container}>
  <TouchableOpacity>
    <Text style={styles.grid}>
        Reorder Grid
    </Text>
  </TouchableOpacity>

  <TouchableOpacity>
    <Text style={styles.professional}>
        Switch to Professional Account
    </Text>
  </TouchableOpacity>

  <TouchableOpacity>
    <Text style={styles.professional}>
        Personal information settings
    </Text>
  </TouchableOpacity>
   </View>
    );
}

export default Reordergrid;

const styles = StyleSheet.create({
 container: {
    marginTop: 15,
 },

 grid:{
    fontSize:16,
    color: "#fff",
    paddingHorizontal:18,
    marginBottom:20,
 },

 professional:{
    fontSize:16,
    color: "#6C63FF",
    paddingHorizontal:18,
    marginBottom:20,
 }

});