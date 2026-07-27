import React from "react";
import { View, StyleSheet, Image , Text} from "react-native";

const EditImage = ()=>{
    return (
   <View style={styles.container}>
    <Image source={require("../../assets/images/Portelcrafterlogo.png")} style={styles.imageavatar}>
     
    </Image>

    <Text></Text>
   </View>
    )
}

export default EditImage;

const styles = StyleSheet.create({
    imageavatar: {
        width: 90,
        height:90,
        borderRadius: 45
    },

    container: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 38,
    }
})