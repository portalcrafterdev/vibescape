import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ThreadsText= ()=>{
   return(
    <View style={styles.container}>
    <Text style={styles.txt}>
      @threads
    </Text>
    </View>
   );
};

export default ThreadsText;

const styles= StyleSheet.create({
  
    container: {
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },

    txt:{
      color: "#fff",
      fontSize: 25,
      fontWeight: "600",
      fontStyle: "italic"
    }
})