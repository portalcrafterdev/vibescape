import React from "react";
import { View , StyleSheet, ScrollView} from "react-native";
import EditProfileHeader from "../components/Edit_Profile/EditProfileHeader.";
import { SafeAreaView } from "react-native-safe-area-context";
import EditImage from "../components/Edit_Profile/EditImage";

import EditProfileFields from "../components/Edit_Profile/EditProfileFields";
import EditProfileLinks from "../components/Edit_Profile/EditProfileLinks";
import EditProfileGender from "../components/Edit_Profile/EditProfileGender";
import Reordergrid from "../components/Edit_Profile/ReorderGrid";
import LogoutButton from "../components/Edit_Profile/LogoutButton";

const EditProfile = ()=>{
    return (
        <SafeAreaView style={styles.container}>
      <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
  <View >
    <EditProfileHeader/>
    <EditImage/>
    <EditProfileFields/>
    <EditProfileLinks/>
    <EditProfileGender/>
    <Reordergrid/>
    <LogoutButton/>
  </View>
  </ScrollView>      
  </SafeAreaView>
    )
}

export default EditProfile;

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: '#000',
},
content: { paddingBottom: 40 },


});