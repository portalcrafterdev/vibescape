import React from "react";
import { View, StyleSheet} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ThreadsHeader from "../components/threads_components/threadsHeader";
import ThreadsText from "../components/threads_components/ThreadsText";
import ThreadsPeople from "../components/threads_components/ThreadsPeople";
import ThreadFollows from "../components/threads_components/Threadsfollows";
import ThreadsInstalogo from "../components/threads_components/ThreadsInstalogo";
import ThreadsTerms from "../components/threads_components/ThreadTerms";

const ThreadScreen = ()=>{
    return(
        <SafeAreaView style= {styles.container}>
            <View>
                <ThreadsHeader/>
                <ThreadsText/>
                <ThreadsPeople/>
                <ThreadFollows/>
                <ThreadsInstalogo/>
                <ThreadsTerms/>
            </View>
        </SafeAreaView>
    );
};

export default ThreadScreen;

const styles = StyleSheet.create({
 container:{
   flex: 1,
   backgroundColor: "#000"
 }
});