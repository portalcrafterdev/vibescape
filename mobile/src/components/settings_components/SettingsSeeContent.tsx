import React from "react";
import { StyleSheet, View, Text } from "react-native";

const SettingSeeContent = ()=>{
    return(
   <View style ={styles.container}>
    <Text style={styles.txt}>
      Who can see your content
    </Text>
   </View>
    );
};
 export default SettingSeeContent;

 const styles = StyleSheet.create({
    container: {
      marginTop: 15,
      marginHorizontal:20,
    },

    txt: {
     color:"#eae2e2cf",
     fontSize: 16,
     fontWeight:"600",
    },
 });