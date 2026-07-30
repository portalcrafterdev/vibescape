import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LogOut } from 'lucide-react-native';

import { useAuth } from '../../auth/AuthContext';

/**
 * Signing out clears the Keychain and revokes the refresh token family server-side.
 * RootNavigator drops back to the login stack once the user is cleared.
 */
const LogoutButton = () => {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const confirm = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={confirm}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Log out">
      {busy ? (
        <ActivityIndicator color="#ED4956" />
      ) : (
        <>
          <LogOut color="#ED4956" size={18} />
          <Text style={styles.text}>Log out</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export default LogoutButton;

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    marginHorizontal: 16,
    marginTop: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  text: {
    color: '#ED4956',
    fontSize: 15,
    fontWeight: '600',
  },
});
