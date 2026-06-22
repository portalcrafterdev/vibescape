import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image
} from 'react-native';

import { Eye, EyeOff } from 'lucide-react-native';
import HomeScreen from './HomeScreen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);

  const login = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Enter Email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Enter Password');
      return;
    }

    Alert.alert('Success', 'Login Button Pressed');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}  
    >
        <ScrollView
    contentContainerStyle={styles.scrollcontainer}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={true}
  >  
   <View style={styles.logocontainer}>

    <Image source={require('../assets/images/clipart402911.png')}  style={styles.logoImage}
    resizeMode="contain">

    </Image>
    <Text style={styles.logo}> Instagram</Text>
  </View>

      <TextInput
        placeholder="Email or Username"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={hidePassword}
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
        />

        <TouchableOpacity
          onPress={() => setHidePassword(!hidePassword)}
        >
          {hidePassword ? (
            <EyeOff color="white" size={22} />
          ) : (
            <Eye color="white" size={22} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('Forgot')}
      >
        <Text style={styles.forgot}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={()=> navigation.navigate('Maintabs')}
      >
        <Text style={styles.loginText}>
          Log In
        </Text>
      </TouchableOpacity>

<View style={{flexDirection: "row"}}>
