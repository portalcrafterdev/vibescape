import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SettingsHeader from "../components/settings_components/SettingsHeader";
import SettingsSearch from "../components/settings_components/SettingsSearch";
import SettingsMeta from "../components/settings_components/SettingsMeta";

const SettingsScreen = ()=>{
  return (
    <SafeAreaView style={styles.container}>
      <View>
        <SettingsHeader/>
        <SettingsSearch/>
        <SettingsMeta/>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create(
 {
    container:{
      flex:1,
      backgroundColor: "#000",
    }
 }
)