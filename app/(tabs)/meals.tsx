import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dishCategoryService, dishService, mealPlanService } from '@/services/dataService';
import { Dish, DishCategory, MealPlan } from '@/types';
import { addDays, format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Coffee, Cookie, Edit2, GripVertical, Heart, Image as ImageIcon, Moon, Plus, Sun, Trash2, Upload, Utensils } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import 'react-native-gesture-handler';
import { ActivityIndicator, Button, Card, Chip, FAB, IconButton, Searchbar, SegmentedButtons, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MealsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [activeTab, setActiveTab] = useState('plan'); // 'library' or 'plan'
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Planning states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [isDishPickerVisible, setIsDishPickerVisible] = useState(false);
    const [pickerCategoryId, setPickerCategoryId] = useState<string>('all');
    const [activeMealSlot, setActiveMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks' | null>(null);

  // Modals
  const [isDishModalVisible, setIsDishModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  
  // Edit states
  const [editingDish, setEditingDish] = useState<Partial<Dish> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<DishCategory> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'plan') {
      loadMealPlan();
    }
  }, [activeTab, selectedDate]);

  const loadData = async () => {
    try {
      const [allCats, allDishes] = await Promise.all([
        dishCategoryService.getCategories(),
        dishService.getDishes()
      ]);
      
      if (allCats.length === 0) {
        // 初始默认分类
        const defaultCats: DishCategory[] = [
          { id: '1', name: '招牌菜', order: 1 },
          { id: '2', name: '主食', order: 2 },
          { id: '3', name: '汤品', order: 3 },
          { id: '4', name: '甜点', order: 4 },
        ];
        // 尝试保存默认分类到数据库，但不阻塞 UI
        try {
          for (const cat of defaultCats) {
            await dishCategoryService.addCategory(cat);
          }
        } catch (e) {
          console.warn('保存默认分类到数据库失败，可能由于连接问题');
        }
        setCategories(defaultCats);
      } else {
        setCategories(allCats.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
      setDishes(allDishes);
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('加载失败', '请检查 Supabase 连接设置');
    }
  };

  const loadMealPlan = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const plan = await mealPlanService.getMealPlanByDate(dateStr);
    setCurrentPlan(plan);
  };

  const handleSaveMealPlan = async (updatedPlan: MealPlan) => {
    try {
      await mealPlanService.upsertMealPlan(updatedPlan);
      setCurrentPlan(updatedPlan);
    } catch (error) {
      console.error('保存计划失败:', error);
      Alert.alert('错误', '保存计划失败，请重试');
    }
  };

  const addDishToPlan = (dish: Dish) => {
    if (!activeMealSlot) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newPlan: MealPlan = currentPlan || {
      id: Math.random().toString(36).substr(2, 9),
      date: dateStr,
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    };

    const slotDishes = [...(newPlan[activeMealSlot] || [])];
    if (!slotDishes.find(d => d.id === dish.id)) {
      slotDishes.push(dish);
    }
    
    const updatedPlan = {
      ...newPlan,
      [activeMealSlot]: slotDishes
    };

    handleSaveMealPlan(updatedPlan);
    setIsDishPickerVisible(false);
  };

  const removeDishFromPlan = (slot: 'breakfast' | 'lunch' | 'dinner' | 'snacks', dishId: string) => {
    if (!currentPlan) return;
    
    const updatedPlan = {
      ...currentPlan,
      [slot]: (currentPlan[slot] || []).filter(d => d.id !== dishId)
    };
    
    handleSaveMealPlan(updatedPlan);
  };

  const filteredDishes = useMemo(() => {
    let result = dishes;
    if (activeCategoryId !== 'all') {
      result = result.filter(d => d.categoryId === activeCategoryId);
    }
    if (searchQuery) {
      result = result.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [dishes, activeCategoryId, searchQuery]);

  const handleSaveDish = async () => {
    if (!editingDish?.name || !editingDish?.categoryId) {
      Alert.alert('提示', '请填写菜品名称并选择分类');
      return;
    }
    
    try {
      if (editingDish.id) {
        await dishService.updateDish(editingDish.id, editingDish);
      } else {
        await dishService.addDish(editingDish as Dish);
      }
      setIsDishModalVisible(false);
      setEditingDish(null);
      loadData();
    } catch (error: any) {
      console.error('保存菜品失败:', error);
      Alert.alert('保存失败', `请检查网络连接: ${error.message || '未知错误'}`);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setIsUploading(true);
        const imageUrl = await dishService.uploadDishImage(result.assets[0].uri);
        setEditingDish(prev => prev ? { ...prev, image: imageUrl } : null);
      } catch (error: any) {
        console.error('上传图片失败:', error);
        Alert.alert('上传失败', '无法上传图片，请检查网络或 Supabase 存储配置');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory?.name) return;
    
    try {
      if (editingCategory.id) {
        await dishCategoryService.updateCategory(editingCategory.id, { name: editingCategory.name });
      } else {
        const newOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order || 0)) + 1 : 1;
        await dishCategoryService.addCategory({ 
          name: editingCategory.name, 
          order: newOrder 
        } as Omit<DishCategory, 'id'>);
      }
      setIsCategoryModalVisible(false);
      loadData();
    } catch (error: any) {
      console.error('保存分类失败:', error);
      Alert.alert('保存失败', `请检查网络连接: ${error.message || '未知错误'}`);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    // 交换位置
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    // 更新 order 字段
    const updatedCategories = newCategories.map((cat, idx) => ({
      ...cat,
      order: idx + 1
    }));
    
    setCategories(updatedCategories);
    
    try {
      await dishCategoryService.saveCategories(updatedCategories);
    } catch (error: any) {
      console.error('保存分类排序失败:', error);
      Alert.alert('排序保存失败', `请检查网络连接: ${error.message || '未知错误'}`);
    }
  };

  const renderCategoryItem = ({ item: cat, drag, isActive, getIndex }: RenderItemParams<DishCategory>) => {
    const index = getIndex();
    const isSelected = activeCategoryId === cat.id;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={isManageMode ? drag : undefined}
          onPress={() => setActiveCategoryId(cat.id)}
          disabled={isActive}
          activeOpacity={0.7}
          style={[
            styles.categoryTab,
            isSelected && styles.activeCategoryTab,
            isActive && { backgroundColor: theme.primary + '10' }
          ]}
        >
          {isSelected && (
            <View style={[styles.activeCategoryIndicator, { backgroundColor: theme.primary }]} />
          )}
          <View style={styles.categoryMainRow}>
            {isManageMode && (
              <View style={styles.dragHandle}>
                <GripVertical size={14} color={theme.icon} />
              </View>
            )}
            <Text 
              numberOfLines={1}
              style={[
                styles.categoryText,
                isSelected && styles.activeCategoryText
              ]}
            >
              {cat.name}
            </Text>
          </View>
          
          {isManageMode && isSelected && (
            <View style={styles.catManagePanel}>
              <View style={styles.manageRow}>
                <TouchableOpacity 
                  disabled={index === 0}
                  onPress={() => handleMoveCategory(index!, 'up')}
                  style={[styles.miniActionBtn, index === 0 && styles.disabledBtn]}
                >
                  <ChevronUp size={14} color={index === 0 ? theme.icon + '40' : theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  disabled={index === categories.length - 1}
                  onPress={() => handleMoveCategory(index!, 'down')}
                  style={[styles.miniActionBtn, index === categories.length - 1 && styles.disabledBtn]}
                >
                  <ChevronDown size={14} color={index === categories.length - 1 ? theme.icon + '40' : theme.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.manageRow}>
                <TouchableOpacity 
                  style={styles.miniActionBtn}
                  onPress={() => {
                    setEditingCategory(cat);
                    setIsCategoryModalVisible(true);
                  }}
                >
                  <Edit2 size={12} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.miniActionBtn, { backgroundColor: '#FFF5F5' }]}
                  onPress={() => {
                    Alert.alert(
                      '删除分类',
                      `确定要删除 "${cat.name}" 吗？`,
                      [
                        { text: '取消', style: 'cancel' },
                        { 
                          text: '删除', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await dishCategoryService.deleteCategory(cat.id);
                              if (activeCategoryId === cat.id) setActiveCategoryId('all');
                              loadData();
                            } catch (error: any) {
                              console.error('删除分类失败:', error);
                              Alert.alert('删除失败', `请检查网络连接: ${error.message || '未知错误'}`);
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Trash2 size={12} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  const renderDishItem = ({ item }: { item: Dish }) => (
    <Card style={[styles.dishCard, { backgroundColor: theme.card }]} mode="elevated">
      <View style={styles.dishCardInner}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.dishThumbnail} />
        ) : (
          <View style={[styles.dishThumbnailPlaceholder, { backgroundColor: theme.primary + '10' }]}>
            <Utensils size={24} color={theme.primary} opacity={0.3} />
          </View>
        )}
        <View style={styles.dishContent}>
          <View style={styles.dishInfo}>
            <Text style={[styles.dishName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.dishCategory, { color: theme.icon }]}>
              {categories.find(c => c.id === item.categoryId)?.name}
            </Text>
            <View style={styles.dishTags}>
              <View style={[styles.tag, { backgroundColor: '#FFF5F5' }]}>
                <Text style={styles.tagText}>好评如潮</Text>
              </View>
              <Text style={styles.salesText}>月售 100+</Text>
            </View>
          </View>
          <View style={styles.dishActions}>
            <TouchableOpacity 
              onPress={async () => {
                try {
                  await dishService.updateDish(item.id, { favorite: !item.favorite });
                  loadData();
                } catch (error: any) {
                  console.error('收藏更新失败:', error);
                  Alert.alert('更新失败', `请检查网络连接: ${error.message || '未知错误'}`);
                }
              }}
              style={styles.actionBtn}
            >
              <Heart size={20} color={item.favorite ? '#FF5252' : theme.icon} fill={item.favorite ? '#FF5252' : 'none'} />
            </TouchableOpacity>
            {isManageMode && (
              <>
                <TouchableOpacity 
                  onPress={() => {
                    setEditingDish(item);
                    setIsDishModalVisible(true);
                  }}
                  style={styles.actionBtn}
                >
                  <Edit2 size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert(
                      '删除菜品',
                      `确定要删除 "${item.name}" 吗？`,
                      [
                        { text: '取消', style: 'cancel' },
                        { 
                          text: '删除', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await dishService.deleteDish(item.id);
                              loadData();
                            } catch (error: any) {
                              console.error('删除菜品失败:', error);
                              Alert.alert('删除失败', `请检查网络连接: ${error.message || '未知错误'}`);
                            }
                          }
                        }
                      ]
                    );
                  }}
                  style={styles.actionBtn}
                >
                  <Trash2 size={20} color="#FF5252" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Card>
  );

  const openDishPicker = (slot: 'breakfast' | 'lunch' | 'dinner' | 'snacks') => {
    setActiveMealSlot(slot);
    setSearchQuery('');
    setPickerCategoryId('all');
    setIsDishPickerVisible(true);
  };

  const renderMealSlot = (slot: 'breakfast' | 'lunch' | 'dinner' | 'snacks', title: string, icon: React.ReactNode) => {
    const slotDishes = currentPlan ? currentPlan[slot] || [] : [];
    
    return (
      <View style={styles.planSlot}>
        <View style={styles.slotHeader}>
          <View style={styles.slotTitleRow}>
            {icon}
            <Text style={[styles.slotTitle, { color: theme.text }]}>{title}</Text>
          </View>
          <IconButton 
            icon="plus" 
            size={20} 
            mode="contained-tonal"
            onPress={() => openDishPicker(slot)}
          />
        </View>
        
        <View style={styles.slotDishes}>
          {slotDishes.length > 0 ? (
            slotDishes.map(dish => (
              <View key={dish.id} style={styles.planDishItem}>
                <Text style={[styles.planDishName, { color: theme.text }]}>{dish.name}</Text>
                <TouchableOpacity onPress={() => removeDishFromPlan(slot, dish.id)}>
                  <Trash2 size={16} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptySlot}>
              <Text style={styles.emptySlotText}>尚未安排菜品</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.tabHeader}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'plan', label: '餐饮计划', icon: 'calendar-clock' },
            { value: 'library', label: '菜品管理', icon: 'book-open-variant' },
          ]}
          style={styles.segmentedButtons}
          theme={{ colors: { secondaryContainer: theme.primary + '20', onSecondaryContainer: theme.primary } }}
        />
      </View>

      {activeTab === 'library' ? (
        <>
          <View style={styles.header}>
            <Searchbar
              placeholder="搜索菜品..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchBar, { backgroundColor: theme.card }]}
              inputStyle={{ color: theme.text }}
              iconColor={theme.icon}
              placeholderTextColor={theme.icon}
            />
            <IconButton
              icon={isManageMode ? "check" : "pencil"}
              mode="contained"
              containerColor={isManageMode ? theme.primary : theme.card}
              iconColor={isManageMode ? "#fff" : theme.primary}
              onPress={() => setIsManageMode(!isManageMode)}
            />
          </View>
          {isManageMode ? (
            <View style={[styles.manageModeHint, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.manageModeHintText, { color: theme.primary }]}>编辑模式已开启，您可以添加、编辑或删除菜品和分类</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.manageModeHint, { backgroundColor: theme.primary + '10', borderWidth: 1, borderColor: theme.primary + '30', borderStyle: 'dashed' }]}
              onPress={() => setIsManageMode(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Edit2 size={16} color={theme.primary} />
                <Text style={[styles.manageModeHintText, { color: theme.primary, flex: 1 }]}>点击右上角 ✏️ 图标开启编辑模式</Text>
                <ChevronRight size={16} color={theme.primary} />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.content}>
            {/* Left Categories */}
            <View style={[styles.leftColumn, { borderRightColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.categoryTab,
                  activeCategoryId === 'all' && styles.activeCategoryTab
                ]}
                onPress={() => setActiveCategoryId('all')}
                activeOpacity={0.7}
              >
                {activeCategoryId === 'all' && (
                  <View style={[styles.activeCategoryIndicator, { backgroundColor: theme.primary }]} />
                )}
                <Text style={[
                  styles.categoryText,
                  activeCategoryId === 'all' && styles.activeCategoryText
                ]}>全部</Text>
              </TouchableOpacity>
              
              <DraggableFlatList
                data={categories}
                onDragEnd={({ data }) => {
                  const updatedCategories = data.map((cat, idx) => ({ ...cat, order: idx + 1 }));
                  setCategories(updatedCategories);
                  dishCategoryService.saveCategories(updatedCategories);
                }}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
              />
              
              {isManageMode && (
                <TouchableOpacity 
                  style={styles.addCategoryBtn}
                  onPress={() => {
                    setEditingCategory({ name: '' });
                    setIsCategoryModalVisible(true);
                  }}
                >
                  <Plus size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Right Dishes List */}
            <View style={styles.rightColumn}>
              <FlatList
                data={filteredDishes}
                renderItem={renderDishItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.dishList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Utensils size={48} color={theme.icon} />
                    <Text style={{ color: theme.icon, marginTop: 12 }}>还没有菜品哦</Text>
                  </View>
                }
              />
            </View>
          </View>

          {isManageMode && (
            <FAB
              icon="plus"
              style={[styles.fab, { backgroundColor: theme.primary }]}
              color="#fff"
              onPress={() => {
                setEditingDish({ name: '', categoryId: activeCategoryId === 'all' ? categories[0]?.id : activeCategoryId, favorite: false });
                setIsDishModalVisible(true);
              }}
            />
          )}
        </>
      ) : (
        <View style={styles.planningContent}>
          <View style={styles.dateNav}>
            <IconButton 
              icon={({ size, color }) => <ChevronLeft size={size} color={color} />} 
              onPress={() => setSelectedDate(subDays(selectedDate, 1))} 
            />
            <TouchableOpacity 
              style={styles.dateInfo} 
              onPress={() => setSelectedDate(new Date())}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={theme.primary} />
              <Text style={[styles.dateText, { color: theme.text }]}>
                {format(selectedDate, 'MM月dd日 EEE', { locale: zhCN })}
              </Text>
            </TouchableOpacity>
            <IconButton 
              icon={({ size, color }) => <ChevronRight size={size} color={color} />} 
              onPress={() => setSelectedDate(addDays(selectedDate, 1))} 
            />
          </View>

          <ScrollView style={styles.planScroll} showsVerticalScrollIndicator={false}>
            {renderMealSlot('breakfast', '早餐', <Coffee size={24} color="#FF9F43" />)}
            {renderMealSlot('lunch', '午餐', <Sun size={24} color="#FF6B6B" />)}
            {renderMealSlot('dinner', '晚餐', <Moon size={24} color="#576574" />)}
            {renderMealSlot('snacks', '加餐/零食', <Cookie size={24} color="#A5673F" />)}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* Dish Picker Modal */}
      <Modal visible={isDishPickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '80%' }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>选择菜品</Text>
              <IconButton icon="close" onPress={() => setIsDishPickerVisible(false)} />
            </View>
            
            <Searchbar
              placeholder="搜索..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.pickerSearch}
            />

            <View style={styles.pickerCategoryList}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Chip 
                  selected={pickerCategoryId === 'all'} 
                  onPress={() => setPickerCategoryId('all')}
                  style={styles.pickerChip}
                >全部</Chip>
                {categories.map(cat => (
                  <Chip 
                    key={cat.id} 
                    selected={pickerCategoryId === cat.id} 
                    onPress={() => setPickerCategoryId(cat.id)}
                    style={styles.pickerChip}
                  >{cat.name}</Chip>
                ))}
              </ScrollView>
            </View>
            
            <ScrollView style={styles.pickerList}>
              {dishes
                .filter(d => {
                  const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchCategory = pickerCategoryId === 'all' || d.categoryId === pickerCategoryId;
                  return matchSearch && matchCategory;
                })
                .map(dish => (
                  <TouchableOpacity 
                    key={dish.id} 
                    style={styles.pickerItem}
                    onPress={() => addDishToPlan(dish)}
                  >
                    <View>
                      <Text style={{ color: theme.text, fontSize: 16 }}>{dish.name}</Text>
                      <Text style={{ color: theme.icon, fontSize: 12 }}>
                        {categories.find(c => c.id === dish.categoryId)?.name}
                      </Text>
                    </View>
                    <Plus size={20} color={theme.primary} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Dish Modal */}
      <Modal visible={isDishModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingDish?.id ? '编辑菜品' : '新增菜品'}
            </Text>
            
            <View style={styles.imageUploadContainer}>
              {isUploading ? (
                <View style={styles.imagePlaceholder}>
                  <ActivityIndicator color={theme.primary} />
                  <Text style={{ marginTop: 8, color: theme.icon }}>上传中...</Text>
                </View>
              ) : editingDish?.image ? (
                <TouchableOpacity onPress={handlePickImage} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: editingDish.image }} style={styles.imagePreview} />
                  <View style={styles.imageEditOverlay}>
                    <Upload size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handlePickImage} style={styles.imagePlaceholder}>
                  <ImageIcon size={32} color={theme.icon} />
                  <Text style={{ marginTop: 8, color: theme.icon }}>添加图片</Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              label="菜品名称"
              value={editingDish?.name}
              onChangeText={text => setEditingDish(prev => prev ? {...prev, name: text} : null)}
              style={styles.input}
              mode="outlined"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={{ color: theme.text, marginBottom: 8 }}>所属分类</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map(cat => (
                  <Chip
                    key={cat.id}
                    selected={editingDish?.categoryId === cat.id}
                    onPress={() => setEditingDish({...editingDish, categoryId: cat.id})}
                    style={styles.chip}
                  >
                    {cat.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Button onPress={() => setIsDishModalVisible(false)}>取消</Button>
              <Button mode="contained" onPress={handleSaveDish} style={{ backgroundColor: theme.primary }}>
                保存
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={isCategoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingCategory?.id ? '编辑分类' : '新增分类'}
            </Text>
            
            <TextInput
              label="分类名称"
              value={editingCategory?.name}
              onChangeText={text => setEditingCategory({...editingCategory, name: text})}
              style={styles.input}
              mode="outlined"
            />

            <View style={styles.modalActions}>
              <Button onPress={() => setIsCategoryModalVisible(false)}>取消</Button>
              <Button mode="contained" onPress={handleSaveCategory} style={{ backgroundColor: theme.primary }}>
                保存
              </Button>
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
  tabHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segmentedButtons: {
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  planningContent: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planScroll: {
    flex: 1,
    padding: 16,
  },
  planSlot: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  slotDishes: {
    gap: 8,
  },
  planDishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  planDishName: {
    fontSize: 15,
    flex: 1,
  },
  emptySlot: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
  },
  emptySlotText: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.5,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerSearch: {
    height: 44,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerCategoryList: {
    marginBottom: 12,
  },
  pickerChip: {
    marginRight: 8,
    height: 32,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  leftColumn: {
    width: 85,
    backgroundColor: '#F7F8FA',
    borderRightWidth: 1,
    borderRightColor: '#EBEBEB',
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  categoryTab: {
    paddingVertical: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  activeCategoryTab: {
    backgroundColor: '#FFF',
  },
  activeCategoryIndicator: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 4,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666',
    fontWeight: '400',
  },
  activeCategoryText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 14,
  },
  catManagePanel: {
    width: '100%',
    marginTop: 12,
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  manageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  disabledBtn: {
    opacity: 0.5,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  dragHandle: {
    marginRight: 6,
  },
  addCategoryBtn: {
    padding: 16,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dishList: {
    padding: 16,
    gap: 12,
  },
  dishCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 4,
  },
  dishCardInner: {
    flexDirection: 'row',
  },
  dishThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
    margin: 12,
  },
  dishThumbnailPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 12,
    margin: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishContent: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dishInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dishName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dishCategory: {
    fontSize: 12,
    marginBottom: 6,
  },
  dishTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
  salesText: {
    fontSize: 11,
    color: '#999',
  },
  dishActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  actionBtn: {
    padding: 4,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  pickerContainer: {
    marginTop: 4,
  },
  chip: {
    marginRight: 8,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    opacity: 0.5,
  },
});
