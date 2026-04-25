import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  addReading,
  uploadReportImage,
  extractReportValues,
} from '../services/readingService';
import { getMyPatientProfile } from '../services/patientService';
import { colors, radius, shadows, typography } from '../utils/theme';

export default function AddReadingScreen({ route, navigation }) {
  const [patientId, setPatientId] = useState(route?.params?.patientId ?? null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [inputMode, setInputMode] = useState(null);

  const [form, setForm] = useState({
    creatinine_value: '',
    acr: '',
    egfr: '',
    systolic_bp: '',
    diastolic_bp: '',
    sensor_value_1: '',
    sensor_value_2: '',
    adherence_score: '',
    fatigue: false,
    swelling: false,
    low_urine_output: false,
    report_image_path: '',
  });

  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [uploadedReportPath, setUploadedReportPath] = useState('');
  const [rawExtractText, setRawExtractText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (!patientId) {
          const patient = await getMyPatientProfile();
          if (patient?.id) setPatientId(patient.id);
        }
      } catch (error) {
        console.log(
          'PATIENT PROFILE ERROR:',
          error?.response?.data || error.message
        );
      } finally {
        setLoadingPatient(false);
      }
    })();
  }, []);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickReportImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow gallery access to attach a report image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        setSelectedImageUri(uri);
        setUploadedReportPath('');
        setRawExtractText('');
        setField('report_image_path', uri);
      }
    } catch (error) {
      Alert.alert('Image selection failed', error.message || 'Try again.');
    }
  };

  const removeReportImage = () => {
    setSelectedImageUri('');
    setUploadedReportPath('');
    setRawExtractText('');
    setField('report_image_path', '');
  };

  const handleExtractValues = async () => {
    try {
      if (!selectedImageUri) {
        Alert.alert('No image selected', 'Please upload a report image first.');
        return;
      }

      setExtracting(true);

      let reportPath = uploadedReportPath;

      if (!reportPath) {
        const uploadResult = await uploadReportImage(selectedImageUri);
        reportPath = uploadResult?.report_image_path || '';
        setUploadedReportPath(reportPath);
        setField('report_image_path', reportPath);
      }

      const result = await extractReportValues(reportPath);
      const extracted = result?.extracted_values || {};
      setRawExtractText(result?.raw_text || '');

      if (extracted.creatinine_value != null) {
        setField('creatinine_value', String(extracted.creatinine_value));
      }
      if (extracted.acr != null) {
        setField('acr', String(extracted.acr));
      }
      if (extracted.egfr != null) {
        setField('egfr', String(extracted.egfr));
      }
      if (extracted.systolic_bp != null) {
        setField('systolic_bp', String(extracted.systolic_bp));
      }
      if (extracted.diastolic_bp != null) {
        setField('diastolic_bp', String(extracted.diastolic_bp));
      }

      Alert.alert(
        'Values extracted',
        'Review the extracted CKD values and correct anything before saving.'
      );
    } catch (error) {
      Alert.alert(
        'Extraction failed',
        JSON.stringify(error?.response?.data || error.message)
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!patientId) {
        Alert.alert(
          'Unable to save reading',
          'Patient ID is missing. Please sign in again.'
        );
        return;
      }

      if (!inputMode) {
        Alert.alert(
          'Choose input method',
          'Please choose Upload Report Image or Enter Readings Manually first.'
        );
        return;
      }

      setSaving(true);

      let finalReportPath = uploadedReportPath;

      if (selectedImageUri && !finalReportPath) {
        const uploadResult = await uploadReportImage(selectedImageUri);
        finalReportPath = uploadResult?.report_image_path || null;
      }

      const payload = {
        creatinine_value: parseFloat(form.creatinine_value) || 0,
        acr: parseFloat(form.acr) || 0,
        egfr: parseFloat(form.egfr) || 0,
        systolic_bp: parseFloat(form.systolic_bp) || 0,
        diastolic_bp: parseFloat(form.diastolic_bp) || 0,
        sensor_value_1: parseFloat(form.sensor_value_1) || 0,
        sensor_value_2: parseFloat(form.sensor_value_2) || 0,
        adherence_score: parseFloat(form.adherence_score) || 0,
        symptom_fatigue: form.fatigue,
        symptom_swelling: form.swelling,
        symptom_low_urine: form.low_urine_output,
        source: finalReportPath ? 'manual_with_report' : 'manual',
        report_image_path: finalReportPath,
      };

      await addReading(patientId, payload);
      Alert.alert('Saved', 'CKD reading submitted successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Unable to save reading',
        JSON.stringify(error?.response?.data || error.message)
      );
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({
    label,
    hint,
    value,
    onChangeText,
    keyboardType = 'numeric',
  }) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );

  const ToggleField = ({ label, value, onValueChange }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );

  const renderForm = () => (
    <>
      <View style={styles.cardBox}>
        <Text style={styles.cardTitle}>Dataset-based CKD inputs</Text>

        <InputField
          label="Creatinine (mg/dL)"
          hint="Serum creatinine from renal lab test"
          value={form.creatinine_value}
          onChangeText={(v) => setField('creatinine_value', v)}
        />
        <InputField
          label="Urine ACR (mg/g)"
          hint="Albumin-to-creatinine ratio"
          value={form.acr}
          onChangeText={(v) => setField('acr', v)}
        />
        <InputField
          label="eGFR (mL/min/1.73m²)"
          hint="Estimated kidney filtration rate"
          value={form.egfr}
          onChangeText={(v) => setField('egfr', v)}
        />
        <InputField
          label="Systolic BP (mmHg)"
          hint="Top blood pressure number"
          value={form.systolic_bp}
          onChangeText={(v) => setField('systolic_bp', v)}
        />
        <InputField
          label="Diastolic BP (mmHg)"
          hint="Bottom blood pressure number"
          value={form.diastolic_bp}
          onChangeText={(v) => setField('diastolic_bp', v)}
        />
        <InputField
          label="Sensor Reading 1"
          hint="Primary sensor value from your tested dataset workflow"
          value={form.sensor_value_1}
          onChangeText={(v) => setField('sensor_value_1', v)}
        />
        <InputField
          label="Sensor Reading 2"
          hint="Secondary sensor value from your tested dataset workflow"
          value={form.sensor_value_2}
          onChangeText={(v) => setField('sensor_value_2', v)}
        />
        <InputField
          label="Adherence Score (%)"
          hint="Medication and monitoring adherence"
          value={form.adherence_score}
          onChangeText={(v) => setField('adherence_score', v)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kidney symptoms</Text>
        <ToggleField
          label="Fatigue"
          value={form.fatigue}
          onValueChange={(v) => setField('fatigue', v)}
        />
        <ToggleField
          label="Swelling"
          value={form.swelling}
          onValueChange={(v) => setField('swelling', v)}
        />
        <ToggleField
          label="Low urine output"
          value={form.low_urine_output}
          onValueChange={(v) => setField('low_urine_output', v)}
        />
      </View>
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>CKD Guardian</Text>
      <Text style={styles.title}>Submit CKD Reading</Text>
      <Text style={styles.subtitle}>
        Choose one method to provide the CKD dataset values used for prediction.
      </Text>

      {loadingPatient ? (
        <Text style={styles.infoText}>Loading patient profile...</Text>
      ) : !patientId ? (
        <Text style={styles.errorText}>Patient profile could not be loaded.</Text>
      ) : null}

      {!inputMode ? (
        <View style={styles.modeWrap}>
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setInputMode('upload')}
          >
            <Text style={styles.modeTitle}>Upload Report Image</Text>
            <Text style={styles.modeText}>
              Upload a lab report image, extract values, and review them before saving.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setInputMode('manual')}
          >
            <Text style={styles.modeTitle}>Enter Readings Manually</Text>
            <Text style={styles.modeText}>
              Type the CKD dataset values directly and continue with manual entry.
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {inputMode === 'upload' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report image</Text>
            <Text style={styles.hintText}>
              Upload the report, extract CKD values, then review them below.
            </Text>

            {selectedImageUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: selectedImageUri }} style={styles.preview} />
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={removeReportImage}
                    disabled={saving || extracting}
                  >
                    <Text style={styles.secondaryButtonText}>Remove image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={pickReportImage}
                    disabled={saving || extracting}
                  >
                    <Text style={styles.secondaryButtonText}>Change image</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.extractButton}
                  onPress={handleExtractValues}
                  disabled={saving || extracting}
                >
                  <Text style={styles.extractButtonText}>
                    {extracting ? 'Extracting...' : 'Extract Values from Report'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickReportImage}
                disabled={saving || extracting}
              >
                <Text style={styles.uploadButtonText}>Upload Report Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderForm()}
        </>
      ) : null}

      {inputMode === 'manual' ? renderForm() : null}

      {inputMode ? (
        <>
          <TouchableOpacity
            style={styles.changeModeLink}
            onPress={() => {
              setInputMode(null);
              setSelectedImageUri('');
              setUploadedReportPath('');
              setRawExtractText('');
              setField('report_image_path', '');
            }}
            disabled={saving || extracting}
          >
            <Text style={styles.changeModeText}>Change input method</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (!patientId || saving || extracting) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!patientId || saving || extracting}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save CKD Reading'}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  kicker: { color: colors.accent, fontWeight: '800', marginBottom: 6 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 },
  infoText: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c', marginBottom: 16 },
  modeWrap: { gap: 14, marginBottom: 20 },
  modeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius?.xl || 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows?.card || {}),
  },
  modeTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modeText: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  cardBox: {
    backgroundColor: colors.surface,
    borderRadius: radius?.xl || 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...(shadows?.card || {}),
  },
  cardTitle: { fontSize: typography?.h3 || 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
  fieldBlock: { marginBottom: 18 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 8 },
  hintText: { fontSize: 13, color: colors.muted, lineHeight: 20, marginBottom: 12 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  section: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...(shadows?.card || {}),
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  toggleLabel: { fontSize: 15, color: '#1e293b' },
  uploadButton: {
    backgroundColor: colors.softBlue,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  uploadButtonText: { color: colors.accent, fontWeight: '700' },
  previewBox: { alignItems: 'center' },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  previewActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryButton: {
    backgroundColor: colors.primarySoft || '#DCEBFF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  secondaryButtonText: { color: colors.accent, fontWeight: '700' },
  extractButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  extractButtonText: { color: '#fff', fontWeight: '700' },
  changeModeLink: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  changeModeText: { color: colors.accent, fontWeight: '700' },
  button: {
    marginTop: 4,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});