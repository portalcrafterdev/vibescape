import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { registerUser } from '../../api/authApi';
import { getErrorMessage } from '../utils/apiError';
type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const PASSWORD_MIN = 8;

const RegisterScreen = ({ navigation }: Props) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const registerhandler = async () => {
    if (isLoading) return;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name.');
      return;
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      Alert.alert('Error', 'Please enter your username.');
      return;
    }

    if (
      trimmedUsername.length < USERNAME_MIN ||
      trimmedUsername.length > USERNAME_MAX
    ) {
      Alert.alert(
        'Error',
        `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`,
      );
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    if (password.length < PASSWORD_MIN) {
      Alert.alert(
        'Error',
        `Password must be at least ${PASSWORD_MIN} characters.`,
      );
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Error', 'Please confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });

      // No body at all: null, undefined, "" or a 204 No Content
      if (!response) {
        Alert.alert(
          'Sign up failed',
          'The server returned an empty response. Please try again.',
        );
        return;
      }

      // Body came back as plain text instead of JSON (HTML error page, proxy message)
      if (typeof response === 'string') {
        Alert.alert(
          'Sign up failed',
          response.trim() || 'Unexpected response from the server.',
        );
        return;
      }

      // Body is an empty object {} or an empty array []
      const isEmptyBody = Array.isArray(response)
        ? response.length === 0
        : Object.keys(response).length === 0;

      if (isEmptyBody) {
        Alert.alert(
          'Sign up failed',
          'The server returned no data. Please try again.',
        );
        return;
      }

      // 200 OK but the payload itself reports a failure
      if (response.success === false || response.error || response.detail) {
        Alert.alert(
          'Sign up failed',
          getErrorMessage(
            { data: response },
            'Could not create your account. Please try again.',
          ),
        );
        return;
      }

      navigation.replace('Maintabs');
    } catch (err: any) {
      Alert.alert(
        'Sign up failed',
        getErrorMessage(
          err?.response ?? err,
          'Could not create your account. Please try again.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
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
          autoCapitalize="words"
          returnKeyType="next"
        />

        <TextInput
          placeholder="Username"
          placeholderTextColor="#888"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor="#888"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry={hidePassword}
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            returnKeyType="next"
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
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={registerhandler}
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
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={registerhandler}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Sign Up
            </Text>
          )}
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

  buttonDisabled: {
    opacity: 0.6,
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