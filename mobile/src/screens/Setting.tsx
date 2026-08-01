import React from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsHeader from "../components/settings_components/SettingsHeader";
import SettingsSearch from "../components/settings_components/SettingsSearch";
import SettingsMeta from "../components/settings_components/SettingsMeta";
import SettingsAccount from "../components/settings_components/SettingsAccount";
import SettingContainer from "../components/settings_components/SettingsContainer";
import Settinghow from "../components/settings_components/Settingshow";
import SettingsFlat1 from "../components/settings_components/SettingsFlat1";
import SettingContainer2 from "../components/settings_components/SettingsContainer2";
import SettingSeeContent from "../components/settings_components/SettingsSeeContent";
import SettingPrivacy from "../components/settings_components/Settingprivacy";
import SettingContainer3 from "../components/settings_components/SettingsContainer3";
import SettingLogin from "../components/settings_components/SettingLogin";

const SettingsScreen = ()=>{
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
      <View style={styles.content}>
        <SettingsHeader/>
        <SettingsSearch/>
        <SettingsMeta/>
        <SettingsAccount/>
        <SettingContainer/>
        <Settinghow/>
        <SettingsFlat1/>
        <SettingContainer2/>
        <SettingSeeContent/>
        <SettingPrivacy/>
        <SettingContainer3/>
        <SettingLogin/>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create(
 {
    container:{
      flex:1,
      backgroundColor: "#000",
    },
    content:{
      flex:1,
    }
 }
)