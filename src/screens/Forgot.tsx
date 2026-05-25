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