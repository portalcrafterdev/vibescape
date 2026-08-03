import React , {useState}from "react";
import { StyleSheet, View } from "react-native";
import CreateHeader from "../components/Create_Screen_Components/CreateHeader";
import SelectedImage from "../components/Create_Screen_Components/SelectedImage";
import GalleryGrid from "../components/Create_Screen_Components/GridGallary";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../data/Images";

const CreateScreen = ()=>{
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return(
     <SafeAreaView style={styles.container}>  
   <View >
    <CreateHeader/>
    <SelectedImage imageUri={selectedImage}/>
    <GalleryGrid onSelectImage={setSelectedImage} images={images}  selectedImage={selectedImage}/>
   </View>
   </SafeAreaView> 
    );
};

export default CreateScreen;

const styles = StyleSheet.create({
 container:{
  flex: 1,
  backgroundColor: "#000",
 }
});