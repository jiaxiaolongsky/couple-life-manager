// 数据服务层
import { Anniversary, BillImport, Dish, Expense, InventoryItem, MealPlan, Moment, ShoppingItem } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

// 生成唯一 ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// 统一处理数据库错误
const handleDbError = (error: any, operation: string) => {
  console.error(`${operation}报错:`, error);
  
  let message = error.message || '未知错误';
  
  // 处理常见的网络错误
  if (message.includes('Network request failed') || message.includes('fetch')) {
    message = '网络请求失败，请检查：\n1. 手机是否联网\n2. 是否能正常访问国际网站 (Supabase 域名可能被拦截)\n3. 手机是否开启了 VPN 但配置不当';
  } else if (error.code === 'PGRST116') {
    message = '数据不存在或表结构不正确';
  } else if (error.code === '23505') {
    message = '数据已存在，请勿重复添加';
  }
  
  throw new Error(`数据库错误: ${message} (${error.code || 'ERR'})`);
};

// 数据库初始化服务
export const dbInitService = {
  async testConnection() {
    try {
      // 测试几个核心表
      const tables = ['dish_categories', 'dishes', 'meal_plans'];
      for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error) {
          console.warn(`表 ${table} 测试失败:`, error.message);
          // 如果是 404，说明表不存在
          if (error.code === 'PGRST116' || error.status === 404) {
            console.error(`表 ${table} 不存在，请确保已在 Supabase 中创建该表。`);
          }
        }
      }
      return true;
    } catch (e) {
      console.error('Supabase 连接异常:', e);
      return false;
    }
  },

  async initializeDatabase() {
    // 首先测试连接
    const isConnected = await this.testConnection();
    if (!isConnected) {
      console.error('数据库无法连接，请检查 URL 和 Key 是否正确');
    }

    try {
      const tables = [
        {
          name: 'dish_categories',
          sql: `
            create table if not exists dish_categories (
              id text primary key default gen_random_uuid(),
              name text not null,
              "order" integer default 0,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'dishes',
          sql: `
            create table if not exists dishes (
              id text primary key default gen_random_uuid(),
              name text not null,
              category_id text references dish_categories(id),
              ingredients text[],
              calories numeric,
              favorite boolean default false,
              image text,
              note text,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'meal_plans',
          sql: `
            create table if not exists meal_plans (
              id text primary key default gen_random_uuid(),
              date date not null unique,
              breakfast jsonb default '[]',
              lunch jsonb default '[]',
              dinner jsonb default '[]',
              snacks jsonb default '[]',
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'expenses',
          sql: `
            create table if not exists expenses (
              id text primary key,
              date timestamp with time zone not null,
              amount numeric not null,
              category text,
              description text,
              payer text,
              payment_method text,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'shopping_list',
          sql: `
            create table if not exists shopping_list (
              id text primary key,
              name text not null,
              category text,
              quantity numeric default 1,
              unit text,
              purchased boolean default false,
              priority text default 'medium',
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'inventory',
          sql: `
            create table if not exists inventory (
              id text primary key,
              name text not null,
              category text,
              current_stock numeric default 0,
              min_stock numeric default 0,
              unit text,
              last_restocked timestamp with time zone,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'anniversaries',
          sql: `
            create table if not exists anniversaries (
              id text primary key,
              title text not null,
              date date not null,
              type text,
              remind_days integer default 0,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        },
        {
          name: 'moments',
          sql: `
            create table if not exists moments (
              id text primary key,
              date timestamp with time zone not null,
              content text,
              images text[] default '{}',
              location text,
              created_at timestamp with time zone default timezone('utc'::text, now())
            );
          `
        }
      ];

      for (const table of tables) {
        // 为每个表同步操作添加 3 秒超时，防止卡住整个初始化过程
        const syncPromise = supabase.rpc('execute_sql', {
          sql_query: `
            ${table.sql}
            alter table ${table.name} enable row level security;
            do $$ begin
              create policy "Allow all access" on ${table.name} for all using (true) with check (true);
            exception when others then null; end $$;
          `
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sync timeout')), 3000)
        );

        await Promise.race([syncPromise, timeoutPromise]).catch((e) => {
          console.log(`Table ${table.name} sync check skip/timeout. 如果保存失败，请在 Supabase SQL Editor 中手动运行命令。`);
        });
      }
      
      console.log('Database initialization complete');
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }
};

const STORAGE_KEYS = {
  DISHES: 'dishes',
  MEAL_PLANS: 'mealPlans',
  DISH_CATEGORIES: 'dishCategories',
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
      const { data, error } = await supabase
        .from('anniversaries')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(data));
        return data as Anniversary[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ANNIVERSARIES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取纪念日失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.ANNIVERSARIES);
      return json ? JSON.parse(json) : [];
    }
  },

  async addAnniversary(anniversary: Anniversary): Promise<void> {
    try {
      const { error } = await supabase
        .from('anniversaries')
        .insert([{
          id: anniversary.id || generateId(),
          title: anniversary.title,
          date: anniversary.date,
          type: anniversary.type,
          remind_days: anniversary.remindDays
        }]);
      
      if (error) throw error;
      
      const list = await this.getAnniversaries();
      await AsyncStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(list));
    } catch (error) {
      console.error('添加纪念日失败:', error);
    }
  },

  async deleteAnniversary(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('anniversaries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const list = await this.getAnniversaries();
      const filtered = list.filter(a => a.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.ANNIVERSARIES, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除纪念日失败:', error);
    }
  }
};

// 生活点滴服务
export const momentService = {
  async getMoments(): Promise<Moment[]> {
    try {
      const { data, error } = await supabase
        .from('moments')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(data));
        return data as Moment[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MOMENTS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取点滴失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MOMENTS);
      return json ? JSON.parse(json) : [];
    }
  },

  async addMoment(moment: Moment): Promise<void> {
    try {
      const { error } = await supabase
        .from('moments')
        .insert([{
          id: moment.id || generateId(),
          date: moment.date,
          content: moment.content,
          images: moment.images,
          location: moment.location
        }]);
      
      if (error) throw error;
      
      const list = await this.getMoments();
      await AsyncStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(list));
    } catch (error) {
      console.error('添加点滴失败:', error);
    }
  },

  async deleteMoment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('moments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const list = await this.getMoments();
      const filtered = list.filter(m => m.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除点滴失败:', error);
    }
  }
};

// 菜品类别服务
export const dishCategoryService = {
  async getCategories(): Promise<DishCategory[]> {
    try {
      const { data, error } = await supabase
        .from('dish_categories')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.DISH_CATEGORIES, JSON.stringify(data));
        return data as DishCategory[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DISH_CATEGORIES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取菜品分类失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DISH_CATEGORIES);
      return json ? JSON.parse(json) : [];
    }
  },

  async addCategory(category: Omit<DishCategory, 'id'> & { id?: string }): Promise<void> {
    try {
      const insertData = {
        id: category.id || generateId(),
        name: category.name,
        order: category.order || 0
      };

      const { error } = await supabase
        .from('dish_categories')
        .insert([insertData]);
      if (error) {
        handleDbError(error, '添加分类');
      }
      const list = await this.getCategories();
      await AsyncStorage.setItem(STORAGE_KEYS.DISH_CATEGORIES, JSON.stringify(list));
    } catch (error: any) {
      throw error;
    }
  },

  async updateCategory(id: string, updates: Partial<DishCategory>): Promise<void> {
    try {
      const { error } = await supabase
        .from('dish_categories')
        .update(updates)
        .eq('id', id);
      if (error) {
        handleDbError(error, '更新分类');
      }
      const list = await this.getCategories();
      await AsyncStorage.setItem(STORAGE_KEYS.DISH_CATEGORIES, JSON.stringify(list));
    } catch (error: any) {
      throw error;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dish_categories')
        .delete()
        .eq('id', id);
      if (error) {
        handleDbError(error, '删除分类');
      }
      const list = await this.getCategories();
      await AsyncStorage.setItem(STORAGE_KEYS.DISH_CATEGORIES, JSON.stringify(list));
    } catch (error: any) {
      throw error;
    }
  },

  async saveCategories(categories: DishCategory[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('dish_categories')
        .upsert(categories);
      if (error) {
        handleDbError(error, '保存分类');
      }
      await AsyncStorage.setItem(STORAGE_KEYS.DISH_CATEGORIES, JSON.stringify(categories));
    } catch (error: any) {
      throw error;
    }
  }
};

// 菜品服务
export const dishService = {
  // 上传菜品图片
  async uploadDishImage(uri: string): Promise<string> {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `dish-images/${fileName}`;

      // 将本地 URI 转换为 Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('dish-assets')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      // 获取公共 URL
      const { data: { publicUrl } } = supabase.storage
        .from('dish-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('上传图片失败:', error);
      throw error;
    }
  },

  // 获取所有菜品
  async getDishes(): Promise<Dish[]> {
    try {
      // 优先从 Supabase 获取
      const { data, error } = await supabase
        .from('dishes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // 同步到本地缓存
        const dishes = data.map(d => ({
          ...d,
          categoryId: d.category_id, // 映射数据库字段名到 TS 属性名
          note: d.note
        }));
        await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
        return dishes as Dish[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DISHES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取菜品失败，尝试本地缓存:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.DISHES);
      return json ? JSON.parse(json) : [];
    }
  },

  // 保存菜品 (批量)
  async saveDishes(dishes: Dish[]): Promise<void> {
    try {
      // 保存到本地
      await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
      
      // 同步到 Supabase (upsert)
      const { error } = await supabase
        .from('dishes')
        .upsert(dishes.map(d => ({
          id: d.id || generateId(),
          name: d.name,
          category_id: d.categoryId,
          ingredients: d.ingredients,
          calories: d.calories,
          favorite: d.favorite,
          image: d.image,
          note: d.note
        })));
      
      if (error) throw error;
    } catch (error) {
      console.error('保存菜品失败:', error);
    }
  },

  // 添加菜品
  async addDish(dish: Dish): Promise<void> {
    try {
      // 1. 保存到 Supabase
      const insertData: any = {
        id: dish.id || generateId(),
        name: dish.name,
        category_id: dish.categoryId,
        ingredients: dish.ingredients,
        calories: dish.calories,
        favorite: dish.favorite,
        image: dish.image,
        note: dish.note
      };

      const { error } = await supabase
        .from('dishes')
        .insert([insertData]);
      
      if (error) {
        handleDbError(error, '添加菜品');
      }
      
      // 2. 同步更新本地
      const dishes = await this.getDishes();
      await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
    } catch (error: any) {
      throw error;
    }
  },

  // 更新菜品
  async updateDish(id: string, updates: Partial<Dish>): Promise<void> {
    try {
      const supabaseUpdates: any = { ...updates };
      if (updates.categoryId) {
        supabaseUpdates.category_id = updates.categoryId;
        delete supabaseUpdates.categoryId;
      }

      // 1. 更新 Supabase
      const { error } = await supabase
        .from('dishes')
        .update(supabaseUpdates)
        .eq('id', id);
      
      if (error) {
        handleDbError(error, '更新菜品');
      }
      
      // 2. 同步更新本地
      const dishes = await this.getDishes();
      await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
    } catch (error: any) {
      throw error;
    }
  },

  // 删除菜品
  async deleteDish(id: string): Promise<void> {
    try {
      // 1. 从 Supabase 删除
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleDbError(error, '删除菜品');
      }
      
      // 2. 同步更新本地
      const dishes = await this.getDishes();
      const filtered = dishes.filter(d => d.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(filtered));
    } catch (error: any) {
      console.error('删除菜品失败:', error);
      throw error;
    }
  },
};

// 餐饮计划服务
export const mealPlanService = {
  // 获取餐饮计划
  async getMealPlans(): Promise<MealPlan[]> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(data));
        return data as MealPlan[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_PLANS);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取餐饮计划失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_PLANS);
      return json ? JSON.parse(json) : [];
    }
  },

  // 保存餐饮计划
  async saveMealPlans(plans: MealPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(plans));
      
      const { error } = await supabase
        .from('meal_plans')
        .upsert(plans);
      
      if (error) throw error;
    } catch (error) {
      console.error('保存餐饮计划失败:', error);
    }
  },

  // 获取某天的餐饮计划
  async getMealPlanByDate(date: string): Promise<MealPlan | null> {
    try {
      const { data, error, status } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('date', date)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // 未找到记录
        console.error(`获取单日计划失败 (状态码: ${status}):`, error);
        throw error;
      }
      
      const plans = await this.getMealPlans();
      return plans.find(p => p.date === date) || null;
    } catch (error) {
      console.error('获取单日计划失败:', error);
      return null;
    }
  },

  // 更新或创建餐饮计划
  async upsertMealPlan(plan: MealPlan): Promise<void> {
    try {
      const upsertData: any = {
        id: plan.id || generateId(),
        date: plan.date,
        breakfast: plan.breakfast,
        lunch: plan.lunch,
        dinner: plan.dinner,
        snacks: plan.snacks
      };

      const { error } = await supabase
        .from('meal_plans')
        .upsert(upsertData);
      
      if (error) throw error;
      
      // 同步本地
      const plans = await this.getMealPlans();
      const index = plans.findIndex(p => p.date === plan.date);
      if (index !== -1) {
        plans[index] = plan;
      } else {
        plans.push(plan);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLANS, JSON.stringify(plans));
    } catch (error) {
      console.error('更新计划失败:', error);
    }
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data));
        return data.map(d => ({
          ...d,
          paymentMethod: d.payment_method
        })) as Expense[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取消费记录失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
      return json ? JSON.parse(json) : [];
    }
  },

  // 保存消费记录 (批量)
  async saveExpenses(expenses: Expense[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
      const { error } = await supabase
        .from('expenses')
        .upsert(expenses.map(e => ({
          id: e.id || generateId(),
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description,
          payer: e.payer,
          payment_method: e.paymentMethod
        })));
      
      if (error) throw error;
    } catch (error) {
      console.error('保存消费记录失败:', error);
    }
  },

  // 添加消费记录
  async addExpense(expense: Expense): Promise<void> {
    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          id: expense.id || generateId(),
          date: expense.date,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          payer: expense.payer,
          payment_method: expense.paymentMethod
        }]);
      
      if (error) {
        handleDbError(error, '添加消费记录');
      }
      
      const expenses = await this.getExpenses();
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      throw error;
    }
  },

  // 删除消费记录
  async deleteExpense(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleDbError(error, '删除消费记录');
      }
      
      const expenses = await this.getExpenses();
      await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (error) {
      throw error;
    }
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
      const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(data));
        return data as ShoppingItem[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取购物清单失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
      return json ? JSON.parse(json) : [];
    }
  },

  // 保存购物清单 (批量)
  async saveShoppingList(items: ShoppingItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
      const { error } = await supabase
        .from('shopping_list')
        .upsert(items.map(item => ({
          ...item,
          id: item.id || generateId()
        })));
      
      if (error) throw error;
    } catch (error) {
      console.error('保存购物清单失败:', error);
    }
  },

  // 添加购物项
  async addShoppingItem(item: ShoppingItem): Promise<void> {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .insert([{
          ...item,
          id: item.id || generateId()
        }]);
      
      if (error) {
        handleDbError(error, '添加购物项');
      }
      
      const items = await this.getShoppingList();
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    } catch (error) {
      throw error;
    }
  },

  // 更新购物项
  async updateShoppingItem(id: string, updates: Partial<ShoppingItem>): Promise<void> {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        handleDbError(error, '更新购物项');
      }
      
      const items = await this.getShoppingList();
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    } catch (error) {
      throw error;
    }
  },

  // 删除购物项
  async deleteShoppingItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);
      
      if (error) {
        handleDbError(error, '删除购物项');
      }
      
      const items = await this.getShoppingList();
      await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    } catch (error) {
      throw error;
    }
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
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const mappedData = data.map(d => ({
          ...d,
          currentStock: d.current_stock,
          minStock: d.min_stock,
          lastRestocked: d.last_restocked
        }));
        await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(mappedData));
        return mappedData as InventoryItem[];
      }
      
      const json = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('获取库存失败:', error);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY);
      return json ? JSON.parse(json) : [];
    }
  },

  // 保存库存 (批量)
  async saveInventory(items: InventoryItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
      const { error } = await supabase
        .from('inventory')
        .upsert(items.map(item => ({
          id: item.id || generateId(),
          name: item.name,
          category: item.category,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          unit: item.unit,
          last_restocked: item.lastRestocked
        })));
      
      if (error) throw error;
    } catch (error) {
      console.error('保存库存失败:', error);
    }
  },

  // 添加库存物品
  async addInventoryItem(item: InventoryItem): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory')
        .insert([{
          id: item.id || generateId(),
          name: item.name,
          category: item.category,
          current_stock: item.currentStock,
          min_stock: item.minStock,
          unit: item.unit,
          last_restocked: item.lastRestocked
        }]);
      
      if (error) throw error;
      
      const items = await this.getInventory();
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    } catch (error) {
      console.error('添加库存物品失败:', error);
    }
  },

  // 更新库存物品
  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
    try {
      const supabaseUpdates: any = { ...updates };
      if (updates.currentStock !== undefined) supabaseUpdates.current_stock = updates.currentStock;
      if (updates.minStock !== undefined) supabaseUpdates.min_stock = updates.minStock;
      if (updates.lastRestocked !== undefined) supabaseUpdates.last_restocked = updates.lastRestocked;
      
      // 删除不再需要的字段
      delete supabaseUpdates.currentStock;
      delete supabaseUpdates.minStock;

      const { error } = await supabase
        .from('inventory')
        .update(supabaseUpdates)
        .eq('id', id);
      
      if (error) throw error;
      
      const items = await this.getInventory();
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    } catch (error) {
      console.error('更新库存物品失败:', error);
    }
  },

  // 更新库存数量
  async updateStock(id: string, newStock: number): Promise<void> {
    await this.updateInventoryItem(id, { 
      currentStock: newStock,
      lastRestocked: new Date().toISOString()
    });
  },

  // 删除库存物品
  async deleteInventoryItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      const items = await this.getInventory();
      const filtered = items.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除库存物品失败:', error);
    }
  },

  // 获取需要补货的物品
  async getLowStockItems(): Promise<InventoryItem[]> {
    const items = await this.getInventory();
    return items.filter(item => item.currentStock <= item.minStock);
  },
};