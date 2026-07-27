import React from "react";
import { View, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

const CreateScreen = ()=>{
    return(
        <View style={{flex:1, justifyContent: "center", alignItems: "center"}}>
            <Text>
                This is Home Screen 
            </Text>
        </View>
    )
}

export default CreateScreen;