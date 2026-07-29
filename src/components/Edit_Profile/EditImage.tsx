import React from "react";
import { View, StyleSheet, Image , Text, TouchableOpacity} from "react-native";

const EditImage = ()=>{
    return (
   <View style={styles.container}>
    <Image source={require("../../assets/images/Portelcrafterlogo.png")} style={styles.imageavatar}>
     
    </Image>

<TouchableOpacity>
    <Text style={styles.txt}>Edit Picture or Avatar</Text>
    </TouchableOpacity>
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
    },

    txt:{
       color: "#6C63FF",
       fontWeight: "700",
       marginTop: 15
    },
})