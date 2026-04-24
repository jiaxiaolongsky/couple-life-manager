// 数据模型定义

// 菜品类型
export interface Dish {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: string[];
  calories?: number;
  image?: string;
  favorite: boolean;
}

// 餐饮计划
export interface MealPlan {
  id: string;
  date: string; // YYYY-MM-DD
  breakfast?: Dish;
  lunch?: Dish;
  dinner?: Dish;
  snacks?: Dish[];
}

// 消费记录
export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: 'food' | 'shopping' | 'entertainment' | 'transport' | 'housing' | 'other';
  description: string;
  payer: 'me' | 'partner';
  paymentMethod: 'cash' | 'wechat' | 'alipay' | 'card';
}

// 购物清单项
export interface ShoppingItem {
  id: string;
  name: string;
  category: 'vegetable' | 'fruit' | 'meat' | 'daily' | 'other';
  quantity: number;
  unit: string;
  purchased: boolean;
  priority: 'high' | 'medium' | 'low';
}

// 库存物品
export interface InventoryItem {
  id: string;
  name: string;
  category: 'food' | 'daily' | 'cleaning' | 'other';
  currentStock: number;
  minStock: number;
  unit: string;
  lastRestocked: string;
}

// 账单导入记录
export interface BillImport {
  id: string;
  source: 'wechat' | 'alipay';
  fileName: string;
  importDate: string;
  recordCount: number;
  totalAmount: number;
}

// 纪念日
export interface Anniversary {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'birthday' | 'first_meet' | 'wedding' | 'other';
  remindDays: number; // 提前几天提醒
}

// 生活点滴/瞬间
export interface Moment {
  id: string;
  date: string;
  content: string;
  images: string[];
  location?: string;
}
