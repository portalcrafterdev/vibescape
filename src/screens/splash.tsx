import React,{useEffect, useState} from "react";
import { View, Text , StyleSheet, Image} from "react-native";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from "../types/navigation";


type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const splashscreen = ({navigation}: Props)=>{
    useEffect(()=>{
        const timer = setTimeout(() => {
           navigation.replace('Login');
        }, 3000);

        return()=> clearTimeout(timer);
    }, [navigation]);

    return(
  <View style={styles.container}>

    <Image source={require('../assets/images/clipart402911.png')}  style={styles.logoImage}
    resizeMode="contain">

    </Image>
    <Text style={styles.logo}> Instagram</Text>
  </View>
    );
}

export default splashscreen;

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
 
   logo: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },

    logoImage: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },

});