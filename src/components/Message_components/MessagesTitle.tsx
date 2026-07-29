import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";

const MessagesTitle = ()=>{
    return(
    <View style= {styles.container}>
     <Text style={styles.msgtxt}> Messages</Text>
     <TouchableOpacity>
        <Text style={styles.req} >
        Requests
        </Text></TouchableOpacity>
    </View>
    );
};

export default MessagesTitle;

const styles = StyleSheet.create({
 container: {
    flexDirection: "row",
    marginTop:12,
    justifyContent: "space-between",
    marginHorizontal:18,
 },

 msgtxt: {
 fontSize: 16,
 color: "#fff",
 fontWeight: "600"

 },
 req:{
  fontSize: 16,
  color: "#6C63FF",
  fontWeight: "600"
 }
});
