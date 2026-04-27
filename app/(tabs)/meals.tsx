import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dishCategoryService, dishService } from '@/services/dataService';
import { Dish, DishCategory } from '@/types';
import { ChevronDown, ChevronUp, Edit2, GripVertical, Heart, Plus, Trash2, Utensils } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import 'react-native-gesture-handler';
import { Button, Card, Chip, FAB, IconButton, Searchbar, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MealsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);

  // Modals
  const [isDishModalVisible, setIsDishModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  
  // Edit states
  const [editingDish, setEditingDish] = useState<Partial<Dish> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<DishCategory> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
    if (!editingDish?.name || !editingDish?.categoryId) return;
    
    try {
      if (editingDish.id) {
        await dishService.updateDish(editingDish.id, editingDish);
      } else {
        await dishService.addDish(editingDish as Omit<Dish, 'id'>);
      }
      setIsDishModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('保存失败', '请检查网络连接');
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
    } catch (error) {
      Alert.alert('保存失败', '请检查网络连接');
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
    } catch (error) {
      console.error('保存分类排序失败:', error);
      Alert.alert('排序保存失败', '请检查网络连接');
    }
  };

  const renderCategoryItem = ({ item: cat, drag, isActive, getIndex }: RenderItemParams<DishCategory>) => {
    const index = getIndex();
    return (
      <ScaleDecorator>
        <View
          style={[
            styles.categoryTab,
            activeCategoryId === cat.id && [styles.activeCategoryTab, { backgroundColor: theme.primary + '15' }],
            isActive && { backgroundColor: theme.primary + '10' }
          ]}
        >
          <TouchableOpacity
            style={styles.categoryNameArea}
            onPress={() => setActiveCategoryId(cat.id)}
            onLongPress={isManageMode ? drag : undefined}
            disabled={isActive}
          >
            {isManageMode && (
              <View style={styles.dragIndicator}>
                <GripVertical size={12} color={theme.icon} />
              </View>
            )}
            <Text style={[
              styles.categoryText,
              { color: activeCategoryId === cat.id ? theme.primary : theme.text },
              activeCategoryId === cat.id && styles.activeCategoryText
            ]}>{cat.name}</Text>
          </TouchableOpacity>
          
          {isManageMode && (
            <View style={styles.catManageContainer}>
            <View style={styles.sortActions}>
              <TouchableOpacity 
                disabled={index === 0}
                onPress={() => handleMoveCategory(index!, 'up')}
                style={styles.sortBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronUp size={16} color={index === 0 ? theme.icon + '40' : theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                disabled={index === categories.length - 1}
                onPress={() => handleMoveCategory(index!, 'down')}
                style={styles.sortBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronDown size={16} color={index === categories.length - 1 ? theme.icon + '40' : theme.primary} />
              </TouchableOpacity>
            </View>
              
              <View style={styles.catActions}>
                <TouchableOpacity 
                  style={styles.catActionBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    setEditingCategory(cat);
                    setIsCategoryModalVisible(true);
                  }}
                >
                  <Edit2 size={14} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.catActionBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    Alert.alert(
                      '删除分类',
                      `确定要删除 "${cat.name}" 吗？这不会删除该分类下的菜品。`,
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
                            } catch (error) {
                              Alert.alert('删除失败', '请检查网络连接');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Trash2 size={14} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  const renderDishItem = ({ item }: { item: Dish }) => (
    <Card style={[styles.dishCard, { backgroundColor: theme.card }]} mode="elevated">
      <Card.Content style={styles.dishContent}>
        <View style={styles.dishInfo}>
          <Text style={[styles.dishName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.dishCategory, { color: theme.icon }]}>
            {categories.find(c => c.id === item.categoryId)?.name}
          </Text>
        </View>
        <View style={styles.dishActions}>
          <TouchableOpacity 
            onPress={async () => {
              try {
                await dishService.updateDish(item.id, { favorite: !item.favorite });
                loadData();
              } catch (error) {
                Alert.alert('更新失败', '请检查网络连接');
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
                          } catch (error) {
                            Alert.alert('删除失败', '请检查网络连接');
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
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
          icon={isManageMode ? "check" : "cog"}
          mode="contained"
          containerColor={isManageMode ? theme.primary : theme.card}
          iconColor={isManageMode ? "#fff" : theme.primary}
          onPress={() => setIsManageMode(!isManageMode)}
        />
      </View>

      <View style={styles.content}>
        {/* Left Categories */}
        <View style={[styles.leftColumn, { borderRightColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.categoryTab,
              activeCategoryId === 'all' && [styles.activeCategoryTab, { backgroundColor: theme.primary + '15' }]
            ]}
            onPress={() => setActiveCategoryId('all')}
          >
            <Text style={[
              styles.categoryText,
              { color: activeCategoryId === 'all' ? theme.primary : theme.text },
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

      {/* Dish Modal */}
      <Modal visible={isDishModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingDish?.id ? '编辑菜品' : '新增菜品'}
            </Text>
            
            <TextInput
              label="菜品名称"
              value={editingDish?.name}
              onChangeText={text => setEditingDish({...editingDish, name: text})}
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
  leftColumn: {
    width: 100,
    borderRightWidth: 1,
  },
  rightColumn: {
    flex: 1,
  },
  categoryTab: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCategoryTab: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B', // theme.primary
  },
  categoryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  activeCategoryText: {
    fontWeight: 'bold',
  },
  dishList: {
    padding: 12,
    gap: 12,
  },
  dishCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dishContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dishCategory: {
    fontSize: 12,
    marginTop: 4,
  },
  dishActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  pickerContainer: {
    marginVertical: 8,
  },
  chip: {
    marginRight: 8,
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
    paddingTop: 100,
  },
  addCategoryBtn: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabContainer: {
    position: 'relative',
  },
  catManageContainer: {
    width: '100%',
    paddingHorizontal: 4,
    gap: 8,
    marginTop: 4,
  },
  sortActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  sortBtn: {
    padding: 4,
  },
  catActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  catActionBtn: {
    padding: 4,
  },
  categoryNameArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: '100%',
  },
  dragIndicator: {
    marginRight: 4,
    opacity: 0.5,
  },
});
