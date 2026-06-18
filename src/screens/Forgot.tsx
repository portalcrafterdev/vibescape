import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

const ForgotScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');

  const sendLink = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email, phone or username.');
      return;
    }

    Alert.alert(
      'Success',
      'A password reset link has been sent.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>

        <Text style={styles.title}>
          Trouble logging in?
        </Text>

        <Text style={styles.description}>
          Enter your email, phone, or username and we'll send you a link to get back into your account.
        </Text>

        <TextInput
          placeholder="Email, Phone or Username"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={sendLink}
        >
          <Text style={styles.buttonText}>
            Send Login Link
          </Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.createAccount}>
            Create New Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottom}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLogin}>
            Back to Login
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotScreen;

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
