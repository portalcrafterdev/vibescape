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