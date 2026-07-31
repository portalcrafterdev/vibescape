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
  Image,
  ActivityIndicator
} from 'react-native';
import { useLoginMutation } from '../redux/api/authApi';
import { Eye, EyeOff } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [login, { isLoading }] = useLoginMutation();

  const loginHandler = async () => {
    if (isLoading) return;

    if (!email.trim()) {
      Alert.alert('Error', 'Enter Email');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Enter Password');
      return;
    }

    try {
      await login({
        identifier: email.trim(),
        password,
      }).unwrap();

      navigation.replace('Maintabs');
    } catch (err) {
      Alert.alert(
        'Login failed',
        getErrorMessage(err, 'Please check your details and try again.'),
      );
    }
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
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
        editable={!isLoading}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={hidePassword}
          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={loginHandler}
          editable={!isLoading}
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
        disabled={isLoading}
      >
        <Text style={styles.forgot}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
        onPress={loginHandler}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>
            Log In
          </Text>
        )}
      </TouchableOpacity>

<View style={{flexDirection: "row"}}>

    <Text style={styles.alread}>Don't have an account?</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        disabled={isLoading}
      >
        <Text style={styles.signup}>
           Sign Up
        </Text>
      </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  logo: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 50,
  },

  input: {
    backgroundColor: '#262626',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15,
  },

  passwordContainer: {
    backgroundColor: '#262626',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  passwordInput: {
    flex: 1,
    color: '#fff',
    height: 50,
  },

  forgot: {
    color: '#3797EF',
    alignSelf: 'flex-end',
    marginBottom: 30,
    fontWeight: '600',
  },

  loginButton: {
    backgroundColor: '#3797EF',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

    logoImage: {
    width: 80,
    height: 80,
    marginBottom: 15,
    justifyContent:"center",
    
  },

  logocontainer:{
 alignItems: "center"
  },


  signup: {
    color: '#3797EF',
    textAlign: 'center',
    marginTop: 35,
  },

  alread:{
    color: "white", textAlign: 'center', marginTop: 35, paddingLeft:40, paddingRight:5
  },
  scrollcontainer: {
    flexGrow: 1,
    justifyContent: 'center',
    color: "black"

  }
});