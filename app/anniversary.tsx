import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Calendar as CalendarIcon, Plus, Trash2, ArrowLeft, Gift } from 'lucide-react-native';
import { anniversaryService } from '@/services/dataService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, Button, TextInput, IconButton, Chip } from 'react-native-paper';
import { Anniversary } from '@/types';
import { useRouter } from 'expo-router';
import { format, differenceInDays, parseISO, addYears, isBefore } from 'date-fns';

export default function AnniversaryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await anniversaryService.getAnniversaries();
    setAnniversaries(list.sort((a, b) => {
      const daysA = getDaysToNext(a.date);
      const daysB = getDaysToNext(b.date);
      return daysA - daysB;
    }));
  };

  const getDaysToNext = (dateStr: string) => {
    const today = new Date();
    const anniversaryDate = parseISO(dateStr);
    let nextDate = new Date(today.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());
    
    if (isBefore(nextDate, today) && format(nextDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
      nextDate = addYears(nextDate, 1);
    }
    
    return differenceInDays(nextDate, today);
  };

  const handleAdd = async () => {
    if (!newTitle) return;
    const newItem: Anniversary = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      date: newDate,
      type: 'other',
      remindDays: 3,
    };
    await anniversaryService.addAnniversary(newItem);
    setNewTitle('');
    setIsModalVisible(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    Alert.alert('确认删除', '确定要删除这个纪念日吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: async () => {
        await anniversaryService.deleteAnniversary(id);
        loadData();
      }, style: 'destructive' }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>纪念日</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {anniversaries.map((item) => {
          const daysTo = getDaysToNext(item.date);
          return (
            <Card key={item.id} style={styles.anniCard}>
              <Card.Content style={styles.anniContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.secondary }]}>
                  <Heart size={24} color={theme.primary} fill={theme.primary} />
                </View>
                <View style={styles.anniInfo}>
                  <Text style={[styles.anniTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.anniDate, { color: theme.icon }]}>{item.date}</Text>
                </View>
                <View style={styles.daysContainer}>
                  <Text style={[styles.daysLabel, { color: theme.icon }]}>{daysTo === 0 ? '今天' : '还有'}</Text>
                  {daysTo !== 0 && (
                    <Text style={[styles.daysValue, { color: theme.primary }]}>{daysTo}<Text style={styles.daysUnit}>天</Text></Text>
                  )}
                </View>
                <IconButton icon="trash-can-outline" iconColor={theme.error} size={20} onPress={() => handleDelete(item.id)} />
              </Card.Content>
            </Card>
          );
        })}

        {anniversaries.length === 0 && (
          <View style={styles.emptyState}>
            <Gift size={64} color={theme.icon} />
            <Text style={{ color: theme.icon, marginTop: 15 }}>记录属于你们的重要日子</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Plus color="#fff" size={32} />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>添加纪念日</Text>
            <TextInput
              label="名称 (如：在一起的第一天)"
              value={newTitle}
              onChangeText={setNewTitle}
              mode="outlined"
              style={styles.modalInput}
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
            />
            <TextInput
              label="日期 (YYYY-MM-DD)"
              value={newDate}
              onChangeText={setNewDate}
              mode="outlined"
              style={styles.modalInput}
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => setIsModalVisible(false)} textColor={theme.icon}>取消</Button>
              <Button mode="contained" onPress={handleAdd} style={{ backgroundColor: theme.primary }}>保存</Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  anniCard: {
    marginBottom: 15,
    borderRadius: 20,
    elevation: 2,
  },
  anniContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anniInfo: {
    flex: 1,
    marginLeft: 15,
  },
  anniTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  anniDate: {
    fontSize: 12,
    marginTop: 4,
  },
  daysContainer: {
    alignItems: 'flex-end',
    marginRight: 5,
  },
  daysLabel: {
    fontSize: 10,
  },
  daysValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  daysUnit: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  emptyState: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
});