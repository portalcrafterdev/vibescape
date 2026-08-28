import { ArrowLeft, Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../types/navigation";
import { ProfileLink } from "../../../api/authApi";

type Props = NativeStackScreenProps<RootStackParamList, 'LinkPage'>;

const LinkPage = ({ route, navigation }: Props)=>{
    const [links, setLinks] = useState<ProfileLink[]>(route.params?.links ?? []);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");

    const handleAdd = () => {
      if (!url.trim()) {
        Alert.alert("Add link", "Enter a URL.");
        return;
      }

      // People type "portelcrafter.dev", so add the https:// for them.
      const fullUrl = url.trim().startsWith("http")
        ? url.trim()
        : `https://${url.trim()}`;

      // The API rejects anything that is not a real address, so check it here
      // instead of letting the whole profile save fail later.
      const isValid = /^https?:\/\/[^\s/?#]+\.[a-z]{2,}([/?#]\S*)?$/i.test(fullUrl);

      if (!isValid) {
        Alert.alert(
          "Add link",
          "Enter a valid web address, like portelcrafter.dev\n\nIt cannot contain spaces and needs a domain ending such as .com or .dev.",
        );
        return;
      }

      setLinks([...links, { title: title.trim() || fullUrl, url: fullUrl }]);

      setTitle("");
      setUrl("");
      setShowForm(false);
    };

    const handleRemove = (index: number) => {
      setLinks(links.filter((item, i) => i !== index));
    };

    // Send the list back to EditProfile, which saves it with the tick.
    const handleBack = () => {
      navigation.navigate('EditProfile', { links });
    };

 return(
    <SafeAreaView style= {styles.container}>
    <View >
        <View style={styles.view}>
     <TouchableOpacity onPress={handleBack}>
    <ArrowLeft
    size={25}
    color={"#fff"}
    />
    </TouchableOpacity>

    <Text style={styles.header}>
        Links
    </Text>

      <View style={styles.placeholder} />
    </View>

    {links.map((link, index) => (
      <View style={styles.linkRow} key={index}>
        <View style={styles.linkText}>
          <Text style={styles.linkTitle} numberOfLines={1}>{link.title}</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>{link.url}</Text>
        </View>

        <TouchableOpacity onPress={() => handleRemove(index)}>
          <X size={20} color={"#8e8e93"} />
        </TouchableOpacity>
      </View>
    ))}

    {showForm ? (
      <View style={styles.form}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="URL"
          placeholderTextColor="#777"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          placeholderTextColor="#777"
          style={styles.input}
        />

        <View style={styles.formRow}>
          <TouchableOpacity
            style={[styles.formButton, styles.cancelButton]}
            onPress={() => setShowForm(false)}
          >
            <Text style={styles.formButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formButton, styles.doneButton]}
            onPress={handleAdd}
          >
            <Text style={styles.formButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <TouchableOpacity style={{flexDirection: "row"}} onPress={() => setShowForm(true)}>
        <View style={styles.plusbutton}>
            <Plus
            size={30}
            color={"#fff"}
            />
        </View>

        <Text style={styles.Addlink}>
            Add Link
        </Text>
      </TouchableOpacity>
    )}

 <View style={{flexDirection: "row",  marginHorizontal: 22, marginTop:5}}>
    <Text style={styles.descrip}>
        Your links are visible to everyone on and off VibeScape.
             <Text style={styles.learnmore}>
        Learn more
    </Text>
    </Text>
   <TouchableOpacity>
   </TouchableOpacity>
    </View>
    </View>
    </SafeAreaView>
 );
};

export default LinkPage;

const styles = StyleSheet.create({
 container:{
    backgroundColor: "#000",
    flex:1,
 },

 view:{
    height: 56,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
 },

 header:{
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
 },

   placeholder: {
    width: 36,
  },

  plusbutton:{
    marginTop: 17,
    marginHorizontal:20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626", borderRadius:60,
    height:45,
    width:45,
    borderWidth:1,
    borderColor:"#ffffff85"
  },

  Addlink: {
    color: "#fff",
    fontSize:14,
    fontWeight: "700",
    marginTop: 33,

  },

  learnmore: {
    color: "#6C63FF",
    fontSize: 15,
    fontWeight: "300"
  },

  descrip: {
    color: "#A8A8A8",
    fontSize: 15,
    fontWeight: "300",
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#262626",
  },

  linkText: {
    flex: 1,
    marginRight: 12,
  },

  linkTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  linkUrl: {
    color: "#8e8e93",
    fontSize: 13,
    marginTop: 2,
  },

  form: {
    marginHorizontal: 20,
    marginTop: 20,
  },

  input: {
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#3a3a3a",
    borderRadius: 12,
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  formRow: {
    flexDirection: "row",
    gap: 10,
  },

  formButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#262626",
  },

  doneButton: {
    backgroundColor: "#6C63FF",
  },

  formButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
