// 数据服务层
import { Anniversary, BillImport, Dish, Expense, InventoryItem, MealPlan, Moment, ShoppingItem } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DISHES: 'dishes',
  MEAL_PLANS: 'mealPlans',
  EXPENSES: 'expenses',
  SHOPPING_LIST: 'shoppingList',
  INVENTORY: 'inventory',
  BILL_IMPORTS: 'billImports',
  ANNIVERSARIES: 'anniversaries',
  MOMENTS: 'moments',
};

// 账单导入服务
export const billImportService = {
  async getImports(): Promise<BillImport[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.BILL_IMPORTS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取导入记录失败:', error);
      return [];
    }
  },

  async addImport(record: BillImport): Promise<void> {
    const records = await this.getImports();
    records.unshift(record);
    await AsyncStorage.setItem(STORAGE_KEYS.BILL_IMPORTS, JSON.stringify(records));
  }
};

// 纪念日服务
export const anniversaryService = {
  async getAnniversaries(): Promise<Anniversary[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ANNIVERSARIES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取纪念日失败:', error);
      return [];
    }
  },

  async addAnniversary(anniversary: Anniversary): Promise<void> {
    const list = await this.getAnniversaries();
    list.push(anniversary);
    await AsyncStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(list));
  },

  async deleteAnniversary(id: string): Promise<void> {
    const list = await this.getAnniversaries();
    const filtered = list.filter(a => a.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(filtered));
  }
};

// 生活点滴服务
export const momentService = {
  async getMoments(): Promise<Moment[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MOMENTS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取点滴失败:', error);
      return [];
    }
  },

  async addMoment(moment: Moment): Promise<void> {
    const list = await this.getMoments();
    list.unshift(moment);
    await AsyncStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(list));
  }
};

// 菜品服务
export const dishService = {
  // 获取所有菜品
  async getDishes(): Promise<Dish[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DISHES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取菜品失败:', error);
      return [];
    }
  },

  // 保存菜品
  async saveDishes(dishes: Dish[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
    } catch (error) {
      console.error('保存菜品失败:', error);
    }
  },

  // 添加菜品
  async addDish(dish: Dish): Promise<void> {
    const dishes = await this.getDishes();
    dishes.push(dish);
    await this.saveDishes(dishes);
  },

  // 更新菜品
  async updateDish(id: string, updates: Partial<Dish>): Promise<void> {
    const dishes = await this.getDishes();
    const index = dishes.findIndex(d => d.id === id);
    if (index !== -1) {
      dishes[index] = { ...dishes[index], ...updates };
      await this.saveDishes(dishes);
    }
  },

  // 删除菜品
  async deleteDish(id: string): Promise<void> {
    const dishes = await this.getDishes();
    const filtered = dishes.filter(d => d.id !== id);
    await this.saveDishes(filtered);
  },
};

// 餐饮计划服务
export const mealPlanService = {
  // 获取餐饮计划
  async getMealPlans(): Promise<MealPlan[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_PLANS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取餐饮计划失败:', error);
      return [];
    }
  },

  // 保存餐饮计划
  async saveMealPlans(plans: MealPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(plans));
    } catch (error) {
      console.error('保存餐饮计划失败:', error);
    }
  },

  // 获取某天的餐饮计划
  async getMealPlanByDate(date: string): Promise<MealPlan | null> {
    const plans = await this.getMealPlans();
    return plans.find(p => p.date === date) || null;
  },

  // 更新或创建餐饮计划
  async upsertMealPlan(plan: MealPlan): Promise<void> {
    const plans = await this.getMealPlans();
    const index = plans.findIndex(p => p.date === plan.date);
    
    if (index !== -1) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    
    await this.saveMealPlans(plans);
  },

  // 获取本周餐饮计划
  async getThisWeekPlans(): Promise<MealPlan[]> {
    const plans = await this.getMealPlans();
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    return plans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate >= weekStart && planDate <= today;
    });
  },
};

// 消费记录服务
export const expenseService = {
  // 获取所有消费记录
  async getExpenses(): Promise<Expense[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取消费记录失败:', error);
      return [];
    }
  },

  // 保存消费记录
  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      console.error('保存消费记录失败:', error);
    }
  },

  // 添加消费记录
  async addExpense(expense: Expense): Promise<void> {
    const expenses = await this.getExpenses();
    expenses.push(expense);
    await this.saveExpenses(expenses);
  },

  // 获取本月消费
  async getThisMonthExpenses(): Promise<Expense[]> {
    const expenses = await this.getExpenses();
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= firstDayOfMonth;
    });
  },

  // 按类别统计消费
  async getExpenseByCategory(): Promise<Record<string, number>> {
    const expenses = await this.getThisMonthExpenses();
    const result: Record<string, number> = {};
    
    expenses.forEach(expense => {
      if (!result[expense.category]) {
        result[expense.category] = 0;
      }
      result[expense.category] += expense.amount;
    });
    
    return result;
  },

  // 获取总消费金额
  async getTotalExpenses(): Promise<number> {
    const expenses = await this.getThisMonthExpenses();
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  },
};

// 购物清单服务
export const shoppingService = {
  // 获取购物清单
  async getShoppingList(): Promise<ShoppingItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取购物清单失败:', error);
      return [];
    }
  },

  // 保存购物清单
  async saveShoppingList(items: ShoppingItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    } catch (error) {
      console.error('保存购物清单失败:', error);
    }
  },

  // 添加购物项
  async addShoppingItem(item: ShoppingItem): Promise<void> {
    const items = await this.getShoppingList();
    items.push(item);
    await this.saveShoppingList(items);
  },

  // 更新购物项
  async updateShoppingItem(id: string, updates: Partial<ShoppingItem>): Promise<void> {
    const items = await this.getShoppingList();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      await this.saveShoppingList(items);
    }
  },

  // 删除购物项
  async deleteShoppingItem(id: string): Promise<void> {
    const items = await this.getShoppingList();
    const filtered = items.filter(item => item.id !== id);
    await this.saveShoppingList(items);
  },

  // 获取未购买的物品
  async getUnpurchasedItems(): Promise<ShoppingItem[]> {
    const items = await this.getShoppingList();
    return items.filter(item => !item.purchased);
  },

  // 获取高优先级物品
  async getHighPriorityItems(): Promise<ShoppingItem[]> {
    const items = await this.getShoppingList();
    return items.filter(item => item.priority === 'high' && !item.purchased);
  },
};

// 库存服务
export const inventoryService = {
  // 获取库存物品
  async getInventory(): Promise<InventoryItem[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取库存失败:', error);
      return [];
    }
  },

  // 保存库存
  async saveInventory(items: InventoryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    } catch (error) {
      console.error('保存库存失败:', error);
    }
  },

  // 添加库存物品
  async addInventoryItem(item: InventoryItem): Promise<void> {
    const items = await this.getInventory();
    items.push(item);
    await this.saveInventory(items);
  },

  // 更新库存数量
  async updateStock(id: string, newStock: number): Promise<void> {
    const items = await this.getInventory();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index].currentStock = newStock;
      items[index].lastRestocked = new Date().toISOString().split('T')[0];
      await this.saveInventory(items);
    }
  },

  // 获取需要补货的物品
  async getLowStockItems(): Promise<InventoryItem[]> {
    const items = await this.getInventory();
    return items.filter(item => item.currentStock <= item.minStock);
  },
};

// 初始化示例数据
export const initializeSampleData = async (): Promise<void> => {
  // 检查是否已初始化
  const initialized = await AsyncStorage.getItem('initialized');
  if (initialized) return;

  // 示例菜品
  const sampleDishes: Dish[] = [
    {
      id: '1',
      name: '煎蛋三明治',
      category: 'breakfast',
      ingredients: ['鸡蛋', '面包', '黄油', '生菜'],
      calories: 350,
      favorite: true,
    },
    {
      id: '2',
      name: '番茄炒蛋',
      category: 'lunch',
      ingredients: ['番茄', '鸡蛋', '葱'],
      calories: 280,
      favorite: true,
    },
    {
      id: '3',
      name: '红烧肉',
      category: 'dinner',
      ingredients: ['五花肉', '姜', '葱', '冰糖', '酱油'],
      calories: 450,
      favorite: false,
    },
    {
      id: '4',
      name: '水果沙拉',
      category: 'snack',
      ingredients: ['苹果', '香蕉', '葡萄', '酸奶'],
      calories: 150,
      favorite: true,
    },
  ];

  // 示例消费记录
  const sampleExpenses: Expense[] = [
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      amount: 25.5,
      category: 'food',
      description: '午餐外卖',
      payer: 'me',
      paymentMethod: 'wechat',
    },
    {
      id: '2',
      date: new Date().toISOString().split('T')[0],
      amount: 120,
      category: 'shopping',
      description: '超市购物',
      payer: 'partner',
      paymentMethod: 'alipay',
    },
  ];

  // 示例购物清单
  const sampleShopping: ShoppingItem[] = [
    {
      id: '1',
      name: '牛奶',
      category: 'daily',
      quantity: 2,
      unit: '瓶',
      purchased: false,
      priority: 'high',
    },
    {
      id: '2',
      name: '生菜',
      category: 'vegetable',
      quantity: 1,
      unit: '把',
      purchased: true,
      priority: 'medium',
    },
  ];

  // 示例库存
  const sampleInventory: InventoryItem[] = [
    {
      id: '1',
      name: '大米',
      category: 'food',
      currentStock: 2,
      minStock: 5,
      unit: 'kg',
      lastRestocked: '2024-03-20',
    },
    {
      id: '2',
      name: '洗衣液',
      category: 'daily',
      currentStock: 1,
      minStock: 1,
      unit: '瓶',
      lastRestocked: '2024-03-15',
    },
  ];

  // 示例纪念日
  const sampleAnniversaries: Anniversary[] = [
    {
      id: '1',
      title: '我们在一起',
      date: '2023-05-20',
      type: 'first_meet',
      remindDays: 3,
    },
  ];

  await dishService.saveDishes(sampleDishes);
  await expenseService.saveExpenses(sampleExpenses);
  await shoppingService.saveShoppingList(sampleShopping);
  await inventoryService.saveInventory(sampleInventory);
  await anniversaryService.addAnniversary(sampleAnniversaries[0]);
  await AsyncStorage.setItem('initialized', 'true');
};