import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";

import MessageHeader from "../components/Message_components/MessageHeader";
import MessageSearchBar from "../components/Message_components/MessageSearchBar";
import NoteSection from "../components/Message_components/NoteSection";
import MessagesTitle from "../components/Message_components/MessagesTitle";
import MessageList from "../components/Message_components/MessageList";
import { useProfile } from "../context/ProfileContext";

import {
  listConversations,
  getUnreadTotal,
  startConversation,
  searchUsers,
  listFollowing,
  ConversationRow,
  UserSummary,
} from "../../api/authApi";

const MessageScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useProfile();

  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // The row of circles up top, which the API has no notes for.
  const [following, setFollowing] = useState<UserSummary[]>([]);

  // Filters the inbox that is already loaded, so it needs no API call.
  const [query, setQuery] = useState("");

  // The compose button opens this to pick who to write to.
  const [composing, setComposing] = useState(false);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [findQuery, setFindQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadInbox = async () => {
    try {
      const response = await listConversations(30);
      setRows(response);
    } catch (error) {
      console.log("Load conversations failed", error);
    } finally {
      setLoading(false);
    }

    try {
      const total = await getUnreadTotal();
      setUnread(total.unread_total);
    } catch (error) {
      console.log("Load unread failed", error);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!user?.id) return;

      try {
        const response = await listFollowing(user.id, { limit: 20 });
        setFollowing(response.items);
      } catch (error) {
        console.log("Load following failed", error);
      }
    };

    loadFollowing();
  }, [user?.id]);

  // Coming back from a thread picks up the reply that was just sent, and the
  // badge that changed with it.
  useEffect(() => {
    return navigation.addListener("focus", loadInbox);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Looking for someone to write to.
  useEffect(() => {
    const text = findQuery.trim();

    if (!text) {
      setPeople([]);
      return;
    }

    setFinding(true);

    // Wait a moment after typing stops so we do not call the API on every key.
    const timer = setTimeout(async () => {
      try {
        const response = await searchUsers(text, 20);
        setPeople(response.filter((item) => item.id !== user?.id));
      } catch (error) {
        console.log("Search failed", error);
        setPeople([]);
      } finally {
        setFinding(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [findQuery, user?.id]);

  const handleStart = async (person: UserSummary) => {
    if (starting) return;

    setStarting(true);

    try {
      // The API hands back the thread that already exists, if there is one.
      const conversation = await startConversation({ user_id: person.id });

      setComposing(false);
      setFindQuery("");

      navigation.push("Chat", {
        conversationId: conversation.id,
        username: person.username,
      });
    } catch (error) {
      console.log("Start conversation failed", error);
      Alert.alert("Could not open", "Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const shown = rows.filter((item) =>
    item.other.username.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <MessageHeader
            username={user?.username}
            onCompose={() => setComposing(true)}
          />

          <MessageSearchBar value={query} onChangeText={setQuery} />

          <NoteSection people={following} onPress={handleStart} />

          <MessagesTitle unread={unread} />

          <MessageList
            rows={shown}
            loading={loading}
            onOpen={(item) =>
              navigation.push("Chat", {
                conversationId: item.id,
                username: item.other.username,
              })
            }
          />
        </View>
      </ScrollView>

      {/* New message */}
      <Modal visible={composing} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setComposing(false)}>
              <X size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>New message</Text>

            <View style={styles.placeholder} />
          </View>

          <View style={styles.findRow}>
            <Text style={styles.findLabel}>To:</Text>

            <TextInput
              value={findQuery}
              onChangeText={setFindQuery}
              placeholder="Search"
              placeholderTextColor="#8e8e93"
              style={styles.findInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          {finding ? (
            <ActivityIndicator style={styles.loader} color="#fff" />
          ) : (
            <FlatList
              data={people}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.person}
                  onPress={() => handleStart(item)}
                  disabled={starting}
                >
                  <Image
                    source={
                      item.avatar_url
                        ? { uri: item.avatar_url }
                        : require("../assets/images/Portelcrafterlogo.png")
                    }
                    style={styles.personAvatar}
                  />

                  <View style={styles.personNames}>
                    <Text style={styles.personUsername}>{item.username}</Text>

                    {!!item.display_name && (
                      <Text style={styles.personName}>{item.display_name}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                findQuery.trim() ? (
                  <Text style={styles.empty}>No users found.</Text>
                ) : null
              }
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default MessageScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000"
    },

    content: {
      flex: 1
    },

    modalHeader: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: "#262626",
    },

    modalTitle: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "700",
    },

    placeholder: {
      width: 26,
    },

    findRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      height: 48,
      borderBottomWidth: 0.5,
      borderBottomColor: "#262626",
    },

    findLabel: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
      marginRight: 10,
    },

    findInput: {
      flex: 1,
      color: "#fff",
      fontSize: 15,
    },

    person: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },

    personAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#262626",
    },

    personNames: {
      flex: 1,
      marginLeft: 12,
    },

    personUsername: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },

    personName: {
      color: "#8e8e93",
      fontSize: 14,
      marginTop: 2,
    },

    loader: {
      marginTop: 40,
    },

    empty: {
      color: "#8e8e93",
      fontSize: 15,
      textAlign: "center",
      marginTop: 40,
    },
})
