import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ClipboardList, FilePlus, Layers, RefreshCw, Stethoscope } from 'lucide-react-native';
import { getSettings } from '../../api/settings';
import { queryKeys } from '../../api/queryKeys';
import { Button, Card } from '../../components/ui';
import { ScreenWrapper } from '../../components/layout';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { STARTER_TEMPLATES, PERSONAL_INFO_SECTION } from '../../types/formBuilder';
import { uid } from '../../utils/uid';
import type { FormBuilderStackParamList } from '../../navigation/types';
import type { FormSchema } from '../../types/formBuilder';

type Props = NativeStackScreenProps<FormBuilderStackParamList, 'TemplatePicker'>;

function buildBlankTemplate(): FormSchema {
  return {
    id: uid(),
    name: 'Blank Form',
    status: 'draft',
    sections: [{ ...PERSONAL_INFO_SECTION, id: 'personal-info', fields: PERSONAL_INFO_SECTION.fields.map((f) => ({ ...f })) }]
  };
}

const BLANK_TEMPLATE = {
  key: 'blank',
  label: 'Blank Form',
  description: 'Start from scratch with personal info only',
  build: buildBlankTemplate
} as const;

const TEMPLATE_ICONS: Record<string, React.ReactElement> = {
  default: <ClipboardList size={18} color={colors.accent} />,
  consultation: <Stethoscope size={18} color={colors.accent} />,
  followup: <RefreshCw size={18} color={colors.accent} />,
  blank: <FilePlus size={18} color={colors.accent} />
};

export function TemplatePickerScreen({ navigation }: Props) {
  const { data: settings } = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });

  const existingSchema: FormSchema | undefined = settings?.formConfig?.schema
    ? { ...settings.formConfig.schema, status: 'published' as const }
    : undefined;
  const hasExisting = !!existingSchema;

  function goToCanvas(schema: FormSchema) {
    navigation.navigate('FormBuilderCanvas', { schema, hasExisting });
  }

  const allTemplates = [...STARTER_TEMPLATES, BLANK_TEMPLATE];

  return (
    <ScreenWrapper>
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={16} color={colors.accent} />
        </Pressable>
        <Text style={styles.navTitle}>Choose a Template</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Pick a starting point for your patient intake form</Text>

        {/* Continue editing */}
        {hasExisting && existingSchema && (
          <Card style={styles.continueCard}>
            <View style={styles.continueInfo}>
              <Text style={styles.continueTitle}>Continue editing</Text>
              <Text style={styles.continueDesc}>
                {existingSchema.name} · {existingSchema.sections.length} sections
              </Text>
            </View>
            <Button title="Resume" onPress={() => goToCanvas(existingSchema)} variant="secondary" />
          </Card>
        )}

        {/* Template grid — explicit rows so cards in each pair match height */}
        <View style={styles.grid}>
          {[allTemplates.slice(0, 2), allTemplates.slice(2)].map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              {row.map((template) => {
                const schema = template.build();
                return (
                  <View key={template.key} style={styles.templateCard}>
                    <View style={styles.iconWrap}>{TEMPLATE_ICONS[template.key] ?? <ClipboardList size={18} color={colors.accent} />}</View>
                    <Text style={styles.templateLabel}>{template.label}</Text>
                    <Text style={styles.templateDesc}>{template.description}</Text>
                    <View style={styles.sectionsBadge}>
                      <Layers size={11} color={colors.accent} />
                      <Text style={styles.sectionsBadgeText}>
                        {schema.sections.length} section{schema.sections.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Pressable style={({ pressed }) => [styles.useBtn, pressed && { opacity: 0.85 }]} onPress={() => goToCanvas(schema)}>
                      <Text style={styles.useBtnText}>Use template</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D1C1',
    alignItems: 'center',
    justifyContent: 'center'
  },
  navTitle: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 16,
    color: colors.text
  },
  navSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    gap: spacing.base
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: '#5E5954'
  },
  // Continue editing card
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  continueInfo: { flex: 1, gap: 2 },
  continueTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text
  },
  continueDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted
  },
  // Template grid
  grid: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  templateCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  templateLabel: {
    fontFamily: 'FunnelSans-Bold',
    fontWeight: '700',
    fontSize: 14,
    color: colors.text
  },
  templateDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#5E5954',
    lineHeight: 16
  },
  sectionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  sectionsBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent
  },
  useBtn: {
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center'
  },
  useBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontWeight: '700',
    fontSize: 12,
    color: '#F5F2E9'
  }
});
