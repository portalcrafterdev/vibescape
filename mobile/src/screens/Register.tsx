import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Eye, EyeOff } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);

  const register = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username.');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    Alert.alert('Success', 'Account Created Successfully');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{flexGrow:1, justifyContent:"center"}}>
        <Text style={styles.logo}>Instagram</Text>

        <Text style={styles.subtitle}>
          Create a new account
        </Text>

        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#888"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Username"
          placeholderTextColor="#888"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={hidePassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
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

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            secureTextEntry={hideConfirmPassword}
            style={styles.passwordInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            onPress={() =>
              setHideConfirmPassword(!hideConfirmPassword)
            }
          >
            {hideConfirmPassword ? (
              <EyeOff color="white" size={22} />
            ) : (
              <Eye color="white" size={22} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={register}
        >
          <Text style={styles.buttonText}>
            Sign Up
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomContainer}>
          <Text style={styles.bottomText}>
            Already have an account?
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.login}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#000',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },

  logo: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 35,
    fontSize: 16,
  },

  input: {
    backgroundColor: '#262626',
    color: '#fff',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  passwordContainer: {
    backgroundColor: '#262626',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
  },

  passwordInput: {
    flex: 1,
    color: '#fff',
    height: 50,
  },

  button: {
    backgroundColor: '#3797EF',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 35,
  },

  bottomText: {
    color: '#fff',
  },

  login: {
    color: '#3797EF',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});