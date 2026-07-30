import React from "react";
import { StyleSheet, View, Text } from "react-native";
import MetaIcon from "../icons/MetaIcon";

const SettingsMeta = ()=>{
    return(
        <View style={styles.container}>
         <Text style={styles.txt}>
        Your account
         </Text>
        <View style={{flexDirection:"row"}}>
         <MetaIcon/>
         <Text style={styles.metatxt}>Meta</Text>

         </View>
        </View>
    );
};

export default SettingsMeta;

const styles = StyleSheet.create({
  container:{
  flexDirection: "row",
  marginHorizontal: 20,
  justifyContent: "space-between",
  marginTop:20,
  },

  txt: {
    color:"#eae2e2cf",
    fontSize: 17,
    fontWeight:"500"
  },
  metatxt:{
   color: "#fff",
   fontWeight: "700",
   fontSize: 17,
   marginLeft:3,
  }
});