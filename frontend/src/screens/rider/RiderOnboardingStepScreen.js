import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";
import { SHADOWS } from "../../theme/shadows";
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

const RELATIONSHIPS = ["Employer", "Family", "Friend"];
const VEHICLE_TYPES = ["Tricycle", "Bike", "Car", "Van"];
const BANKS = [
  "Access Bank",
  "Fidelity Bank",
  "First Bank",
  "GTBank",
  "Kuda",
  "Moniepoint",
  "Opay",
  "Stanbic IBTC",
  "UBA",
  "Union Bank",
  "Wema Bank",
  "Zenith Bank",
];

// ---------------------------------------------------------------------------
// Persistence helpers (existing onboardingApi.saveRider wiring, kept intact —
// field names match backend/src/controllers/onboardingController.js).
//
// RiderProfile has no guarantor / vehicle-extras columns. coverageAreas is a
// JSONB column with no other readers, so (like the vendor flow's openingDays)
// it carries an onboarding-meta object with guarantor, vehicle extras
// (colour/ownership/photo), and company affiliation. No new backend columns.
//
// IMPORTANT: the controller always writes `req.body.coverageAreas || []`, so
// every save must resend the meta or it gets wiped — persistRider bakes it in.
// ---------------------------------------------------------------------------

const riderOnboardingMeta = () => {
  const rider = useUserStore.getState().userMetadata?.rider || {};
  const meta = {};

  if (rider.guarantor) meta.guarantor = rider.guarantor;
  if (rider.vehicleExtras) meta.vehicle = rider.vehicleExtras;
  if (rider.companyExtras) meta.company = rider.companyExtras;

  return Object.keys(meta).length ? [{ kind: "onboarding_meta", ...meta }] : [];
};

const persistRider = async (token, payload) => {
  if (!token) return true;

  try {
    await onboardingApi.saveRider(token, {
      ...payload,
      coverageAreas: riderOnboardingMeta(),
      onboardingStatus: "draft",
    });
    return true;
  } catch (error) {
    if (isConnectivityIssue(error.message)) {
      // Dev bypass: an unreachable server must not block onboarding.
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

const StepHeader = ({ onBack, dashes, title, subtitle }) => (
  <View>
    <View style={styles.headerRow}>
      <BackCircle onPress={onBack} />
      {dashes ? <ProgressDashes total={dashes.total} current={dashes.current} /> : <View />}
      <View style={styles.headerSpacer} />
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
  maxLength,
  autoCapitalize,
  adornment,
  editable = true,
}) => (
  <View style={[styles.fieldBox, !editable && styles.fieldBoxDisabled]}>
    <Text style={styles.innerLabel}>{label}</Text>
    <View style={styles.fieldInputRow}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.faint}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
      {adornment ? <Text style={styles.adornment}>{adornment}</Text> : null}
    </View>
  </View>
);

const SelectChip = ({ label, selected, onPress }) => (
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

// ---------------------------------------------------------------------------
// Step 1 — Guarantor
// ---------------------------------------------------------------------------

const GuarantorStep = ({ token, patchNested, goNext, goBack }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [relationship, setRelationship] = useState(null);
  const [saving, setSaving] = useState(false);

  const phoneValid = phone.length >= 10;
  const ready = name.trim().length > 0 && phoneValid && Boolean(relationship);

  const continueNext = async () => {
    setSaving(true);
    patchNested("rider", {
      guarantor: {
        fullName: name.trim(),
        phone: `+234${phone.replace(/^0+/, "")}`,
        email: email.trim(),
        address: address.trim(),
        relationship,
      },
    });
    const ok = await persistRider(token, {});
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
        title="Who can vouch for you?"
        subtitle="We ask every rider for a guarantor — someone who knows you and can confirm you're trustworthy. This is standard."
      />
      <View style={styles.infoBanner}>
        <View style={styles.infoBadge}>
          <Ionicons name="warning" size={15} color={COLORS.white} />
        </View>
        <Text style={styles.infoCopy}>
          Your guarantor may be contacted during our verification process. Give someone who'll
          pick up.
        </Text>
      </View>
      <BoxedField
        label="GUARANTOR'S FULL NAME"
        value={name}
        onChangeText={setName}
        placeholder="Enter guarantor's full name"
      />
      <BoxedField
        label="PHONE NUMBER"
        value={phone}
        onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 11))}
        placeholder="801 234 5678"
        keyboardType="number-pad"
        maxLength={11}
        adornment={"\u{1F1F3}\u{1F1EC} +234"}
      />
      <BoxedField
        label="EMAIL ADDRESS"
        value={email}
        onChangeText={setEmail}
        placeholder="Enter guarantor's email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <BoxedField
        label="ADDRESS"
        value={address}
        onChangeText={setAddress}
        placeholder="Street, area, city"
      />
      <SectionLabel>RELATIONSHIP</SectionLabel>
      <Text style={styles.fieldPrompt}>What is your relationship with your guarantor?</Text>
      <View style={styles.chipGrid}>
        {RELATIONSHIPS.map((option) => (
          <SelectChip
            key={option}
            label={option}
            selected={relationship === option}
            onPress={() => setRelationship(option)}
          />
        ))}
      </View>
    </StepScaffold>
  );
};

// ---------------------------------------------------------------------------
// Step 2 — Vehicle
// ---------------------------------------------------------------------------

const VehicleStep = ({ token, patchNested, goNext, goBack }) => {
  const [plate, setPlate] = useState("");
  const [colour, setColour] = useState("");
  const [licence, setLicence] = useState("");
  const [vehicleType, setVehicleType] = useState(null);
  const [ownership, setOwnership] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const ready = plate.trim().length > 0 && Boolean(vehicleType);

  const continueNext = async () => {
    setSaving(true);

    try {
      const photoUrl = await uploadImageIfPossible(token, photo);
      patchNested("rider", {
        vehicleType,
        plateNumber: plate.trim(),
        licenseNumber: licence.trim(),
        vehicleExtras: {
          colour: colour.trim(),
          ownership,
          ...(photoUrl ? { photoUrl } : {}),
        },
      });
      const ok = await persistRider(token, {
        vehicleType,
        plateNumber: plate.trim(),
        licenseNumber: licence.trim(),
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
          disabled={!ready}
          busy={saving}
          busyLabel="Saving..."
          onPress={continueNext}
        />
      }
    >
      <StepHeader
        onBack={goBack}
        dashes={{ total: 4, current: 1 }}
        title="Tell us about your ride"
        subtitle="Every delivery is tracked and verified. Make sure your vehicle details are accurate."
      />
      <BoxedField
        label="VEHICLE PLATE NUMBER"
        value={plate}
        onChangeText={setPlate}
        placeholder="eg. LAG 173 XA"
        autoCapitalize="characters"
      />
      <BoxedField
        label="VEHICLE COLOUR"
        value={colour}
        onChangeText={setColour}
        placeholder="e.g. red, black, silver"
      />
      <BoxedField
        label="DRIVER'S LICENCE NUMBER"
        value={licence}
        onChangeText={setLicence}
        placeholder="Enter your licence number"
        autoCapitalize="characters"
      />
      <SectionLabel>VEHICLE TYPE</SectionLabel>
      <Text style={styles.fieldPrompt}>What vehicle do you ride?</Text>
      <View style={styles.chipGrid}>
        {VEHICLE_TYPES.map((option) => (
          <SelectChip
            key={option}
            label={option}
            selected={vehicleType === option}
            onPress={() => setVehicleType(option)}
          />
        ))}
      </View>
      <SectionLabel>VEHICLE OWNERSHIP</SectionLabel>
      <Text style={styles.fieldPrompt}>Is this your vehicle?</Text>
      <RadioRow
        label="It's mine"
        selected={ownership === "own"}
        onPress={() => setOwnership("own")}
      />
      <RadioRow
        label="Company-assigned"
        selected={ownership === "company"}
        onPress={() => setOwnership("company")}
      />
      <UploadCard
        label="VEHICLE PHOTO"
        title="Upload a photo of your vehicle"
        hint="Only JPG, PNG files are accepted"
        uri={photo?.uri}
        onPress={() => pickFromLibrary(setPhoto)}
      />
    </StepScaffold>
  );
};

// ---------------------------------------------------------------------------
// Step 3 — Delivery company
// ---------------------------------------------------------------------------

const CompanyStep = ({ token, patchNested, goNext, goBack }) => {
  const [affiliation, setAffiliation] = useState(null); // "company" | "independent"
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const withCompany = affiliation === "company";
  const ready = Boolean(affiliation);

  const continueNext = async () => {
    setSaving(true);
    patchNested("rider", {
      deliveryCompany: withCompany ? companyName.trim() : "",
      companyExtras: {
        affiliation,
        ...(withCompany ? { email: companyEmail.trim() } : {}),
      },
    });
    const ok = await persistRider(token, {
      deliveryCompany: withCompany ? companyName.trim() : "",
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
        dashes={{ total: 4, current: 2 }}
        title="Delivery company"
        subtitle="No wrong answer here — just helps us understand how you operate."
      />
      <SectionLabel>AFFILIATION</SectionLabel>
      <Text style={styles.fieldPrompt}>
        Are you riding for a company or going independent?
      </Text>
      <RadioRow
        label="I work with a company"
        selected={affiliation === "company"}
        onPress={() => setAffiliation("company")}
      />
      <RadioRow
        label="I'm independent"
        selected={affiliation === "independent"}
        onPress={() => setAffiliation("independent")}
      />
      {withCompany ? (
        <>
          <BoxedField
            label="COMPANY NAME"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Enter delivery company"
          />
          <BoxedField
            label="EMAIL ADDRESS"
            value={companyEmail}
            onChangeText={setCompanyEmail}
            placeholder="If you work with one"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>
      ) : null}
    </StepScaffold>
  );
};

// ---------------------------------------------------------------------------
// Step 4 — Payout (+ location primer modal before advancing)
// ---------------------------------------------------------------------------

const PayoutStep = ({ token, patchNested, goNext, goBack }) => {
  const [bank, setBank] = useState("");
  const [bankListOpen, setBankListOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [locationVisible, setLocationVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const ready = bank.length > 0 && accountNumber.length === 10;

  const continueNext = async () => {
    setSaving(true);
    patchNested("rider", { bankName: bank, accountNumber });
    const ok = await persistRider(token, { bankName: bank, accountNumber });
    setSaving(false);
    if (ok) setLocationVisible(true);
  };

  // expo-location is not installed in this app, so there is no runtime
  // permission to request — the primer modal simply dismisses and advances.
  const allowLocation = () => {
    setLocationVisible(false);
    goNext();
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
        dashes={{ total: 4, current: 3 }}
        title="Set up your payout account"
        subtitle="Every kobo you earn lands here. Add the bank account you want your payouts sent to — make sure it's registered in your name."
      />
      <SectionLabel>ACCOUNT DETAILS</SectionLabel>
      <TouchableOpacity
        style={styles.fieldBox}
        activeOpacity={0.8}
        onPress={() => setBankListOpen((open) => !open)}
      >
        <Text style={styles.innerLabel}>BANK NAME</Text>
        <View style={styles.fieldInputRow}>
          <Text style={[styles.fieldValue, !bank && { color: COLORS.faint }]}>
            {bank || "Select your bank"}
          </Text>
          <Ionicons
            name={bankListOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.muted}
          />
        </View>
      </TouchableOpacity>
      {bankListOpen ? (
        <View style={styles.bankList}>
          {BANKS.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.bankRow}
              activeOpacity={0.8}
              onPress={() => {
                setBank(option);
                setBankListOpen(false);
              }}
            >
              <Text style={[styles.bankText, option === bank && { color: COLORS.teal }]}>
                {option}
              </Text>
              {option === bank ? (
                <Ionicons name="checkmark" size={16} color={COLORS.teal} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      <BoxedField
        label="ACCOUNT NUMBER"
        value={accountNumber}
        onChangeText={(value) => setAccountNumber(value.replace(/\D/g, "").slice(0, 10))}
        placeholder="10-digit account number"
        keyboardType="number-pad"
        maxLength={10}
      />

      <Modal
        visible={locationVisible}
        transparent
        animationType="fade"
        onRequestClose={allowLocation}
      >
        <View style={styles.centerScrim}>
          <View style={[styles.centerCard, SHADOWS.sheet]}>
            <View style={styles.pinCircle}>
              <Ionicons name="location" size={30} color={COLORS.red} />
            </View>
            <Text style={styles.centerTitle}>Almost there.</Text>
            <Text style={styles.centerCopy}>
              We use your location to match you with nearby delivery requests. Without it, you
              won't receive any jobs.
            </Text>
            <PillButton
              label="Allow location access"
              onPress={allowLocation}
              style={styles.centerButton}
            />
          </View>
        </View>
      </Modal>
    </StepScaffold>
  );
};

// ---------------------------------------------------------------------------
// Step 5 — KYC (shared kit under src/components/kyc, role passed as "rider")
// ---------------------------------------------------------------------------

const IntroStep = ({ navigation, goNext, goBack }) => (
  <KycIntro
    subtitle="Before you hit the road we need to confirm it's really you. Quick, secure, and you only do it once."
    items={[
      "Your NIN",
      "A valid Driver's licence",
      "Your Face - no filter, just you",
    ]}
    onProceed={goNext}
    onBack={navigation.canGoBack() ? goBack : undefined}
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
      onVerify={(nin) => performKycCheck({ token, role: "rider", check: "nin", payload: { nin } })}
      onSuccess={(nin) => {
        patchNested("rider", { ninToken: nin });
        goNext();
      }}
      onBack={goBack}
    />
  );
};

const DocumentStep = ({ token, goNext, goBack }) => (
  <DocumentCaptureScreen
    title="Driver's licence capture"
    subtitle="Hold your licence flat inside the frame. All four corners visible, text sharp and readable. Its gotta be clean."
    frameLabel="FIT YOUR LICENCE HERE"
    captureLabel="Capture licence"
    confirmBusyLabel="Checking your licence..."
    onConfirm={async (asset) => {
      const imageUrl = (await uploadImageIfPossible(token, asset)) || "";
      // Payload shape preserved from the previous rider implementation:
      // { imageUrl } only (it sent no documentType for the document check).
      const outcome = await performKycCheck({
        token,
        role: "rider",
        check: "document",
        payload: { imageUrl },
      });

      if (outcome.state !== "success") {
        throw new Error(
          "We couldn't verify this licence. Retake it in good light with all four corners visible.",
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

      return performKycCheck({ token, role: "rider", check: "liveness", payload: { imageUrl } });
    }}
    onSuccess={goNext}
    onBack={goBack}
  />
);

// ---------------------------------------------------------------------------
// Step 6 — Submitted
// ---------------------------------------------------------------------------

const SubmittedStep = ({ token, goNext }) => {
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current || !token) return;
    submittedRef.current = true;
    // Flip the backend onboardingStatus to "submitted" exactly once.
    onboardingApi.submit(token, "rider").catch(() => {});
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
          your vehicle and guarantor details and have you cleared within 48 hours.
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
      title={title || "Rider setup"}
      subtitle="Complete this rider onboarding step."
    />
  </StepScaffold>
);

// nodeId -> step component (nodeIds retained from the Figma track map).
const STEP_BY_NODE = {
  "147-2868": GuarantorStep,
  "147-3117": VehicleStep,
  "147-3132": CompanyStep,
  "147-3000": PayoutStep,
  "147-2786": IntroStep,
  "147-2886": NinStep,
  "147-3931": DocumentStep,
  "147-2858": LivenessStep,
  "147-3010": SubmittedStep,
};

const RiderOnboardingStepScreen = ({ navigation, route }) => {
  const token = useUserStore((state) => state.token);
  const userMetadata = useUserStore((state) => state.userMetadata);
  const patchNested = useUserStore((state) => state.patchNestedMetadata);
  const resetUser = useUserStore((state) => state.resetUser);
  const { nodeId, title, nextRoute } = route.params || {};

  const goNext = () => navigation.navigate(nextRoute || "RiderDashboard");
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
  infoBanner: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.amberSoft,
    borderRadius: 14,
    padding: 14,
  },
  infoBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.slate,
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
  fieldBoxDisabled: {
    backgroundColor: COLORS.surface,
  },
  innerLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.muted,
  },
  fieldInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    marginTop: 4,
    fontSize: 15,
    color: COLORS.ink,
    padding: 0,
  },
  fieldValue: {
    flex: 1,
    marginTop: 4,
    fontSize: 15,
    color: COLORS.ink,
  },
  adornment: {
    marginTop: 4,
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.slate,
  },
  fieldPrompt: {
    marginTop: 8,
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
  bankList: {
    marginTop: 8,
    borderWidth: 1.4,
    borderColor: COLORS.line,
    borderRadius: 14,
    overflow: "hidden",
  },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  bankText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.ink,
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
  pinCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.redSoft,
    alignItems: "center",
    justifyContent: "center",
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
  centerButton: {
    alignSelf: "stretch",
    marginTop: 18,
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

export default RiderOnboardingStepScreen;
