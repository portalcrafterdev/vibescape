import React from "react";
import { StyleSheet, View , Text} from "react-native";

const Settinghow = ()=>{
    return(
   <View>
   <Text style={styles.txt}> How to use VibeScape</Text>
   </View>
    );
};

export default Settinghow;

const styles = StyleSheet.create({
  txt: {
    color: "#eae2e2cf",
    fontSize: 16,
    marginHorizontal:20,
    marginTop: 15,
    fontWeight: "500"
  }
});