import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { Plus, Utensils, ChevronRight, Search, Filter } from 'lucide-react-native';
import { mealPlanService, dishService } from '@/services/dataService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, Button, TextInput, Chip, IconButton } from 'react-native-paper';
import { Dish, MealPlan } from '@/types';

export default function MealsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectingType, setSelectingType] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    const plan = await mealPlanService.getMealPlanByDate(selectedDate);
    setMealPlan(plan);
    const allDishes = await dishService.getDishes();
    setDishes(allDishes);
  };

  const handleAddMeal = (type: 'breakfast' | 'lunch' | 'dinner') => {
    setSelectingType(type);
    setIsModalVisible(true);
  };

  const selectDish = async (dish: Dish) => {
    if (!selectingType) return;
    
    const newPlan: MealPlan = mealPlan || {
      id: Math.random().toString(36).substr(2, 9),
      date: selectedDate,
    };
    
    newPlan[selectingType] = dish;
    await mealPlanService.upsertMealPlan(newPlan);
    setMealPlan({ ...newPlan });
    setIsModalVisible(false);
    setSelectingType(null);
  };

  const renderMealItem = (type: 'breakfast' | 'lunch' | 'dinner', label: string) => {
    const dish = mealPlan ? (mealPlan[type] as Dish) : null;
    
    return (
      <Card style={styles.mealItemCard} onPress={() => handleAddMeal(type)}>
        <Card.Content style={styles.mealItemContent}>
          <View style={styles.mealItemInfo}>
            <Text style={[styles.mealItemLabel, { color: theme.icon }]}>{label}</Text>
            <Text style={[styles.mealItemName, { color: dish ? theme.text : theme.icon }]}>
              {dish ? dish.name : '点击添加菜品'}
            </Text>
          </View>
          <IconButton icon="plus" iconColor={theme.primary} size={24} />
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Calendar
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, disableTouchEvent: true, selectedColor: theme.primary }
          }}
          theme={{
            backgroundColor: theme.background,
            calendarBackground: theme.background,
            textSectionTitleColor: theme.icon,
            selectedDayBackgroundColor: theme.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.primary,
            dayTextColor: theme.text,
            textDisabledColor: '#d9e1e8',
            dotColor: theme.primary,
            selectedDotColor: '#ffffff',
            arrowColor: theme.primary,
            monthTextColor: theme.text,
            indicatorColor: theme.primary,
          }}
          style={styles.calendar}
        />

        <View style={styles.planSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {selectedDate === new Date().toISOString().split('T')[0] ? '今日' : selectedDate} 餐饮计划
            </Text>
          </View>

          {renderMealItem('breakfast', '早餐')}
          {renderMealItem('lunch', '午餐')}
          {renderMealItem('dinner', '晚餐')}
        </View>

        <View style={styles.librarySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>常用菜品库</Text>
            <Button mode="text" textColor={theme.primary}>查看全部</Button>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={dishes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Card style={styles.dishCard}>
                <Card.Content>
                  <Utensils size={24} color={theme.primary} />
                  <Text style={[styles.dishName, { color: theme.text }]}>{item.name}</Text>
                  <Chip style={styles.dishChip} textStyle={{ fontSize: 10 }}>{item.category}</Chip>
                </Card.Content>
              </Card>
            )}
          />
        </View>
      </ScrollView>

      {/* Dish Selection Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>选择菜品 - {selectingType === 'breakfast' ? '早餐' : selectingType === 'lunch' ? '午餐' : '晚餐'}</Text>
              <IconButton icon="close" onPress={() => setIsModalVisible(false)} />
            </View>
            
            <TextInput
              mode="outlined"
              placeholder="搜索菜品..."
              left={<TextInput.Icon icon="magnify" />}
              style={styles.searchInput}
              outlineColor={theme.border}
              activeOutlineColor={theme.primary}
            />

            <FlatList
              data={dishes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.dishListItem} onPress={() => selectDish(item)}>
                  <Utensils size={20} color={theme.icon} />
                  <Text style={[styles.dishListText, { color: theme.text }]}>{item.name}</Text>
                  <ChevronRight size={20} color={theme.icon} />
                </TouchableOpacity>
              )}
            />
            
            <Button 
              mode="contained" 
              onPress={() => setIsModalVisible(false)}
              style={[styles.addNewButton, { backgroundColor: theme.primary }]}
            >
              新建菜品
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
  scrollContent: {
    paddingBottom: 40,
  },
  calendar: {
    marginBottom: 10,
    elevation: 2,
    paddingBottom: 10,
  },
  planSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealItemCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
  },
  mealItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  mealItemInfo: {
    flex: 1,
  },
  mealItemLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  mealItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  librarySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dishCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    elevation: 2,
    marginBottom: 8,
  },
  dishName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  dishChip: {
    height: 24,
    alignSelf: 'flex-start',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '70%',
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchInput: {
    marginBottom: 15,
  },
  dishListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dishListText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
  },
  addNewButton: {
    marginTop: 15,
    borderRadius: 12,
    paddingVertical: 8,
  },
});