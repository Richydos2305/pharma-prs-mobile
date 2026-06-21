import { forwardRef, useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { GripVertical, Lock, Pencil, Trash2 } from 'lucide-react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { BottomSheetWrapper, Button } from '../ui';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { SectionSchema, FieldSchema, SectionType } from '../../types/formBuilder';

export const SECTION_DETAIL_SNAP = ['65%'];

interface SectionDetailSheetProps {
  section: SectionSchema | null;
  onDeleteField: (fieldId: string) => void;
  onReorderFields: (fields: FieldSchema[]) => void;
  onAddField: () => void;
  onRenameSection: (name: string) => void;
  onChangeType: (type: SectionType) => void;
  onClose: () => void;
}

export const SectionDetailSheet = forwardRef<BottomSheetModal, SectionDetailSheetProps>(
  ({ section, onDeleteField, onReorderFields, onAddField, onRenameSection, onChangeType, onClose }, ref) => {
    const [localName, setLocalName] = useState(section?.name ?? '');

    // Sync local name when the active section changes
    useEffect(() => {
      setLocalName(section?.name ?? '');
    }, [section?.name]);

    if (!section) return null;

    function renderField({ item: field, drag, isActive }: RenderItemParams<FieldSchema>) {
      return (
        <TouchableOpacity onLongPress={drag} delayLongPress={200} activeOpacity={1} style={[styles.fieldRow, isActive && styles.fieldRowDragging]}>
          {/* Grip handle — same for all fields; locked only means non-deletable */}
          <GripVertical size={14} color={colors.border} />

          {/* Field info: label + type pill side by side */}
          <View style={styles.fieldInfo}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <View style={styles.fieldTypePill}>
              <Text style={styles.fieldTypeText}>
                {field.type
                  .split('_')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </Text>
            </View>
          </View>

          {/* Required dot — sits between field info and the action icon */}
          {field.required && <View style={styles.requiredDot} />}

          {/* Lock icon or delete button — same iconBtn wrapper keeps them pixel-aligned */}
          {field.locked ? (
            <View style={styles.iconBtn}>
              <Lock size={14} color={colors.textMuted} />
            </View>
          ) : (
            <TouchableOpacity onPress={() => onDeleteField(field.id)} style={styles.iconBtn}>
              <Trash2 size={14} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <BottomSheetWrapper ref={ref} snapPoints={SECTION_DETAIL_SNAP} onClose={onClose} enableContentPanningGesture={false}>
        <View style={styles.content}>
          {/* ── Header: editable name + type toggle ─────────────────────── */}
          <View style={styles.header}>
            <View style={styles.sectionNameInput}>
              <TextInput
                style={styles.sectionNameText}
                value={localName}
                onChangeText={setLocalName}
                onBlur={() => onRenameSection(localName)}
                returnKeyType="done"
                editable={!section.locked}
              />
              {!section.locked && <Pencil size={12} color={colors.textMuted} />}
            </View>

            <View style={[styles.typeToggle, section.locked && styles.typeToggleLocked]}>
              {(['standard', 'repeatable'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => !section.locked && onChangeType(t)}
                  style={[styles.typeTab, section.type === t && styles.typeTabActive]}
                >
                  <Text style={[styles.typeTabText, section.type === t && styles.typeTabTextActive]}>
                    {t === 'standard' ? 'Standard' : 'Repeatable'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Divider ──────────────────────────────────────────────────── */}
          <View style={styles.divider} />

          {/* ── Fields section header ─────────────────────────────────────── */}
          <View style={styles.fieldsHeader}>
            <Text style={styles.fieldsLabel}>Fields</Text>
            <Text style={styles.fieldCount}>
              {section.fields.length} {section.fields.length === 1 ? 'field' : 'fields'}
            </Text>
          </View>

          {/* ── Field list — draggable ────────────────────────────────────── */}
          <DraggableFlatList
            data={section.fields}
            keyExtractor={(item) => item.id}
            renderItem={renderField}
            onDragEnd={({ data }) => {
              // Defer state update one frame so Reanimated's drop animation
              // fully settles before React re-renders the list
              requestAnimationFrame(() => onReorderFields(data));
            }}
            scrollEnabled={false}
            contentContainerStyle={styles.fieldList}
            ListEmptyComponent={<Text style={styles.emptyFields}>No fields yet. Add your first field below.</Text>}
          />

          {/* ── Add Field ─────────────────────────────────────────────────── */}
          <Pressable onPress={onAddField} style={styles.addFieldBtn}>
            <Text style={styles.addFieldText}>+ Add Field</Text>
          </Pressable>

          {/* Spacer pushes Done to bottom of sheet */}
          <View style={styles.spacer} />

          {/* ── Done ──────────────────────────────────────────────────────── */}
          <View style={styles.doneContainer}>
            <Button title="Done" onPress={onClose} variant="primary" />
          </View>
        </View>
      </BottomSheetWrapper>
    );
  }
);

SectionDetailSheet.displayName = 'SectionDetailSheet';

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: spacing.sm
  },

  // ── Header ────────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm
  },
  sectionNameInput: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  sectionNameText: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    padding: 0
  },

  // ── Type toggle ───────────────────────────────────────────────────────────────
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.secondaryBg,
    borderRadius: 10,
    padding: 2,
    gap: 2
  },
  typeToggleLocked: {
    opacity: 0.5
  },
  typeTab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  typeTabActive: {
    backgroundColor: colors.text
  },
  typeTabText: {
    ...typography.caption,
    color: colors.textMuted
  },
  typeTabTextActive: {
    color: colors.secondaryBg
  },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.border
  },

  // ── Fields header ─────────────────────────────────────────────────────────────
  fieldsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  fieldsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text
  },
  fieldCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted
  },

  // ── Field list ────────────────────────────────────────────────────────────────
  fieldList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm
  },
  fieldRowDragging: {
    opacity: 0.9,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6
  },
  fieldInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel: { ...typography.label, color: colors.text },
  fieldTypePill: {
    backgroundColor: colors.accentPill,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  fieldTypeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.accent
  },
  requiredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error
  },
  iconBtn: { padding: spacing.xs },
  emptyFields: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },

  // ── Add field button ──────────────────────────────────────────────────────────
  addFieldBtn: {
    marginHorizontal: spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent
  },
  addFieldText: {
    ...typography.label,
    color: colors.accent
  },

  // ── Spacer + Done ─────────────────────────────────────────────────────────────
  spacer: { flex: 1 },
  doneContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl
  }
});
