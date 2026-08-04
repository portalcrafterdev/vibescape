import { Check, X, } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import CircleDotIcon from "../icons/CircleDot";
import { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, 'GenderScreen'>;

const options = ["Female", "Male", "Custom", "Prefer not to say"];

const GenderScreen = ({ route, navigation }: Props)=>{
    const [selected, setSelected] = useState(route.params?.gender || "Prefer not to say");

    // Send the choice back to EditProfile. Closing with X keeps the old value.
    const handleDone = () => {
      navigation.navigate('EditProfile', { gender: selected });
    };

    return(
     <SafeAreaView style={styles.container}>
   <View>
    <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
        <X
        size={27}
        color={"#fff"}/>
        </TouchableOpacity>

        <Text style={styles.title}>Gender</Text>

        <TouchableOpacity onPress={handleDone}>
        <Check
        size={27}
        color={"#6C63FF"}
        />
        </TouchableOpacity>
    </View>

    <Text style={styles.subtitle}>This won't be the part of your public profile.</Text>

    {options.map((option) => (
      <View style={styles.row} key={option}>
        <Text style={styles.txt}>{option}</Text>

        <TouchableOpacity onPress={() => setSelected(option)}>
          <CircleDotIcon isSelected={selected === option} height={23} width={23} color={"#fff"} />
        </TouchableOpacity>
      </View>
    ))}
   </View>
   </SafeAreaView>
    );
};

export default GenderScreen;

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#000"
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 20,
        marginTop: 12
    },

    title: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        marginRight: 80
    },

    subtitle: {
        marginTop: 23,
        color: "#a29e9e",
        marginHorizontal: 23,
        fontSize: 14
    },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal:20,
        marginVertical: 15,
        marginTop: 30,
    },

    txt: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700"
    }
});
