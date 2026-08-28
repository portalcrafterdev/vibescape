import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ChevronDown,
  ChevronRight,
  UserPlus,
  Check,
  Music,
  MapPin,
  Sparkles,
  BarChart3,
  MessageCircle,
} from "lucide-react-native";
import {
  CameraRoll,
  Album,
  PhotoIdentifier,
} from "@react-native-camera-roll/camera-roll";

import CreateHeader from "../components/Create_Screen_Components/CreateHeader";
import SelectedImage from "../components/Create_Screen_Components/SelectedImage";
import GalleryGrid from "../components/Create_Screen_Components/GridGallary";
import CreateModeBar from "../components/Create_Screen_Components/CreateModeBar";
import StoryCamera from "../components/Create_Screen_Components/StoryCamera";
import StoryPreview from "../components/Create_Screen_Components/StoryPreview";
import ReelCamera from "../components/Create_Screen_Components/ReelCamera";
import Video from "react-native-video";

import { requestPhotoAccess } from "../utils/photoPermission";
import { toUploadable } from "../utils/photo";
import { uploadImage } from "../../api/media";
import {
  createPost,
  createStory,
  createReel,
  searchUsers,
  UserSummary,
} from "../../api/authApi";

const CreateScreen = ()=>{
    const navigation = useNavigation<any>();
    const route = useRoute<any>();

    // The reels screen sends "REEL" so its plus icon opens the camera here.
    const startMode = route.params?.mode ?? "POST";

    const [photos, setPhotos] = useState<PhotoIdentifier[]>([]);
    const [selected, setSelected] = useState<PhotoIdentifier | null>(null);

    const [albums, setAlbums] = useState<Album[]>([]);
    // null means Recents, which is everything on the device.
    const [album, setAlbum] = useState<string | null>(null);
    const [showAlbums, setShowAlbums] = useState(false);

    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [access, setAccess] = useState("");
    const [loading, setLoading] = useState(true);

    // POST and REEL ask for a caption, STORY shares straight away.
    const [mode, setMode] = useState(startMode);
    const [step, setStep] = useState("pick");
    // A story starts on the camera, like Instagram, with the gallery a tap away.
    const [cameraOpen, setCameraOpen] = useState(false);

    // Set once a story picture is chosen, to show it before it goes up.
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    // Null when the picture came from the camera rather than the gallery.
    const [previewPhoto, setPreviewPhoto] = useState<PhotoIdentifier | null>(null);

    // A reel filmed in the app, rather than picked from the gallery.
    // Arriving on REEL means the user asked to film one, so start on the camera.
    const [reelCameraOpen, setReelCameraOpen] = useState(startMode === "REEL");
    // True while the camera is the first thing shown, so closing it leaves the
    // screen. Once the gallery has been opened, closing goes back there instead.
    const [reelFirst, setReelFirst] = useState(startMode === "REEL");
    const [recordedUri, setRecordedUri] = useState<string | null>(null);

    // A picture taken in the app for a post, rather than picked.
    const [capturedUri, setCapturedUri] = useState<string | null>(null);
    const [caption, setCaption] = useState("");

    // People tagged in the post, chosen on the caption step.
    const [tagged, setTagged] = useState<UserSummary[]>([]);
    const [showTags, setShowTags] = useState(false);
    const [tagQuery, setTagQuery] = useState("");
    const [tagResults, setTagResults] = useState<UserSummary[]>([]);
    const [tagSearching, setTagSearching] = useState(false);

    // The API takes none of these yet, so they are only held on the screen.
    // Once the fields exist they go straight into the createPost call.
    const [poll, setPoll] = useState("");
    const [prompt, setPrompt] = useState("");
    const [showPoll, setShowPoll] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [audio, setAudio] = useState("");
    const [location, setLocation] = useState("");
    const [aiLabel, setAiLabel] = useState(false);

    // Audio and location are both a name typed into the same little sheet,
    // so one is enough. Empty means nothing is open.
    const [sheet, setSheet] = useState("");
    const [sheetText, setSheetText] = useState("");

    const [fit, setFit] = useState<"cover" | "contain">("cover");
    const [sharing, setSharing] = useState(false);

    const loadPhotos = async (nextCursor?: string) => {
      try {
        const page = await CameraRoll.getPhotos({
          first: 60,
          after: nextCursor,
          assetType: mode === "REEL" ? "Videos" : "Photos",
          groupName: album ?? undefined,
          // Needed to work out the file name, type and size before uploading.
          include: ["filename", "fileExtension", "fileSize", "playableDuration"],
        });

        setPhotos(nextCursor ? (old) => [...old, ...page.edges] : page.edges);
        setCursor(page.page_info.end_cursor);
        setHasMore(page.page_info.has_next_page);

        // Start with the newest one chosen, like Instagram does.
        if (!nextCursor) {
          setSelected(page.edges[0] ?? null);
        }
      } catch (error) {
        console.log("Load photos failed", error);
      }
    };

    const start = async () => {
      setLoading(true);

      const result = await requestPhotoAccess();
      setAccess(result);

      if (result === "granted" || result === "limited") {
        await loadPhotos();

        try {
          setAlbums(await CameraRoll.getAlbums({ assetType: "All" }));
        } catch (error) {
          console.log("Load albums failed", error);
        }
      }

      setLoading(false);
    };

    useEffect(() => {
      start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Switching between photos and videos, or picking another album, reloads.
    useEffect(() => {
      if (access === "granted" || access === "limited") {
        setCursor(undefined);
        loadPhotos();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, album]);

    // Look people up a moment after typing stops, not on every key.
    useEffect(() => {
      const text = tagQuery.trim();

      if (!text) {
        setTagResults([]);
        return;
      }

      setTagSearching(true);

      const timer = setTimeout(async () => {
        try {
          setTagResults(await searchUsers(text, 20));
        } catch (error) {
          console.log("Search people failed", error);
          setTagResults([]);
        } finally {
          setTagSearching(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    }, [tagQuery]);

    const openSheet = (kind: string) => {
      setSheet(kind);
      setSheetText(kind === "audio" ? audio : location);
    };

    const saveSheet = () => {
      if (sheet === "audio") {
        setAudio(sheetText.trim());
      } else {
        setLocation(sheetText.trim());
      }

      setSheet("");
    };

    // Tapping someone already tagged takes them off again.
    const toggleTag = (person: UserSummary) => {
      if (tagged.some((item) => item.id === person.id)) {
        setTagged(tagged.filter((item) => item.id !== person.id));
      } else {
        setTagged([...tagged, person]);
      }
    };

    // The guard stops a fast scroll asking for the same page twice.
    const loadMore = async () => {
      if (!hasMore || !cursor || loadingMore) return;

      setLoadingMore(true);
      await loadPhotos(cursor);
      setLoadingMore(false);
    };

    // Switching mode decides whether we land on the camera or the gallery.
    const handleMode = (next: string) => {
      setMode(next);
      setCameraOpen(next === "STORY");
      setReelCameraOpen(false);
      setRecordedUri(null);
      setCapturedUri(null);
    };

    // A filmed reel skips the gallery and goes straight to the caption.
    const handleRecorded = (filePath: string) => {
      setReelCameraOpen(false);
      setRecordedUri(
        filePath.startsWith("file://") ? filePath : `file://${filePath}`,
      );
      setStep("caption");
    };

    // A post and a reel wait for the Next button. A story has nothing to crop
    // or caption, so tapping a picture opens its preview straight away.
    const handleSelect = (photo: PhotoIdentifier) => {
      setSelected(photo);

      if (mode === "STORY") {
        setPreviewPhoto(photo);
        setPreviewUri(photo.node.image.uri);
      }
    };

    const handleNext = () => {
      if (!selected) {
        Alert.alert(title, "Choose a picture first.");
        return;
      }

      setStep("caption");
    };

    const handleCaptured = (filePath: string) => {
      const uri = filePath.startsWith("file://")
        ? filePath
        : `file://${filePath}`;

      // A story is checked on its own preview screen.
      if (mode === "STORY") {
        setPreviewPhoto(null);
        setPreviewUri(uri);
        return;
      }

      // A post carries on to the caption step.
      setCapturedUri(uri);
      setCameraOpen(false);
      setStep("caption");
    };

    const handleStoryShare = async () => {
      if (!previewUri || sharing) return;

      setSharing(true);

      try {
        // A gallery picture needs converting first, a camera one is already
        // a file we can send.
        const file = previewPhoto
          ? await toUploadable(previewPhoto)
          : { uri: previewUri, name: "story.jpg", type: "image/jpeg" };

        const asset = await uploadImage(file);

        await createStory({
          media_asset_id: asset.asset_id,
          image_url: asset.url,
        });

        Alert.alert("Shared", "Your story is live.");
        navigation.goBack();
      } catch (error: any) {
        Alert.alert("Could not share", error?.message ?? "Please try again.");
      } finally {
        setSharing(false);
      }
    };

    // Anything filmed or taken in the app is already a file. A gallery pick
    // has to be converted first.
    const buildFile = async () => {
      if (recordedUri) {
        return { uri: recordedUri, name: "reel.mp4", type: "video/mp4" };
      }

      if (capturedUri) {
        return { uri: capturedUri, name: "photo.jpg", type: "image/jpeg" };
      }

      return toUploadable(selected!);
    };

    const handleShare = async () => {
      if ((!selected && !recordedUri && !capturedUri) || sharing) return;

      setSharing(true);

      try {
        const file = await buildFile();
        const asset = await uploadImage(file);

        // Everything keeps the asset id, so the API works out the file itself.
        if (mode === "REEL") {
          await createReel({
            media_asset_id: asset.asset_id,
            // The API sends nothing back when it is only given the asset id,
            // so the address of the file goes with it, the way the profile
            // picture is already saved.
            video_url: asset.url,
            caption: caption.trim() || null,
          });
        } else {
          // Any #word in the caption is sent as a tag as well, so the post
          // turns up under it.
          const tags = (caption.match(/#(\w+)/g) || []).map((word) =>
            word.slice(1),
          );

          await createPost({
            media_asset_id: asset.asset_id,
            image_url: asset.url,
            caption: caption.trim() || null,
            hashtags: tags,
            // No x and y, because the people are picked from a list rather
            // than placed on the picture.
            tagged_users: tagged.map((item) => ({ user_id: item.id })),
            // Once the API takes them, audio, location, poll, prompt and
            // aiLabel go here as well. They are already held on the screen.
          });
        }

        Alert.alert("Shared", `Your ${mode.toLowerCase()} is live.`);
        navigation.goBack();
      } catch (error: any) {
        Alert.alert("Could not share", error?.message ?? "Please try again.");
      } finally {
        setSharing(false);
      }
    };

    const denied = access === "denied" || access === "blocked";
    const title = mode === "POST" ? "New post" : `New ${mode.toLowerCase()}`;

    // Step two: write the caption and share.
    if (step === "caption") {
      return (
        <SafeAreaView style={styles.container}>
          <CreateHeader
            title={title}
            onClose={() => {
              setStep("pick");
              // Drop what was filmed or taken, so going back returns to the
              // camera rather than showing a stale shot.
              setReelCameraOpen(mode === "REEL" && !!recordedUri);
              setCameraOpen(!!capturedUri);
              setRecordedUri(null);
              setCapturedUri(null);
            }}
            back
          />

          <ScrollView keyboardShouldPersistTaps="handled">
            {recordedUri ? (
              <Video
                source={{ uri: recordedUri }}
                style={styles.captionPreview}
                resizeMode="cover"
                repeat
              />
            ) : (
              <Image
                source={{ uri: capturedUri ?? selected?.node.image.uri }}
                style={styles.captionPreview}
                resizeMode="cover"
              />
            )}

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor="#777"
              style={styles.captionInput}
              multiline
            />

            {/* Poll and prompt sit as chips, the way Instagram shows them. */}
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, showPoll && styles.chipOn]}
                onPress={() => setShowPoll(!showPoll)}
              >
                <BarChart3 size={16} color="#fff" />
                <Text style={styles.chipText}>Poll</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chip, showPrompt && styles.chipOn]}
                onPress={() => setShowPrompt(!showPrompt)}
              >
                <MessageCircle size={16} color="#fff" />
                <Text style={styles.chipText}>Prompt</Text>
              </TouchableOpacity>
            </View>

            {showPoll && (
              <TextInput
                value={poll}
                onChangeText={setPoll}
                placeholder="Ask a question..."
                placeholderTextColor="#777"
                style={styles.chipInput}
              />
            )}

            {showPrompt && (
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Add a prompt..."
                placeholderTextColor="#777"
                style={styles.chipInput}
              />
            )}

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => openSheet("audio")}
            >
              <Music size={22} color="#fff" />

              <Text style={styles.optionText}>Add audio</Text>

              <Text style={styles.optionValue} numberOfLines={1}>
                {audio}
              </Text>

              <ChevronRight size={20} color="#8e8e93" />
            </TouchableOpacity>

            {/* Only a post can carry people. The reel API has no room for it. */}
            {mode === "POST" && (
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowTags(true)}
              >
                <UserPlus size={22} color="#fff" />

                <Text style={styles.optionText}>Tag people</Text>

                <Text style={styles.optionValue} numberOfLines={1}>
                  {tagged.map((item) => item.username).join(", ")}
                </Text>

                <ChevronRight size={20} color="#8e8e93" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => openSheet("location")}
            >
              <MapPin size={22} color="#fff" />

              <Text style={styles.optionText}>Add location</Text>

              <Text style={styles.optionValue} numberOfLines={1}>
                {location}
              </Text>

              <ChevronRight size={20} color="#8e8e93" />
            </TouchableOpacity>

            <Text style={styles.optionNote}>
              People that you share this content with can see the location that
              you tag and view this content on the map.
            </Text>

            <View style={styles.optionRow}>
              <Sparkles size={22} color="#fff" />

              <Text style={styles.optionText}>Add AI label</Text>

              <View style={styles.optionValue} />

              <Switch
                value={aiLabel}
                onValueChange={setAiLabel}
                trackColor={{ false: "#3a3a3a", true: "#4A5BE8" }}
                thumbColor="#fff"
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareText}>Share</Text>
            )}
          </TouchableOpacity>

          {/* Audio and location, both just a name for now */}
          <Modal
            visible={!!sheet}
            animationType="slide"
            onRequestClose={() => setSheet("")}
          >
            <SafeAreaView style={styles.container}>
              <CreateHeader
                title={sheet === "audio" ? "Add audio" : "Add location"}
                actionText="Done"
                onAction={saveSheet}
                onClose={() => setSheet("")}
              />

              <TextInput
                value={sheetText}
                onChangeText={setSheetText}
                placeholder={
                  sheet === "audio" ? "Song name" : "Where was this?"
                }
                placeholderTextColor="#777"
                style={styles.tagSearch}
                autoFocus
              />
            </SafeAreaView>
          </Modal>

          {/* People picker */}
          <Modal
            visible={showTags}
            animationType="slide"
            onRequestClose={() => setShowTags(false)}
          >
            <SafeAreaView style={styles.container}>
              <CreateHeader
                title="Tag people"
                actionText="Done"
                onAction={() => setShowTags(false)}
                onClose={() => setShowTags(false)}
              />

              <TextInput
                value={tagQuery}
                onChangeText={setTagQuery}
                placeholder="Search"
                placeholderTextColor="#777"
                style={styles.tagSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {tagSearching ? (
                <ActivityIndicator style={styles.loader} color="#fff" />
              ) : (
                <FlatList
                  // Whoever is already tagged stays on top, so they can be
                  // taken off again without searching for them a second time.
                  data={[
                    ...tagged,
                    ...tagResults.filter(
                      (item) => !tagged.some((person) => person.id === item.id),
                    ),
                  ]}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.personRow}
                      onPress={() => toggleTag(item)}
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
                        <Text style={styles.personName}>{item.username}</Text>

                        {!!item.display_name && (
                          <Text style={styles.personFull}>
                            {item.display_name}
                          </Text>
                        )}
                      </View>

                      {tagged.some((person) => person.id === item.id) && (
                        <Check size={20} color="#0095F6" />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    tagQuery.trim() ? (
                      <Text style={styles.message}>Nobody found.</Text>
                    ) : null
                  }
                />
              )}
            </SafeAreaView>
          </Modal>
        </SafeAreaView>
      );
    }

    // Story preview: check the picture before it goes up.
    if (previewUri) {
      return (
        <SafeAreaView style={styles.container}>
          <StoryPreview
            uri={previewUri}
            onBack={() => setPreviewUri(null)}
            onShare={handleStoryShare}
            busy={sharing}
          />
        </SafeAreaView>
      );
    }

    // Reel camera: film a clip, then land on the caption step.
    if (reelCameraOpen) {
      return (
        <SafeAreaView style={styles.container}>
          <ReelCamera
            onClose={() =>
              reelFirst ? navigation.goBack() : setReelCameraOpen(false)
            }
            onRecorded={handleRecorded}
            galleryUri={photos[0]?.node.image.uri}
            onOpenGallery={() => {
              setReelFirst(false);
              setReelCameraOpen(false);
            }}
          />

          <CreateModeBar mode={mode} onChange={handleMode} />
        </SafeAreaView>
      );
    }

    // Story camera: full screen preview with only the mode bar over it.
    if (cameraOpen) {
      return (
        <SafeAreaView style={styles.container}>
          <StoryCamera
            // A story opens on the camera, so closing leaves the screen. A post
            // came from the grid, so closing goes back to it.
            onClose={() =>
              mode === "STORY" ? navigation.goBack() : setCameraOpen(false)
            }
            onCaptured={handleCaptured}
            galleryUri={photos[0]?.node.image.uri}
            onOpenGallery={() => setCameraOpen(false)}
            busy={sharing}
          />

          <CreateModeBar mode={mode} onChange={handleMode} />
        </SafeAreaView>
      );
    }

    return (
     <SafeAreaView style={styles.container}>
   <View style={styles.container}>
    {/* A story moves on as soon as a picture is tapped, so it has no button. */}
    <CreateHeader
      title={title}
      actionText={mode === "STORY" ? undefined : "Next"}
      onAction={handleNext}
      onClose={() => navigation.goBack()}
      busy={sharing}
    />

    {loading ? (
      <ActivityIndicator style={styles.loader} color="#fff" />
    ) : denied ? (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Photo access is needed to make a post.
        </Text>

        {access === "blocked" && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.settingsText}>Open Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    ) : (
      <>
        {/* Only a post is cropped before it goes up. A story and a reel go
            straight to the grid, with the camera as the first tile. */}
        {mode === "POST" && (
          <SelectedImage
            imageUri={selected?.node.image.uri ?? null}
            fit={fit}
            onToggleFit={() => setFit(fit === "cover" ? "contain" : "cover")}
          />
        )}

        <TouchableOpacity
          style={styles.albumRow}
          onPress={() => setShowAlbums(true)}
        >
          <Text style={styles.albumName}>{album ?? "Recents"}</Text>
          <ChevronDown size={18} color="#fff" />
        </TouchableOpacity>

        <GalleryGrid
          photos={photos}
          selectedUri={selected?.node.image.uri ?? null}
          onSelect={handleSelect}
          onEndReached={loadMore}
          onCamera={() =>
            mode === "REEL" ? setReelCameraOpen(true) : setCameraOpen(true)
          }
        />
      </>
    )}

    <CreateModeBar mode={mode} onChange={handleMode} />

    {/* Album list */}
    <Modal
      visible={showAlbums}
      animationType="slide"
      onRequestClose={() => setShowAlbums(false)}
    >
      <SafeAreaView style={styles.container}>
        <CreateHeader
          title="Albums"
          actionText=""
          onAction={() => {}}
          onClose={() => setShowAlbums(false)}
        />

        <FlatList
          data={[{ title: "Recents", count: 0 }, ...albums]}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.albumItem}
              onPress={() => {
                setAlbum(item.title === "Recents" ? null : item.title);
                setShowAlbums(false);
              }}
            >
              <Text style={styles.albumItemText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
   </View>
   </SafeAreaView>
    );
};

export default CreateScreen;

const styles = StyleSheet.create({
 container:{
  flex: 1,
  backgroundColor: "#000",
 },

 loader: {
  marginTop: 40,
 },

 centered: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 32,
 },

 message: {
  color: "#8e8e93",
  fontSize: 15,
  textAlign: "center",
 },

 settingsButton: {
  marginTop: 16,
  paddingHorizontal: 20,
  height: 36,
  borderRadius: 8,
  backgroundColor: "#262626",
  justifyContent: "center",
 },

 settingsText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
 },

 albumRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 6,
 },

 albumName: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
 },

 albumItem: {
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 0.5,
  borderBottomColor: "#262626",
 },

 albumItemText: {
  color: "#fff",
  fontSize: 16,
 },

 captionPreview: {
  width: 170,
  height: 220,
  alignSelf: "center",
  marginTop: 24,
  backgroundColor: "#111",
 },

 captionInput: {
  color: "#fff",
  fontSize: 15,
  marginTop: 24,
  marginHorizontal: 20,
  minHeight: 80,
  textAlignVertical: "top",
 },

 chipRow: {
  flexDirection: "row",
  gap: 10,
  marginTop: 20,
  marginBottom: 6,
  paddingHorizontal: 20,
 },

 chip: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingHorizontal: 14,
  height: 34,
  borderRadius: 17,
  backgroundColor: "#262626",
 },

 chipOn: {
  backgroundColor: "#4A5BE8",
 },

 chipText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
 },

 chipInput: {
  color: "#fff",
  fontSize: 15,
  marginHorizontal: 20,
  marginBottom: 10,
  paddingHorizontal: 14,
  height: 44,
  borderRadius: 10,
  backgroundColor: "#161616",
 },

 optionNote: {
  color: "#8e8e93",
  fontSize: 12,
  lineHeight: 16,
  paddingHorizontal: 20,
  marginTop: -6,
  marginBottom: 4,
 },

 optionRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderTopWidth: 0.5,
  borderTopColor: "#262626",
 },

 optionText: {
  color: "#fff",
  fontSize: 16,
 },

 optionValue: {
  flex: 1,
  color: "#8e8e93",
  fontSize: 14,
  textAlign: "right",
 },

 tagSearch: {
  color: "#fff",
  fontSize: 15,
  backgroundColor: "#262626",
  marginHorizontal: 16,
  marginTop: 6,
  marginBottom: 10,
  paddingHorizontal: 14,
  height: 42,
  borderRadius: 12,
 },

 personRow: {
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

 personName: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
 },

 personFull: {
  color: "#8e8e93",
  fontSize: 14,
  marginTop: 2,
 },

 shareButton: {
  height: 50,
  marginHorizontal: 16,
  marginBottom: 16,
  borderRadius: 10,
  backgroundColor: "#4A5BE8",
  justifyContent: "center",
  alignItems: "center",
 },

 shareText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
 },
});
