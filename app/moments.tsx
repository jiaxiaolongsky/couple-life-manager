import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Plus, ArrowLeft, Trash2, Calendar as CalendarIcon, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { momentService } from '@/services/dataService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, Button, TextInput, IconButton, Avatar } from 'react-native-paper';
import { Moment } from '@/types';
import { useRouter } from 'expo-router';

export default function MomentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await momentService.getMoments();
    setMoments(list);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, ...result.assets.map(a => a.uri)]);
    }
  };

  const handleSave = async () => {
    if (!newContent && selectedImages.length === 0) return;
    
    const newMoment: Moment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      content: newContent,
      images: selectedImages,
    };
    
    await momentService.addMoment(newMoment);
    setNewContent('');
    setSelectedImages([]);
    setIsModalVisible(false);
    loadData();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>生活点滴</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {moments.map((item) => (
          <Card key={item.id} style={styles.momentCard}>
            <Card.Content>
              <View style={styles.momentHeader}>
                <Avatar.Text size={32} label="US" style={{ backgroundColor: theme.primary }} color="#fff" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.momentUser, { color: theme.text }]}>我们</Text>
                  <Text style={[styles.momentDate, { color: theme.icon }]}>{item.date}</Text>
                </View>
              </View>
              
              <Text style={[styles.momentContent, { color: theme.text }]}>{item.content}</Text>
              
              {item.images.length > 0 && (
                <View style={styles.imageGrid}>
                  {item.images.map((img, idx) => (
                    <Image key={idx} source={{ uri: img }} style={styles.momentImage} />
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        ))}

        {moments.length === 0 && (
          <View style={styles.emptyState}>
            <Camera size={64} color={theme.icon} />
            <Text style={{ color: theme.icon, marginTop: 15 }}>记录属于你们的每一个瞬间</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Plus color="#fff" size={32} />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>记录这一刻</Text>
              <IconButton icon="close" onPress={() => setIsModalVisible(false)} />
            </View>

            <TextInput
              placeholder="分享现在的想法..."
              value={newContent}
              onChangeText={setNewContent}
              multiline
              numberOfLines={6}
              mode="outlined"
              style={styles.textInput}
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
            />

            <ScrollView horizontal style={styles.selectedImagesRow}>
              {selectedImages.map((img, idx) => (
                <View key={idx} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: img }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    style={styles.removeImage} 
                    onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== idx))}
                  >
                    <Plus size={16} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[styles.addImageBtn, { borderColor: theme.border }]} onPress={handlePickImage}>
                <Plus size={32} color={theme.icon} />
              </TouchableOpacity>
            </ScrollView>

            <Button 
              mode="contained" 
              onPress={handleSave} 
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              disabled={!newContent && selectedImages.length === 0}
            >
              发布
            </Button>
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
  momentCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
  },
  momentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  momentUser: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  momentDate: {
    fontSize: 12,
  },
  momentContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  momentImage: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  textInput: {
    marginBottom: 20,
    fontSize: 16,
  },
  selectedImagesRow: {
    flexDirection: 'row',
    marginBottom: 20,
    maxHeight: 100,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  emptyState: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
});