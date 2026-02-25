import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { ChevronDown, Plus, Check, Pencil, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { AppColors } from '@/constants/appColors';
import { useAppTheme } from './AppThemeProvider';
import { useSeasonPass } from '@/providers/SeasonPassProvider';
import { getTeamTheme } from '@/constants/teamThemes';

export default function SeasonPassSelector() {
  const insets = typeof useSafeAreaInsets === 'function' ? useSafeAreaInsets() : { bottom: 0 };
  const { theme, setTheme } = useAppTheme();
  const router = useRouter();
  const { seasonPasses, activeSeasonPass, switchSeasonPass, deleteSeasonPass } = useSeasonPass();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);

  const handleSelect = useCallback((passId: string) => {
    setSelectedPassId(passId);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedPassId) return;
    await switchSeasonPass(selectedPassId);
    const selectedPass = seasonPasses.find(p => p.id === selectedPassId);
    if (selectedPass) {
      const teamTheme = getTeamTheme(selectedPass.teamId);
      setTheme(teamTheme);
    }
    setIsOpen(false);
    setSelectedPassId(null);
  }, [selectedPassId, switchSeasonPass, seasonPasses, setTheme]);

  const handleAddNew = useCallback(() => {
    setIsOpen(false);
    setSelectedPassId(null);
    router.push('/setup' as any);
  }, [router]);

  const handleEdit = useCallback((passId: string) => {
    setIsOpen(false);
    setSelectedPassId(null);
    router.push({ pathname: '/edit-pass' as any, params: { passId } });
  }, [router]);

  const handleDelete = useCallback(async () => {
    if (!selectedPassId) return;
    const remaining = await deleteSeasonPass(selectedPassId);
    // close modal regardless; provider deleted or user cancelled
    setIsOpen(false);
    setSelectedPassId(null);
    if (remaining !== null) {
      // if the pass was active, switch to first available
      if (activeSeasonPass && activeSeasonPass.id === selectedPassId && seasonPasses.length > 1) {
        const next = seasonPasses.find(p => p.id !== selectedPassId);
        if (next) {
          await switchSeasonPass(next.id);
          const teamTheme = getTeamTheme(next.teamId);
          setTheme(teamTheme);
        }
      }
    }
  }, [selectedPassId, deleteSeasonPass, activeSeasonPass, seasonPasses, switchSeasonPass, setTheme]);

  if (!activeSeasonPass) return null;

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setIsOpen(true)} activeOpacity={0.8}>
        {activeSeasonPass.teamLogoUrl ? (
          <Image source={{ uri: activeSeasonPass.teamLogoUrl }} style={styles.teamLogo} contentFit="contain" />
        ) : (
          <View style={[styles.teamLogo, styles.logoPlaceholder]} />
        )}
        <View style={styles.selectorInfo}>
          <Text style={styles.teamName} numberOfLines={1}>{activeSeasonPass.teamName}</Text>
          <Text style={styles.seasonLabel}>{activeSeasonPass.seasonLabel}</Text>
        </View>
        <ChevronDown size={20} color={AppColors.white} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.overlay} onPress={(e: any) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
          <View style={[styles.modalContent, { minHeight: 300 }]}> 
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsOpen(false)}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Season Passes</Text>

            <View style={styles.horizontalListContainer}>
              <FlatList
                data={seasonPasses}
                keyExtractor={pass => pass.id}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' }}
                style={{ marginBottom: 8 }}
                snapToAlignment="center"
                decelerationRate="fast"
                snapToInterval={140}
                renderItem={({ item: pass }) => {
                  const passTheme = getTeamTheme(pass.teamId);
                  const isSelected = pass.id === selectedPassId;
                  return (
                    <View style={[styles.passItemHorizontal, isSelected && { backgroundColor: passTheme.primary, borderWidth: 2, borderColor: AppColors.accent }]}> 
                      <TouchableOpacity
                        style={styles.passSelectAreaHorizontal}
                        onPress={() => handleSelect(pass.id)}
                        activeOpacity={0.8}
                      >
                        {pass.teamLogoUrl ? (
                          <Image source={{ uri: pass.teamLogoUrl }} style={styles.passLogoHorizontal} contentFit="contain" />
                        ) : (
                          <View style={[styles.passLogoHorizontal, styles.logoPlaceholder]} />
                        )}
                        <View style={styles.passInfoHorizontal}>
                          <Text style={[styles.passTeamNameHorizontal, isSelected && { color: passTheme.textOnPrimary }]} numberOfLines={1} ellipsizeMode="tail">{pass.teamAbbreviation || pass.teamName}</Text>
                          <Text style={[styles.passSeasonHorizontal, isSelected && { color: passTheme.textOnPrimary, opacity: 0.8 }]} numberOfLines={1} ellipsizeMode="tail">{pass.seasonLabel}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.checkIconHorizontal}>
                            <Check size={16} color={AppColors.white} />
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editButtonHorizontal, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                        onPress={() => handleEdit(pass.id)}
                        activeOpacity={0.7}
                      >
                        <Pencil size={14} color={isSelected ? passTheme.textOnPrimary : AppColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
              <Plus size={20} color={AppColors.white} />
              <Text style={styles.addButtonText}>Add Season Pass</Text>
            </TouchableOpacity>

            {selectedPassId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={AppColors.white} />
                <Text style={styles.deleteButtonText}>Delete Pass</Text>
              </TouchableOpacity>
            )}

            {selectedPassId && (
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  horizontalListContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    marginBottom: 8,
  },
  confirmButton: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'center',
  },
  confirmButtonText: {
    color: AppColors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: AppColors.error || '#D32F2F',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: AppColors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  teamLogo: {
    width: 32,
    height: 32,
  },
  logoPlaceholder: {
    backgroundColor: AppColors.gray,
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  selectorInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.white,
  },
  seasonLabel: {
    fontSize: 12,
    color: AppColors.gold,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  passItemHorizontal: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: AppColors.gray,
    overflow: 'hidden',
    minWidth: 100,
    maxWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 8,
    height: 110,
    justifyContent: 'center',
  },
  passSelectAreaHorizontal: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    width: 100,
    height: 70,
  },
  passLogoHorizontal: {
    width: 40,
    height: 40,
    marginBottom: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: AppColors.textPrimary,
    fontWeight: '700',
    lineHeight: 28,
  },
  passInfoHorizontal: {
    alignItems: 'center',
    width: 90,
  },
  passTeamNameHorizontal: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
    maxWidth: 90,
  },
  passSeasonHorizontal: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: '500',
    maxWidth: 90,
  },
  checkIconHorizontal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppColors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  editButtonHorizontal: {
    width: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accent,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.white,
  },
});
