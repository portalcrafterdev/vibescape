import React, { useState } from "react";
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
} from "react-native";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { ArrowLeft } from "lucide-react-native";
import { forgotpassword } from "../../api/authApi";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Forgot"
>;

const ForgotScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLink = async () => {
    const value = email.trim();

    if (!value) {
      Alert.alert(
        "Error",
        "Please enter your email."
      );
      return;
    }

    // Email Validation
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      Alert.alert(
        "Error",
        "Please enter a valid email address."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await forgotpassword({
        email: value,
      });

      // The server deliberately answers the same way for known and unknown
      // addresses, so report its wording rather than claiming a mail was sent.
      Alert.alert(
        "Check your email",
        result?.message ??
          "If an account exists for that email, a reset link has been sent."
      );

      setEmail("");

    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ??
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft
            color="white"
            size={24}
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          Trouble logging in?
        </Text>

        <Text style={styles.description}>
          Enter your email and we'll send
          you a link to reset your
          password.
        </Text>

        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!loading}
        />

        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.disabledButton,
          ]}
          onPress={sendLink}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </Text>
        </TouchableOpacity>

        <View style={styles.orContainer}>
          <View style={styles.line} />
          <Text style={styles.or}>
            OR
          </Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              "Register"
            )
          }
        >
          <Text style={styles.createAccount}>
            Create New Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottom}
          onPress={() =>
            navigation.goBack()
          }
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
    backgroundColor: "#000",
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },

  description: {
    color: "#aaa",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 35,
  },

  input: {
    backgroundColor: "#262626",
    color: "#fff",
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#3797EF",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 40,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#444",
  },

  or: {
    color: "#aaa",
    marginHorizontal: 10,
  },

  createAccount: {
    color: "#3797EF",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },

  bottom: {
    marginTop: 40,
  },

  backLogin: {
    color: "#fff",
    textAlign: "center",
  },
});