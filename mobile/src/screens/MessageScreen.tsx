import React from "react";
import { View, StyleSheet, ScrollView} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MessageHeader from "../components/Message_components/MessageHeader";
import MessageSearchBar from "../components/Message_components/MessageSearchBar";
import NoteSection from "../components/Message_components/NoteSection";
import MessagesTitle from "../components/Message_components/MessagesTitle";
import MessageList from "../components/Message_components/MessageList";

const MessageScreen = ()=>{
    return(
<SafeAreaView style= {styles.container}>
    <ScrollView>
    <View style={styles.content}>
        <MessageHeader/>
        <MessageSearchBar/>
        <NoteSection/>
        <MessagesTitle/>
        <MessageList/>
    </View>
    </ScrollView>
</SafeAreaView>
    )
}

export default MessageScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000"
    },

    content: {
      flex: 1
    }
})