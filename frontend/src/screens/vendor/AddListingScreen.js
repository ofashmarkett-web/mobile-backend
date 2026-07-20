import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import { productApi, uploadApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import PrimaryButton from "../../components/vendor/PrimaryButton";
import ChipGroup from "../../components/vendor/ChipGroup";
import QuantityStepper from "../../components/vendor/QuantityStepper";

const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
const OCCASIONS = [
  "Owambe",
  "Wedding",
  "Beach",
  "Casual",
  "Church",
  "Work & Office",
  "Date night",
  "Graduation",
  "Night out",
];
const STYLES = ["Ankara", "Adire", "Aso-oke", "Lace", "Sequin", "Denim", "Monochrome", "Tie-dye"];

const CATEGORY_OPTIONS = [
  {
    key: "new_with_tags",
    title: "New with tags",
    subtitle: "Unused, original tags attached",
    icon: "tag-outline",
    iconColor: COLORS.red,
    iconBg: COLORS.redSoft,
  },
  {
    key: "thrift",
    title: "Thrift",
    subtitle: "Second-hand. Worn once or twice",
    icon: "tshirt-crew-outline",
    iconColor: COLORS.gold,
    iconBg: COLORS.goldSoft,
  },
];

const pickImage = async (onPicked) => {
  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera access needed", "Allow camera access to photograph your item.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  const fromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow photo access to upload your item.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) onPicked(result.assets[0]);
  };

  Alert.alert("Add item photo", "Vendors are advised to post photos of actual items in stock.", [
    { text: "Take photo", onPress: fromCamera },
    { text: "Choose from gallery", onPress: fromGallery },
    { text: "Cancel", style: "cancel" },
  ]);
};

const UploadBox = ({ label, asset, onPick, onClear }) => (
  <View style={styles.uploadWrap}>
    {asset ? (
      <View>
        <Image source={{ uri: asset.uri }} style={styles.uploadPreview} />
        <TouchableOpacity style={styles.uploadClear} onPress={onClear}>
          <Ionicons name="close" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity style={styles.uploadBox} onPress={onPick}>
        <View style={styles.uploadPlus}>
          <Ionicons name="add" size={20} color={COLORS.slate} />
        </View>
        <Text style={styles.uploadLabel}>{label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const FieldLabel = ({ children }) => <Text style={styles.fieldLabel}>{children}</Text>;

const AddListingScreen = ({ navigation }) => {
  const token = useUserStore((state) => state.token);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — product details
  const [name, setName] = useState("");
  const [condition, setCondition] = useState(null);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // Step 2 — pricing
  const [usePriceRange, setUsePriceRange] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [sizes, setSizes] = useState([]);
  const [stockQuantity, setStockQuantity] = useState(0);

  // Step 3 — tags
  const [occasions, setOccasions] = useState([]);
  const [styleTags, setStyleTags] = useState([]);
  const [customTags, setCustomTags] = useState("");

  const toggleIn = (list, setList) => (value) =>
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  const detailsValid = name.trim().length > 1 && condition && frontImage;
  const pricingValid = usePriceRange
    ? Number(priceMin) > 0 && Number(priceMax) > 0 && Number(priceMin) <= Number(priceMax)
    : Number(basePrice) > 0;

  const submit = async () => {
    setSaving(true);
    try {
      const files = [frontImage, backImage].filter(Boolean);
      const uploaded = await uploadApi.images(token, files);

      await productApi.create(token, {
        name: name.trim(),
        condition,
        images: uploaded.urls,
        usePriceRange,
        basePrice: Number(basePrice) || undefined,
        priceMin: usePriceRange ? Number(priceMin) : undefined,
        priceMax: usePriceRange ? Number(priceMax) : undefined,
        sizes,
        stockQuantity,
        occasionTags: occasions,
        styleTags,
        customTags: customTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert("Could not publish listing", error.message);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "Product details",
      valid: detailsValid,
      content: (
        <>
          <FieldLabel>ITEM NAME</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ankara maxi flared gown"
            placeholderTextColor={COLORS.faint}
            value={name}
            onChangeText={setName}
          />

          <FieldLabel>CATEGORY</FieldLabel>
          {CATEGORY_OPTIONS.map((option) => {
            const active = condition === option.key;

            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.categoryCard, active && styles.categoryCardActive]}
                onPress={() => setCondition(option.key)}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIcon, { backgroundColor: option.iconBg }]}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={20}
                    color={option.iconColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryTitle}>{option.title}</Text>
                  <Text style={styles.categorySubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons
                  name={active ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={active ? COLORS.teal : COLORS.faint}
                />
              </TouchableOpacity>
            );
          })}

          <FieldLabel>ITEM IMAGE</FieldLabel>
          <Text style={styles.hint}>Upload photos of your product</Text>
          <UploadBox
            label="Item front view"
            asset={frontImage}
            onPick={() => pickImage(setFrontImage)}
            onClear={() => setFrontImage(null)}
          />
          <UploadBox
            label="Item back view"
            asset={backImage}
            onPick={() => pickImage(setBackImage)}
            onClear={() => setBackImage(null)}
          />
        </>
      ),
    },
    {
      title: "Pricing",
      valid: pricingValid,
      content: (
        <>
          {!usePriceRange ? (
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceInputLabel}>BASE PRICE</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="₦0"
                placeholderTextColor={COLORS.faint}
                keyboardType="numeric"
                value={basePrice}
                onChangeText={setBasePrice}
              />
            </View>
          ) : null}

          <View style={styles.rangeToggle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeTitle}>Set a price range</Text>
              <Text style={styles.rangeSubtitle}>Let buyers see min-max for negotiations</Text>
            </View>
            <Switch
              value={usePriceRange}
              onValueChange={setUsePriceRange}
              trackColor={{ false: COLORS.line, true: COLORS.teal }}
              thumbColor={COLORS.white}
            />
          </View>

          {usePriceRange ? (
            <>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceInputLabel}>MAXIMUM PRICE</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="₦0"
                  placeholderTextColor={COLORS.faint}
                  keyboardType="numeric"
                  value={priceMax}
                  onChangeText={setPriceMax}
                />
              </View>
              <View style={styles.priceInputWrap}>
                <Text style={styles.priceInputLabel}>MINIMUM PRICE</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="₦0"
                  placeholderTextColor={COLORS.faint}
                  keyboardType="numeric"
                  value={priceMin}
                  onChangeText={setPriceMin}
                />
              </View>
            </>
          ) : null}

          <FieldLabel>SIZES AVAILABLE</FieldLabel>
          <ChipGroup options={SIZES} selected={sizes} onToggle={toggleIn(sizes, setSizes)} />

          <FieldLabel>STOCK QUANTITY</FieldLabel>
          <View style={styles.stepperCard}>
            <QuantityStepper value={stockQuantity} onChange={setStockQuantity} />
          </View>
        </>
      ),
    },
    {
      title: "Tags",
      valid: true,
      content: (
        <>
          <FieldLabel>OCCASION</FieldLabel>
          <ChipGroup
            options={OCCASIONS}
            selected={occasions}
            onToggle={toggleIn(occasions, setOccasions)}
          />

          <FieldLabel>STYLE</FieldLabel>
          <ChipGroup
            options={STYLES}
            selected={styleTags}
            onToggle={toggleIn(styleTags, setStyleTags)}
          />

          <FieldLabel>CUSTOM TAGS</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="e.g. plus size, maternity"
            placeholderTextColor={COLORS.faint}
            value={customTags}
            onChangeText={setCustomTags}
          />
        </>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            {step > 0 ? (
              <TouchableOpacity onPress={() => setStep(step - 1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>{current.title}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.body}
          >
            {current.content}
            <View style={{ height: 12 }} />
          </ScrollView>

          <PrimaryButton
            label={isLast ? "Publish listing" : "Continue"}
            disabled={!current.valid}
            loading={saving}
            onPress={() => (isLast ? submit() : setStep(step + 1))}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.scrim,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "94%",
    ...SHADOWS.sheet,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.line,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
  },
  body: {
    flexGrow: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
    marginTop: 18,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.ink,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  categoryCardActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  categorySubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  uploadWrap: {
    marginBottom: 10,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 26,
    gap: 8,
  },
  uploadPlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  uploadPreview: {
    width: "100%",
    height: 170,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  uploadClear: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  priceInputWrap: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 14,
  },
  priceInputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: COLORS.muted,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.ink,
    paddingVertical: 4,
  },
  rangeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  rangeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  rangeSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  stepperCard: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
  },
});

export default AddListingScreen;
