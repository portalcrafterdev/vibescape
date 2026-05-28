import React from "react";
import { View , StyleSheet} from "react-native";
import EditProfileHeader from "../components/Edit_Profile/EditProfileHeader.";
import { SafeAreaView } from "react-native-safe-area-context";
import EditImage from "../components/Edit_Profile/EditImage";
const EditProfile = ()=>{
    return (
        <SafeAreaView style={styles.container}>
  <View >
    <EditProfileHeader/>
    <EditImage/>
  </View>
  </SafeAreaView>
    )
}

export default EditProfile;

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#000',
}


});