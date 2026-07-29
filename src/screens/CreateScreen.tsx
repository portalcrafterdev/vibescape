import React from "react";
import { View, StyleSheet} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MessageHeader from "../components/Message_components/MessageHeader";

const CreateScreen = ()=>{
    return(
<SafeAreaView style= {styles.container}>
    <View>
        <MessageHeader/>
    </View>
</SafeAreaView>
    )
}

export default CreateScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000"
    }
})