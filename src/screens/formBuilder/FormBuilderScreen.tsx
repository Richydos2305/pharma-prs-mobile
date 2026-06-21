import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native-gesture-handler';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronUp, Eye, Info, Link, PenLine, Plus, Trash2, Upload } from 'lucide-react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Card } from '../../components/ui';
import { ScreenWrapper, FloatingTabBar } from '../../components/layout';
import { AddSectionSheet } from '../../components/formBuilder/AddSectionSheet';
import { AddFieldSheet } from '../../components/formBuilder/AddFieldSheet';
import { SectionDetailSheet } from '../../components/formBuilder/SectionDetailSheet';
import { PublishConfirmSheet } from '../../components/formBuilder/PublishConfirmSheet';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { FormSchema, SectionSchema, FieldSchema, FieldType } from '../../types/formBuilder';
import type { FormBuilderStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FormBuilderStackParamList, 'FormBuilderCanvas'>;

function defaultPlaceholder(type: FieldType, label: string): string {
  if (type === 'date') return 'Select date';
  if (type === 'dropdown') return `Select ${label.toLowerCase()}`;
  if (type === 'relation') return `Select ${label.toLowerCase()}`;
  return `Enter ${label.toLowerCase()}`;
}

function renderPreviewField(field: FieldSchema) {
  const label = <Text style={previewFieldStyles.label}>{field.label}</Text>;
  const placeholder = field.placeholder ?? defaultPlaceholder(field.type, field.label);

  if (field.type === 'file') {
    return (
      <View key={field.id} style={[previewFieldStyles.card, previewFieldStyles.fileCard]}>
        {label}
        <View style={previewFieldStyles.fileBody}>
          <Upload size={18} color={colors.textLight} />
          <Text style={previewFieldStyles.filePlaceholder}>Tap to upload file</Text>
        </View>
      </View>
    );
  }

  const rightIcon =
    field.type === 'dropdown' ? (
      <ChevronDown size={16} color={colors.textLight} />
    ) : field.type === 'date' ? (
      <CalendarDays size={16} color={colors.textLight} />
    ) : field.type === 'relation' ? (
      <Link size={16} color={colors.textLight} />
    ) : null;

  return (
    <View key={field.id} style={[previewFieldStyles.card, field.type === 'textarea' && previewFieldStyles.textareaCard]}>
      {label}
      <View style={previewFieldStyles.valueRow}>
        <Text style={previewFieldStyles.placeholder}>{placeholder}</Text>
        {rightIcon}
      </View>
    </View>
  );
}

// Shared styles object used by renderPreviewField (defined before StyleSheet.create)
const previewFieldStyles = {
  card: {
    backgroundColor: colors.inputFill,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4
  },
  textareaCard: { minHeight: 88 },
  fileCard: {
    borderStyle: 'dashed' as const,
    gap: 10
  },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted },
  valueRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  placeholder: { fontFamily: fonts.body, fontSize: 15, color: colors.textLight },
  fileBody: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 8 },
  filePlaceholder: { fontFamily: fonts.body, fontSize: 13, color: colors.textLight }
};

export function FormBuilderScreen({ route, navigation }: Props) {
  const { hasExisting } = route.params;
  const [schema, setSchema] = useState<FormSchema>(route.params.schema);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);

  const addSectionRef = useRef<BottomSheetModal>(null);
  const addFieldRef = useRef<BottomSheetModal>(null);
  const sectionDetailRef = useRef<BottomSheetModal>(null);
  const publishRef = useRef<BottomSheetModal>(null);

  // ── Schema mutations ────────────────────────────────────────────────────────

  function deleteSection(index: number) {
    setSchema({ ...schema, sections: schema.sections.filter((_, i) => i !== index) });
  }

  function reorderSections(from: number, to: number) {
    const sections = [...schema.sections];
    const [moved] = sections.splice(from, 1);
    sections.splice(to, 0, moved);
    setSchema({ ...schema, sections });
  }

  function addSection(section: SectionSchema) {
    setSchema({ ...schema, sections: [...schema.sections, section] });
  }

  function openSectionDetail(index: number) {
    setActiveSectionIndex(index);
    sectionDetailRef.current?.present();
  }

  function mutateActiveSection(fn: (s: SectionSchema) => SectionSchema) {
    if (activeSectionIndex === null) return;
    const sections = schema.sections.map((s, i) => (i === activeSectionIndex ? fn(s) : s));
    setSchema({ ...schema, sections });
  }

  function handleDeleteField(fieldId: string) {
    mutateActiveSection((s) => ({ ...s, fields: s.fields.filter((f) => f.id !== fieldId) }));
  }

  function handleReorderFields(fields: FieldSchema[]) {
    mutateActiveSection((s) => ({ ...s, fields }));
  }

  function handleAddField(field: FieldSchema) {
    mutateActiveSection((s) => ({ ...s, fields: [...s.fields, field] }));
  }

  function handleRenameSection(name: string) {
    mutateActiveSection((s) => ({ ...s, name: name.trim() || s.name }));
  }

  function handleChangeType(type: SectionSchema['type']) {
    mutateActiveSection((s) => ({ ...s, type }));
  }

  function openAddField() {
    sectionDetailRef.current?.dismiss();
    setTimeout(() => addFieldRef.current?.present(), 350);
  }

  function handleTabPress(routeName: string) {
    if (routeName === 'PlusTab') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation.getParent() as any)?.navigate('Tabs', {
        screen: 'Patients',
        params: { screen: 'PatientNew' }
      });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation.getParent() as any)?.navigate('Tabs', { screen: routeName });
  }

  // ── Section row ─────────────────────────────────────────────────────────────

  function renderSection({ item: section, getIndex, drag, isActive }: RenderItemParams<SectionSchema>) {
    const index = getIndex() ?? 0;
    const typeLabel = section.type === 'repeatable' ? 'Repeatable' : 'Standard';
    const isRepeatable = section.type === 'repeatable';
    const prevSection = schema.sections[index - 1];
    const nextSection = schema.sections[index + 1];
    const canMoveUp = index > 0 && !section.locked && !prevSection?.locked;
    const canMoveDown = index < schema.sections.length - 1 && !section.locked && !nextSection?.locked;

    return (
      <TouchableOpacity onPress={() => openSectionDetail(index)} onLongPress={drag} delayLongPress={200} activeOpacity={0.85}>
        <Card style={[styles.sectionCard, isActive && styles.sectionCardDragging]}>
          <View style={styles.sectionRow}>
            {/* Info */}
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionName}>{section.name}</Text>
              <View style={styles.sectionMeta}>
                <View style={[styles.typePill, isRepeatable ? styles.typePillRepeatable : styles.typePillStandard]}>
                  <Text style={[styles.typePillText, isRepeatable ? styles.typePillTextRepeatable : styles.typePillTextStandard]}>{typeLabel}</Text>
                </View>
                <Text style={styles.fieldCountText}>
                  {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Reorder + delete actions */}
            <View style={styles.sectionActions}>
              <TouchableOpacity
                testID={`move-up-${index}`}
                onPress={() => canMoveUp && reorderSections(index, index - 1)}
                disabled={!canMoveUp}
                style={styles.actionBtn}
              >
                <ChevronUp size={16} color={canMoveUp ? colors.text : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                testID={`move-down-${index}`}
                onPress={() => canMoveDown && reorderSections(index, index + 1)}
                disabled={!canMoveDown}
                style={styles.actionBtn}
              >
                <ChevronDown size={16} color={canMoveDown ? colors.text : colors.textMuted} />
              </TouchableOpacity>
              {!section.locked && (
                <TouchableOpacity onPress={() => deleteSection(index)} style={styles.actionBtn}>
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // ── Preview mode ─────────────────────────────────────────────────────────────

  if (previewMode) {
    return (
      <ScreenWrapper>
        <View style={styles.navBar}>
          <Pressable onPress={() => setPreviewMode(false)} style={styles.previewNavBack}>
            <View style={styles.navBack}>
              <ChevronLeft size={16} color={colors.accent} />
            </View>
            <Text style={styles.previewBackLabel}>Preview</Text>
          </Pressable>
          <View style={styles.navTitleRow} pointerEvents="none">
            <Text style={styles.navTitle}>Form Preview</Text>
          </View>
          <Pressable onPress={() => publishRef.current?.present()} style={styles.publishPillBtn}>
            <Text style={styles.publishPillText}>Publish</Text>
          </Pressable>
        </View>

        <View style={styles.previewBanner}>
          <View style={styles.previewBannerRow}>
            <Info size={14} color={colors.warningText} />
            <Text style={styles.previewBannerText}>Preview mode — changes won&apos;t be saved</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.previewContent} showsVerticalScrollIndicator={false}>
          {schema.sections.map((section) => (
            <View key={section.id} style={styles.previewSection}>
              <View style={styles.previewSectionHeader}>
                <Text style={styles.previewSectionTitle}>{section.name}</Text>
                <View style={styles.previewSectionDivider} />
              </View>
              {section.fields.map((field) => renderPreviewField(field))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.previewFooter}>
          <Pressable onPress={() => setPreviewMode(false)} style={styles.backToEditorBtn}>
            <Text style={styles.backToEditorText}>Back to Editor</Text>
          </Pressable>
        </View>

        <PublishConfirmSheet
          ref={publishRef}
          schema={schema}
          hasExisting={hasExisting}
          onPublished={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigation.getParent() as any)?.navigate('Tabs');
          }}
          onClose={() => publishRef.current?.dismiss()}
        />
      </ScreenWrapper>
    );
  }

  // ── Canvas mode ───────────────────────────────────────────────────────────────

  const totalSections = schema.sections.length;
  const activeSection = activeSectionIndex !== null ? schema.sections[activeSectionIndex] : null;
  const isPublished = schema.status === 'published';

  return (
    <ScreenWrapper>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBack}>
          <ChevronLeft size={16} color={colors.accent} />
        </Pressable>

        {/* Title + edit icon */}
        <View style={styles.navTitleRow}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {schema.name}
          </Text>
          <PenLine size={14} color={colors.accent} />
          {/* TODO: rename flow */}
        </View>

        {/* Status pill + square preview button */}
        <View style={styles.navRight}>
          <View style={[styles.statusPill, isPublished ? styles.statusPillPublished : styles.statusPillDraft]}>
            <Text style={[styles.statusPillText, isPublished ? styles.statusPillTextPublished : styles.statusPillTextDraft]}>
              {isPublished ? 'Published' : 'Draft'}
            </Text>
          </View>
          <Pressable onPress={() => setPreviewMode(true)} style={styles.previewSquareBtn}>
            <Eye size={16} color={colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* Section list — draggable */}
      <DraggableFlatList
        data={schema.sections}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        onDragEnd={({ from, to }) => reorderSections(from, to)}
        contentContainerStyle={styles.list}
        containerStyle={styles.listFlex}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptySections}>No sections yet. Add your first section below.</Text>}
      />

      {/* Footer — actions row */}
      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {totalSections} section{totalSections !== 1 ? 's' : ''} · {isPublished ? 'Published' : 'Draft'}
        </Text>
        <View style={styles.footerActions}>
          <Pressable onPress={() => addSectionRef.current?.present()} style={styles.addSectionBtn}>
            <Plus size={16} color={colors.text} />
            <Text style={styles.addSectionText}>Add Section</Text>
          </Pressable>
          <Pressable onPress={() => setPreviewMode(true)} style={styles.previewBtn}>
            <Text style={styles.previewBtnText}>Preview</Text>
          </Pressable>
        </View>
      </View>

      {/* Floating tab bar */}
      <View style={styles.tabBarContainer}>
        <FloatingTabBar onTabPress={handleTabPress} />
      </View>

      {/* Sheets */}
      <AddSectionSheet
        ref={addSectionRef}
        existingIds={schema.sections.map((s) => s.id)}
        onAdd={addSection}
        onClose={() => addSectionRef.current?.dismiss()}
      />

      <SectionDetailSheet
        ref={sectionDetailRef}
        section={activeSection}
        onDeleteField={handleDeleteField}
        onReorderFields={handleReorderFields}
        onAddField={openAddField}
        onRenameSection={handleRenameSection}
        onChangeType={handleChangeType}
        onClose={() => sectionDetailRef.current?.dismiss()}
      />

      <AddFieldSheet
        ref={addFieldRef}
        existingIds={schema.sections.flatMap((s) => s.fields.map((f) => f.id))}
        onAdd={handleAddField}
        onClose={() => addFieldRef.current?.dismiss()}
      />

      <PublishConfirmSheet
        ref={publishRef}
        schema={schema}
        hasExisting={hasExisting}
        onPublished={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (navigation.getParent() as any)?.navigate('Tabs');
        }}
        onClose={() => publishRef.current?.dismiss()}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ── Nav bar ──────────────────────────────────────────────────────────────────
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: spacing.sm
  },
  navBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryBg,
    borderWidth: 1,
    borderColor: colors.backButtonBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navTitleRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    pointerEvents: 'none'
  },
  navTitle: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontSize: 15,
    color: colors.text
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  // Status pill (Draft / Published)
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusPillDraft: { backgroundColor: colors.secondaryBg },
  statusPillPublished: { backgroundColor: colors.successBg },
  statusPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    fontWeight: '600'
  },
  statusPillTextDraft: { color: colors.textSecondary },
  statusPillTextPublished: { color: colors.successText },
  // Square preview button (top-right)
  previewSquareBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewNavBack: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBackLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textSecondary },
  publishPillBtn: {
    backgroundColor: colors.text,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 14,
    justifyContent: 'center' as const
  },
  publishPillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.background },
  previewBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // ── Section list ─────────────────────────────────────────────────────────────
  listFlex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  emptySections: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing['2xl']
  },
  // Section card
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    gap: 0
  },
  sectionCardDragging: {
    opacity: 0.9,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionInfo: { flex: 1, gap: 4 },
  sectionName: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  sectionMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Type pills (Standard / Repeatable)
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  typePillStandard: { backgroundColor: colors.accentPill },
  typePillRepeatable: { backgroundColor: colors.successBg },
  typePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    fontWeight: '600'
  },
  typePillTextStandard: { color: colors.accent },
  typePillTextRepeatable: { color: colors.successText },
  fieldCountText: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight
  },
  actionBtn: { padding: spacing.xs },
  sectionActions: { flexDirection: 'row', alignItems: 'center' },

  // ── Footer (actions row) ──────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    gap: 6
  },
  footerMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textLight
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  addSectionBtn: {
    width: 148,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  addSectionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text
  },
  previewBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.background
  },

  // ── Tab bar container ─────────────────────────────────────────────────────────
  tabBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12
  },

  // ── Preview mode ─────────────────────────────────────────────────────────────
  previewBanner: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  previewBannerText: { ...typography.caption, color: colors.warningText },
  previewContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    gap: 16
  },
  previewSection: { gap: 10 },
  previewSectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.text },
  previewSectionHeader: { gap: 8 },
  previewSectionDivider: { height: 1, backgroundColor: colors.border },
  previewFooter: {
    paddingHorizontal: spacing.base,
    paddingTop: 12,
    paddingBottom: 28
  },
  backToEditorBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.text
  },
  backToEditorText: { ...typography.button, color: colors.background }
});
