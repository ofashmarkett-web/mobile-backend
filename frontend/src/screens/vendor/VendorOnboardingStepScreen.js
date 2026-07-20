import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
import LeafletMap from "../../components/common/LeafletMap";
import { onboardingApi, uploadApi } from "../../services/apiClient";
import { useUserStore } from "../../store/userStore";
import {
  BackCircle,
  DocumentCaptureScreen,
  KycIntro,
  LivenessScreen,
  NumberVerifyStep,
  PillButton,
  isConnectivityIssue,
  performKycCheck,
} from "../../components/kyc";

const CATEGORIES = [
  "Ready to wear",
  "Aso-ebi & Occasion",
  "Footwear",
  "Traditional & Native",
  "Thrift & Vintage",
  "Accessories",
  "Active wear",
  "Bridal",
  "Textiles",
  "Hats",
  "Streetwear",
  "Costumes",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_OPTIONS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM",
  "8:00 PM", "9:00 PM", "10:00 PM",
];

// Preserved from the previous implementation — the backend/Dojah document
// payload shape is { documentType, imageUrl }.
const DEFAULT_DOCUMENT_TYPE = "NIN slip";

// ---------------------------------------------------------------------------
// Persistence helpers (existing saveVendor / upload wiring, kept intact).
// Partial payloads are safe: the backend upsert ignores undefined keys, so a
// step only overwrites the fields it owns.
// ---------------------------------------------------------------------------

const persistVendor = async (token, payload) => {
  if (!token) return true;

  try {
    await onboardingApi.saveVendor(token, payload);
    return true;
  } catch (error) {
    if (isConnectivityIssue(error.message)) {
      // Dev bypass: backend runs VENDOR_VERIFICATION_ENFORCED=false, so an
      // unreachable server must not block onboarding.
      return true;
    }
    Alert.alert("Could not save", error.message);
    return false;
  }
};

const uploadImageIfPossible = async (token, asset) => {
  if (!token || !asset) return undefined;

  try {
    const uploaded = await uploadApi.images(token, [asset]);
    return uploaded.urls?.[0];
  } catch (error) {
    if (isConnectivityIssue(error.message)) return undefined;
    throw error;
  }
};

const pickFromLibrary = async (onPicked) => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert("Photo access needed", "Allow photo access to upload images.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (!result.canceled) onPicked(result.assets[0]);
};

// ---------------------------------------------------------------------------
// Module-scope UI pieces. IMPORTANT: never define components inside another
// component and render them as JSX elements — identity changes every render,
// React remounts and TextInputs lose focus.
// ---------------------------------------------------------------------------

const ProgressDashes = ({ total = 4, current = 0 }) => (
  <View style={styles.dashRow}>
    {Array.from({ length: total }).map((_, index) => (
      <View
        key={index}
        style={[styles.dash, index === current && { backgroundColor: COLORS.teal }]}
      />
    ))}
  </View>
);

const StepHeader = ({ onBack, dashes, onSkip, title, subtitle }) => (
  <View>
    <View style={styles.headerRow}>
      <BackCircle onPress={onBack} />
      {dashes ? <ProgressDashes total={dashes.total} current={dashes.current} /> : <View />}
      {onSkip ? (
        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const StepScaffold = ({ children, footer }) => (
  <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </KeyboardAvoidingView>
  </SafeAreaView>
);

const SectionLabel = ({ children }) => <Text style={styles.sectionLabel}>{children}</Text>;

const BoxedField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  optional,
  maxLength,
  autoCapitalize,
}) => (
  <View style={[styles.fieldBox, multiline && styles.fieldBoxMultiline]}>
    <View style={styles.fieldLabelRow}>
      <Text style={styles.innerLabel}>{label}</Text>
      {optional ? <Text style={styles.optionalTag}>Optional</Text> : null}
    </View>
    <TextInput
      style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.faint}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

const CategoryChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
      {label}
    </Text>
    {selected ? <Ionicons name="checkmark-circle" size={16} color={COLORS.teal} /> : null}
  </TouchableOpacity>
);

const UploadCard = ({ label, title, hint, uri, onPress }) => (
  <View style={styles.uploadWrap}>
    {label ? <Text style={styles.innerLabel}>{label}</Text> : null}
    <TouchableOpacity style={styles.uploadCard} onPress={onPress} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={styles.uploadPreview} />
      ) : (
        <>
          <View style={styles.uploadIcon}>
            <Ionicons name="image-outline" size={22} color={COLORS.teal} />
          </View>
          <Text style={styles.uploadTitle}>{title}</Text>
          <Text style={styles.uploadHint}>{hint}</Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

const RadioRow = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.radioRow, selected && styles.radioRowSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.radioOuter, selected && { borderColor: COLORS.teal }]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

const DayHoursRow = ({ day, config, onToggle, onCycle }) => (
  <View style={styles.dayRow}>
    <Switch
      value={config.enabled}
      onValueChange={onToggle}
      trackColor={{ false: COLORS.line, true: COLORS.tealSoft }}
      thumbColor={config.enabled ? COLORS.teal : COLORS.faint}
    />
    <Text style={styles.dayLabel}>{day}</Text>
    {config.enabled ? (
      <View style={styles.timeRow}>
        <TouchableOpacity style={styles.timeBox} onPress={() => onCycle("open")}>
          <Text style={styles.timeText}>{config.open}</Text>
        </TouchableOpacity>
        <Text style={styles.timeDash}>–</Text>
        <TouchableOpacity style={styles.timeBox} onPress={() => onCycle("close")}>
          <Text style={styles.timeText}>{config.close}</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <Text style={styles.closedText}>Closed</Text>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// KYC steps (shared kit under src/components/kyc, role passed as "vendor")
// ---------------------------------------------------------------------------

const IntroStep = ({ navigation, goNext, goBack }) => (
  <KycIntro
    subtitle="Before your store goes live we need to confirm it's really you. Quick, secure, and you only do it once."
    items={[
      "Your NIN",
      "A valid ID or government document",
      "Your Face - no filter, just you",
    ]}
    onProceed={goNext}
    onBack={goBack}
  />
);

const NinStep = ({ token, userMetadata, patchNested, goNext, goBack }) => {
  const firstName = userMetadata?.profile?.firstName;

  return (
    <NumberVerifyStep
      label="NIN"
      title="Enter your NIN"
      subtitle="Input your 11-digit National Identification Number."
      successMessage={`You are almost there${firstName ? ` ${firstName}` : ""}`}
      onVerify={(nin) => performKycCheck({ token, role: "vendor", check: "nin", payload: { nin } })}
      onSuccess={(nin) => {
        patchNested("verification", { ninToken: nin });
        goNext();
      }}
      onBack={goBack}
    />
  );
};

const DocumentStep = ({ token, goNext, goBack }) => (
  <DocumentCaptureScreen
    onConfirm={async (asset) => {
      const imageUrl = (await uploadImageIfPossible(token, asset)) || "";
      const outcome = await performKycCheck({
        token,
        role: "vendor",
        check: "document",
        payload: { documentType: DEFAULT_DOCUMENT_TYPE, imageUrl },
      });

      if (outcome.state !== "success") {
        throw new Error(
          "We couldn't verify this document. Retake it in good light with all four corners visible.",
        );
      }
    }}
    onDone={goNext}
    onBack={goBack}
  />
);

const LivenessStep = ({ token, goNext, goBack }) => (
  <LivenessScreen
    onRun={async (selfie) => {
      let imageUrl;

      try {
        imageUrl = await uploadImageIfPossible(token, selfie);
      } catch (error) {
        imageUrl = undefined;
      }

      return performKycCheck({ token, role: "vendor", check: "liveness", payload: { imageUrl } });
    }}
    onSuccess={goNext}
    onBack={goBack}
  />
);

// ---------------------------------------------------------------------------
// Store setup steps
// ---------------------------------------------------------------------------

const StoreInfoStep = ({ token, userMetadata, patchNested, goNext, goBack }) => {
  const [businessName, setBusinessName] = useState(userMetadata?.vendor?.businessName || "");
  const [businessEmail, setBusinessEmail] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (category) =>
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );

  const ready = businessName.trim().length > 0 && selected.length > 0;

  const continueNext = async () => {
    setSaving(true);
    patchNested("vendor", {
      businessName: businessName.trim(),
      storeCategory: selected.join(", "),
    });
    const ok = await persistVendor(token, {
      businessName: businessName.trim(),
      businessEmail: businessEmail.trim(),
      description,
      categories: selected,
      onboardingStatus: "draft",
    });
    setSaving(false);
    if (ok) goNext();
  };

  return (
    <StepScaffold
      footer={
        <PillButton
          label="Continue"
          disabled={!ready}
          busy={saving}
          busyLabel="Saving..."
          onPress={continueNext}
        />
      }
    >
      <StepHeader
        onBack={goBack}
        dashes={{ total: 4, current: 0 }}
        title="Tell us about your store"
        subtitle="Are you selling as yourself or under a registered business? Either works — we just need to know."
      />
      <SectionLabel>BUSINESS INFORMATION</SectionLabel>
      <BoxedField
        label="BUSINESS NAME"
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="eg. Zaras closet, Fits Threads"
      />
      <BoxedField
        label="BUSINESS EMAIL"
        optional
        value={businessEmail}
        onChangeText={setBusinessEmail}
        placeholder="eg. store@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <BoxedField
        label="BUSINESS DESCRIPTION"
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="Pitch simple, what does your store do/sell"
      />
      <Text style={styles.fieldPrompt}>Pick one or more categories for your store</Text>
      <View style={styles.chipGrid}>
        {CATEGORIES.map((category) => (
          <CategoryChip
            key={category}
            label={category}
            selected={selected.includes(category)}
            onPress={() => toggleCategory(category)}
          />
        ))}
      </View>
    </StepScaffold>
  );
};

const CacStep = ({ token, userMetadata, patchNested, goNext, goBack }) => {
  const [cacNumber, setCacNumber] = useState(userMetadata?.vendor?.cacNumber || "");
  const [certificate, setCertificate] = useState(null);
  const [saving, setSaving] = useState(false);

  const continueNext = async () => {
    setSaving(true);

    try {
      const cacCertificateUrl = await uploadImageIfPossible(token, certificate);
      patchNested("vendor", { cacNumber: cacNumber.trim() });
      const ok = await persistVendor(token, {
        cacNumber: cacNumber.trim(),
        ...(cacCertificateUrl ? { cacCertificateUrl } : {}),
      });
      if (ok) goNext();
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepScaffold
      footer={
        <PillButton label="Continue" busy={saving} busyLabel="Saving..." onPress={continueNext} />
      }
    >
      <StepHeader
        onBack={goBack}
        dashes={{ total: 4, current: 1 }}
        title="Is your business registered?"
        subtitle="Upload your CAC certificate to get a Verified badge on your store. Not ready yet? You can add it later from your settings."
      />
      <View style={styles.infoBanner}>
        <View style={styles.infoBadge}>
          <MaterialCommunityIcons name="shield-check" size={16} color={COLORS.white} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.infoTitle}>What's the difference?</Text>
          <Text style={styles.infoCopy}>
            A CAC-verified store carries the green Verified badge buyers trust — and it bumps your
            reach in search. Stores without it can still sell, they just start with less clout.
          </Text>
        </View>
      </View>
      <BoxedField
        label="CAC REGISTRATION NUMBER"
        optional
        value={cacNumber}
        onChangeText={setCacNumber}
        placeholder="eg. RC0000000"
        autoCapitalize="characters"
      />
      <UploadCard
        title="Upload your CAC certificate"
        hint="JPG, PNG or PDF - Max 5MB"
        uri={certificate?.uri}
        onPress={() => pickFromLibrary(setCertificate)}
      />
    </StepScaffold>
  );
};

const BrandingStep = ({ token, userMetadata, patchNested, goNext, goBack }) => {
  const [name, setName] = useState(userMetadata?.vendor?.businessName || "");
  const [editingName, setEditingName] = useState(false);
  const [logo, setLogo] = useState(null);
  const [banner, setBanner] = useState(null);
  const [skipVisible, setSkipVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const continueNext = async () => {
    setSaving(true);

    try {
      const storeLogoUrl = await uploadImageIfPossible(token, logo);
      const storeBannerUrl = await uploadImageIfPossible(token, banner);
      const trimmed = name.trim();

      if (trimmed) patchNested("vendor", { businessName: trimmed });

      const ok = await persistVendor(token, {
        ...(trimmed ? { businessName: trimmed } : {}),
        ...(storeLogoUrl ? { storeLogoUrl } : {}),
        ...(storeBannerUrl ? { storeBannerUrl } : {}),
      });
      if (ok) goNext();
    } catch (error) {
      Alert.alert("Upload failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepScaffold
      footer={
        <PillButton
          label="Continue"
          busy={saving}
          busyLabel="Uploading..."
          onPress={continueNext}
        />
      }
    >
      <StepHeader
        onBack={goBack}
        dashes={{ total: 4, current: 2 }}
        onSkip={() => setSkipVisible(true)}
        title="Make your store look the part"
        subtitle="First impressions count double online. Add your logo and banner so buyers recognise your store instantly."
      />
      <SectionLabel>STORE BRANDING</SectionLabel>
      <View style={styles.nameRow}>
        <View style={styles.flex}>
          <Text style={styles.innerLabel}>BUSINESS NAME</Text>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              onBlur={() => setEditingName(false)}
              autoFocus
            />
          ) : (
            <Text style={styles.nameValue}>{name || "Your store name"}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setEditingName(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={19} color={COLORS.teal} />
        </TouchableOpacity>
      </View>
      <UploadCard
        label="STORE LOGO"
        title="Upload your brand logo"
        hint="Only JPG, PNG, or WEBP files are accepted"
        uri={logo?.uri}
        onPress={() => pickFromLibrary(setLogo)}
      />
      <UploadCard
        label="STORE BANNER"
        title="Upload your store banner"
        hint="Only JPG, PNG, or WEBP files are accepted"
        uri={banner?.uri}
        onPress={() => pickFromLibrary(setBanner)}
      />

      <Modal
        visible={skipVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkipVisible(false)}
      >
        <View style={styles.centerScrim}>
          <View style={[styles.centerCard, SHADOWS.sheet]}>
            <View style={styles.skipIconWrap}>
              <MaterialCommunityIcons name="storefront-outline" size={30} color={COLORS.slate} />
              <View style={styles.skipDot} />
            </View>
            <Text style={styles.centerTitle}>Skip store branding?</Text>
            <Text style={styles.centerCopy}>
              The best-performing stores on O-Fash all have one thing in common — they show up
              looking ready. Add your logo and banner and start strong.
            </Text>
            <View style={styles.centerButtons}>
              <PillButton
                label="Go back"
                variant="outline"
                onPress={() => setSkipVisible(false)}
                style={styles.flex}
              />
              <PillButton
                label="Yes, Skip"
                onPress={() => {
                  setSkipVisible(false);
                  goNext();
                }}
                style={styles.flex}
              />
            </View>
          </View>
        </View>
      </Modal>
    </StepScaffold>
  );
};

const defaultHours = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = { enabled: day !== "Sun", open: "9:00 AM", close: "6:00 PM" };
    return acc;
  }, {});

// Free OSM geocoder. Nominatim asks for a descriptive User-Agent; keep 1 req
// per debounce window (900ms) to stay well inside its usage policy.
const geocodeAddress = async (query) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": "o-fash-markett/1.0" } },
  );
  if (!response.ok) return null;
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  const hit = results[0];
  const latitude = parseFloat(hit.lat);
  const longitude = parseFloat(hit.lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude, displayName: hit.display_name };
};

const LocationStep = ({ token, goNext, goBack }) => {
  const [fulfilment, setFulfilment] = useState("dispatch");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [hours, setHours] = useState(defaultHours);
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState("idle"); // idle | searching | found | notfound
  const [geoLabel, setGeoLabel] = useState("");
  const geoRequestRef = useRef(0);

  // Realtime pin: debounce typing ~900ms, then geocode the full address.
  // Tries "address, landmark" first for precision, then address alone.
  useEffect(() => {
    const trimmedAddress = address.trim();
    const trimmedLandmark = landmark.trim();

    if (trimmedAddress.length < 4) {
      geoRequestRef.current += 1;
      setCoords(null);
      setGeoLabel("");
      setGeoStatus("idle");
      return undefined;
    }

    const requestId = geoRequestRef.current + 1;
    geoRequestRef.current = requestId;

    const timer = setTimeout(async () => {
      setGeoStatus("searching");
      const attempts = trimmedLandmark
        ? [`${trimmedAddress}, ${trimmedLandmark}`, trimmedAddress]
        : [trimmedAddress];

      let hit = null;
      for (const query of attempts) {
        try {
          hit = await geocodeAddress(query);
        } catch (error) {
          hit = null;
        }
        if (hit || geoRequestRef.current !== requestId) break;
      }

      if (geoRequestRef.current !== requestId) return; // stale response — a newer keystroke won

      if (hit) {
        setCoords({ latitude: hit.latitude, longitude: hit.longitude });
        setGeoLabel(hit.displayName);
        setGeoStatus("found");
      } else {
        setGeoLabel("");
        setGeoStatus("notfound");
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [address, landmark]);

  const toggleDay = (day) =>
    setHours((current) => ({
      ...current,
      [day]: { ...current[day], enabled: !current[day].enabled },
    }));

  const cycleTime = (day, field) =>
    setHours((current) => {
      const index = TIME_OPTIONS.indexOf(current[day][field]);
      const next = TIME_OPTIONS[(index + 1) % TIME_OPTIONS.length];
      return { ...current, [day]: { ...current[day], [field]: next } };
    });

  const continueNext = async () => {
    setSaving(true);
    // openingDays is a JSONB column with no other readers yet, so it carries
    // the per-day open/close objects (no new backend columns invented).
    const openingDays = DAYS.filter((day) => hours[day].enabled).map((day) => ({
      day,
      open: hours[day].open,
      close: hours[day].close,
    }));
    const ok = await persistVendor(token, {
      address,
      landmark,
      deliveryType: fulfilment,
      openingDays,
      // Geocoding never blocks Continue — coords ride along only when found.
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    });
    setSaving(false);
    if (ok) goNext();
  };

  return (
    <StepScaffold
      footer={
        <PillButton label="Continue" busy={saving} busyLabel="Saving..." onPress={continueNext} />
      }
    >
      <StepHeader
        onBack={goBack}
        dashes={{ total: 4, current: 3 }}
        title="Where are you, and when are you open?"
        subtitle={'Because when a buyer in Lekki searches "vendors near me", we want your store to show up.'}
      />
      <SectionLabel>HOW DO YOU FULFIL ORDERS?</SectionLabel>
      <RadioRow
        label="I have a physical store buyers can visit"
        selected={fulfilment === "pickup"}
        onPress={() => setFulfilment("pickup")}
      />
      <RadioRow
        label="I sell online only — O-Fash dispatch delivers"
        selected={fulfilment === "dispatch"}
        onPress={() => setFulfilment("dispatch")}
      />
      <SectionLabel>STORE ADDRESS</SectionLabel>
      <BoxedField
        label="STORE ADDRESS"
        value={address}
        onChangeText={setAddress}
        placeholder="Enter your store address"
      />
      <BoxedField
        label="LANDMARK"
        value={landmark}
        onChangeText={setLandmark}
        placeholder="Nearest landmark"
      />
      <LeafletMap
        latitude={coords ? coords.latitude : null}
        longitude={coords ? coords.longitude : null}
        label={address.trim() || "Your store"}
        height={160}
      />
      {geoStatus === "found" && geoLabel ? (
        <Text style={styles.geoFound} numberOfLines={2}>
          {"📍"} Location pinned: {geoLabel}
        </Text>
      ) : geoStatus === "notfound" ? (
        <Text style={styles.geoMiss} numberOfLines={2}>
          We couldn't find this address yet — check the spelling or add your area/city.
        </Text>
      ) : null}
      <Text style={styles.hoursTitle}>Opening hours</Text>
      {DAYS.map((day) => (
        <DayHoursRow
          key={day}
          day={day}
          config={hours[day]}
          onToggle={() => toggleDay(day)}
          onCycle={(field) => cycleTime(day, field)}
        />
      ))}
    </StepScaffold>
  );
};

const PayoutStep = ({ token, patchNested, goNext, goBack }) => {
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const ready = bank.trim().length > 0 && accountNumber.length === 10;

  const continueNext = async () => {
    setSaving(true);
    patchNested("vendor", { bank: bank.trim(), accountNumber });
    const ok = await persistVendor(token, {
      bankName: bank.trim(),
      accountNumber,
    });
    setSaving(false);
    if (ok) goNext();
  };

  return (
    <StepScaffold
      footer={
        <PillButton
          label="Continue"
          disabled={!ready}
          busy={saving}
          busyLabel="Saving..."
          onPress={continueNext}
        />
      }
    >
      <StepHeader
        onBack={goBack}
        title="Set up your payout account"
        subtitle="Every kobo you earn lands here. Add the bank account you want your payouts sent to — make sure it's registered in your name."
      />
      <SectionLabel>ACCOUNT DETAILS</SectionLabel>
      <BoxedField
        label="BANK NAME"
        value={bank}
        onChangeText={setBank}
        placeholder="eg. GTBank, Access Bank"
      />
      <BoxedField
        label="ACCOUNT NUMBER"
        value={accountNumber}
        onChangeText={(value) => setAccountNumber(value.replace(/\D/g, "").slice(0, 10))}
        placeholder="10-digit account number"
        keyboardType="number-pad"
        maxLength={10}
      />
    </StepScaffold>
  );
};

const SubmittedStep = ({ token, goNext }) => {
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current || !token) return;
    submittedRef.current = true;
    // Flip the backend onboardingStatus to "submitted" exactly once.
    onboardingApi.submit(token, "vendor").catch(() => {});
  }, [token]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.submittedBody}>
        <View style={styles.submittedGlowOuter}>
          <View style={styles.submittedGlowInner}>
            <View style={styles.submittedIcon}>
              <Ionicons name="document-text" size={50} color={COLORS.white} />
            </View>
          </View>
        </View>
        <Text style={styles.submittedTitle}>Application submitted!</Text>
        <Text style={styles.submittedCopy}>
          Your identity check is already in progress — that part is quick. We'll manually review
          your store details and have you cleared within 48 hours.
        </Text>
      </View>
      <View style={styles.footer}>
        <PillButton label="Go to my dashboard" onPress={goNext} />
      </View>
    </SafeAreaView>
  );
};

const FallbackStep = ({ title, goNext, goBack }) => (
  <StepScaffold footer={<PillButton label="Continue" onPress={goNext} />}>
    <StepHeader
      onBack={goBack}
      title={title || "Vendor setup"}
      subtitle="Complete this vendor setup step to keep your store moving."
    />
  </StepScaffold>
);

// nodeId -> step component (nodeIds retained from the Figma track map).
const STEP_BY_NODE = {
  "133-2063": IntroStep,
  "133-2109": NinStep,
  "133-2131": DocumentStep,
  "133-2139": LivenessStep,
  "147-2366": StoreInfoStep,
  "133-1108": CacStep,
  "133-1309": BrandingStep,
  "147-1804": LocationStep,
  "147-2463": PayoutStep,
  "133-2822": SubmittedStep,
  "136-1724": SubmittedStep,
  "147-3820": SubmittedStep,
};

const VendorOnboardingStepScreen = ({ navigation, route }) => {
  const token = useUserStore((state) => state.token);
  const userMetadata = useUserStore((state) => state.userMetadata);
  const patchNested = useUserStore((state) => state.patchNestedMetadata);
  const resetUser = useUserStore((state) => state.resetUser);
  const { nodeId, title, nextRoute } = route.params || {};

  const goNext = () => navigation.navigate(nextRoute || "VendorDashboard");
  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // First step of a restored session: back means "switch account" — clear
    // the saved session and return to signup/login.
    resetUser();
    navigation.getParent?.()?.replace("Auth");
  };

  const Step = STEP_BY_NODE[nodeId] || FallbackStep;

  return (
    <Step
      navigation={navigation}
      token={token}
      userMetadata={userMetadata}
      patchNested={patchNested}
      title={title}
      goNext={goNext}
      goBack={goBack}
    />
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 28,
  },
  footer: {
    padding: 20,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: {
    width: 38,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
  },
  dashRow: {
    flexDirection: "row",
    gap: 6,
  },
  dash: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.line,
  },
  title: {
    marginTop: 22,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    color: COLORS.ink,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.teal,
  },
  fieldBox: {
    marginTop: 12,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  fieldBoxMultiline: {
    minHeight: 108,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  innerLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },
  optionalTag: {
    fontSize: 11,
    color: COLORS.muted,
  },
  fieldInput: {
    marginTop: 4,
    fontSize: 15,
    color: COLORS.ink,
    padding: 0,
  },
  fieldInputMultiline: {
    minHeight: 64,
    textAlignVertical: "top",
  },
  fieldPrompt: {
    marginTop: 22,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.ink,
  },
  chipGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  chip: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  chipText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.slate,
    marginRight: 6,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
  infoBanner: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
    backgroundColor: COLORS.redSoft,
    borderRadius: 14,
    padding: 14,
  },
  infoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.ink,
  },
  infoCopy: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.slate,
  },
  uploadWrap: {
    marginTop: 16,
  },
  uploadCard: {
    marginTop: 8,
    minHeight: 140,
    borderWidth: 1.6,
    borderStyle: "dashed",
    borderColor: COLORS.faint,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 6,
    overflow: "hidden",
  },
  uploadIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  uploadPreview: {
    width: "100%",
    height: 140,
    borderRadius: 10,
  },
  nameRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  nameValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
  },
  nameInput: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.ink,
    padding: 0,
  },
  centerScrim: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerCard: {
    alignSelf: "stretch",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  skipIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  skipDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.star,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  centerTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  centerCopy: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.slate,
    textAlign: "center",
  },
  centerButtons: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  radioRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  radioRowSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.faint,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  radioLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.ink,
  },
  geoFound: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.teal,
  },
  geoMiss: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  hoursTitle: {
    marginTop: 24,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 10,
  },
  dayLabel: {
    width: 40,
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  timeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  timeBox: {
    minWidth: 88,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.ink,
  },
  timeDash: {
    color: COLORS.muted,
  },
  closedText: {
    flex: 1,
    textAlign: "right",
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.muted,
  },
  submittedBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  submittedGlowOuter: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  submittedGlowInner: {
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: "#2FA96C26",
    alignItems: "center",
    justifyContent: "center",
  },
  submittedIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  submittedTitle: {
    marginTop: 26,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
  },
  submittedCopy: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate,
    textAlign: "center",
  },
});

export default VendorOnboardingStepScreen;
