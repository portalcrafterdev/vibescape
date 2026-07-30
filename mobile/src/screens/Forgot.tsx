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

import { ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ArrowLeft } from 'lucide-react-native';
import { forgotPassword } from '../api/auth';
import { ApiError } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

const ForgotScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const sendLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await forgotPassword(email.trim().toLowerCase());
      // The server answers identically whether or not the account exists, so the
      // confirmation here must not imply one way or the other.
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {sent ? (
          <Text style={styles.sent}>
            If an account exists for that email, a reset link has been sent.
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={sendLink}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Send Login Link
            </Text>
          )}
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

  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },

  description: {
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
  },

  input: {
    backgroundColor: '#262626',
    color: '#fff',
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  button: {
    backgroundColor: '#3797EF',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  error: {
    color: '#ED4956',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },

  sent: {
    color: '#4BB543',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 40,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#444',
  },

  or: {
    color: '#aaa',
    marginHorizontal: 10,
  },

  createAccount: {
    color: '#3797EF',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  bottom: {
    marginTop: 40,
  },

  backLogin: {
    color: '#fff',
    textAlign: 'center',
  },
});