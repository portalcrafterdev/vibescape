import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

const ThreadsHeader= ()=>{
   const navigation = useNavigation<any>();
   return(
    <View>
        <TouchableOpacity onPress={()=>navigation.goBack()}>
            <ArrowLeft
            size={28}
            color={"#fff"}
            style= {styles.design}
            strokeWidth={2.5}
            />
        </TouchableOpacity>
    </View>
   );
};

export default ThreadsHeader;

const styles= StyleSheet.create({
design: {
  marginTop: 20,
  marginHorizontal: 20

},
})