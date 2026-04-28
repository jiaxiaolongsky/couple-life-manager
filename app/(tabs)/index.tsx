import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { anniversaryService, dbInitService, expenseService, inventoryService, mealPlanService, shoppingService } from '@/services/dataService';
import { WeatherData, weatherService } from '@/services/weatherService';
import { useRouter } from 'expo-router';
import { AlertTriangle, Camera, ChevronRight, CloudSun, Heart, Plus, ShoppingBag, TrendingUp, Utensils, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Card, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [todayMeal, setTodayMeal] = useState<any>(null);
  const [nextAnniversary, setNextAnniversary] = useState<any>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('早安');
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting('早安');
    else if (hour >= 11 && hour < 13) setGreeting('午安');
    else if (hour >= 13 && hour < 18) setGreeting('下午好');
    else if (hour >= 18 && hour < 24) setGreeting('晚上好');
    else setGreeting('夜深了');
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setWeatherLoading(true);
      setDbError(null);
      
      // 测试数据库连接
      const isConnected = await dbInitService.testConnection();
      if (!isConnected) {
        setDbError('无法连接到数据库，请检查网络或代理设置');
      }

      // 初始化数据库表 (非阻塞)
      dbInitService.initializeDatabase().catch((err: any) => console.error('DB Init background error:', err));
      
      const total = await expenseService.getTotalExpenses();
      setTotalExpenses(total);
      
      const unpurchased = await shoppingService.getUnpurchasedItems();
      setShoppingCount(unpurchased.length);
      
      const lowStock = await inventoryService.getLowStockItems();
      setLowStockCount(lowStock.length);

      const today = new Date().toISOString().split('T')[0];
      const meal = await mealPlanService.getMealPlanByDate(today);
      setTodayMeal(meal);

      const annis = await anniversaryService.getAnniversaries();
      if (annis.length > 0) {
        setNextAnniversary(annis[0]); // 假设已按时间排序
      }

      // 加载天气
      try {
        const weatherData = await weatherService.getCurrentWeather();
        if (weatherData) {
          setWeather(weatherData);
        } else {
          console.warn('Weather service returned null');
        }
      } catch (e) {
        console.error('Weather fetch error in component:', e);
      } finally {
        setWeatherLoading(false);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const quickActions = [
    { title: '记一笔', icon: Wallet, color: '#FF7F50', route: '/finance' },
    { title: '餐饮', icon: Utensils, color: '#FFB74D', route: '/meals' },
    { title: '购物', icon: ShoppingBag, color: '#81C784', route: '/items' },
    { title: '纪念日', icon: Heart, color: '#F06292', route: '/anniversary' },
    { title: '瞬间', icon: Camera, color: '#64B5F6', route: '/moments' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Database Connection Error Hint */}
        {dbError && (
          <View style={[styles.dbErrorHint, { backgroundColor: theme.error + '15' }]}>
            <AlertTriangle size={16} color={theme.error} />
            <Text style={[styles.dbErrorText, { color: theme.error }]}>{dbError}</Text>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>{greeting}，亲爱的</Text>
            <Text style={[styles.date, { color: theme.icon }]}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
          </View>
          <Avatar.Text size={48} label="US" style={{ backgroundColor: theme.primary }} color="#fff" />
        </View>

        {/* Weather Tip Section */}
        {weatherLoading ? (
          <Card style={[styles.weatherCard, { backgroundColor: theme.card }]}>
            <Card.Content style={styles.weatherContent}>
              <View style={styles.weatherMain}>
                <CloudSun size={32} color={theme.icon} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.weatherTemp, { color: theme.icon }]}>正在获取天气...</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ) : weather ? (
          <Card style={[styles.weatherCard, { backgroundColor: theme.card }]}>
            <Card.Content style={styles.weatherContent}>
              <View style={styles.weatherMain}>
                <CloudSun size={32} color={theme.primary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.weatherTemp, { color: theme.text }]}>{weather.temp} · {weather.condition}</Text>
                  <Text style={[styles.weatherCity, { color: theme.icon }]}>{weather.city}</Text>
                </View>
              </View>
              <View style={styles.weatherTipContainer}>
                <Text style={[styles.weatherTip, { color: theme.text }]}>{weather.tip}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <TouchableOpacity onPress={loadData} activeOpacity={0.7}>
            <Card style={[styles.weatherCard, { backgroundColor: theme.card }]}>
              <Card.Content style={styles.weatherContent}>
                <View style={styles.weatherMain}>
                  <CloudSun size={32} color={theme.icon} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.weatherTemp, { color: theme.text }]}>天气不可用</Text>
                    <Text style={[styles.weatherCity, { color: theme.icon }]}>点击重试</Text>
                  </View>
                </View>
                <TrendingUp size={20} color={theme.primary} />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: theme.secondary }]}>
                <TrendingUp size={24} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: theme.icon }]}>本月消费</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>¥{totalExpenses.toFixed(0)}</Text>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                <ShoppingBag size={24} color="#4CAF50" />
              </View>
              <View>
                <Text style={[styles.statLabel, { color: theme.icon }]}>待购物品</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>{shoppingCount}</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Today's Meal Plan */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>今日饮食</Text>
        <Card style={[styles.mealCard, { backgroundColor: theme.card }]}>
          <Card.Content>
            {todayMeal ? (
              <View>
                <View style={styles.mealRow}>
                  <Text style={[styles.mealTime, { color: theme.icon }]}>早餐</Text>
                  <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={1}>
                    {todayMeal.breakfast && todayMeal.breakfast.length > 0 
                      ? todayMeal.breakfast.map((d: any) => d.name).join('、') 
                      : '未安排'}
                  </Text>
                </View>
                <View style={styles.mealRow}>
                  <Text style={[styles.mealTime, { color: theme.icon }]}>午餐</Text>
                  <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={1}>
                    {todayMeal.lunch && todayMeal.lunch.length > 0 
                      ? todayMeal.lunch.map((d: any) => d.name).join('、') 
                      : '未安排'}
                  </Text>
                </View>
                <View style={styles.mealRow}>
                  <Text style={[styles.mealTime, { color: theme.icon }]}>晚餐</Text>
                  <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={1}>
                    {todayMeal.dinner && todayMeal.dinner.length > 0 
                      ? todayMeal.dinner.map((d: any) => d.name).join('、') 
                      : '未安排'}
                  </Text>
                </View>
                <View style={styles.mealRow}>
                  <Text style={[styles.mealTime, { color: theme.icon }]}>加餐</Text>
                  <Text style={[styles.mealName, { color: theme.text }]} numberOfLines={1}>
                    {todayMeal.snacks && todayMeal.snacks.length > 0 
                      ? todayMeal.snacks.map((d: any) => d.name).join('、') 
                      : '未安排'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyMeal}>
                <Utensils size={32} color={theme.icon} style={{ marginBottom: 8 }} />
                <Text style={{ color: theme.icon }}>今天还没有安排餐饮计划</Text>
                <Button mode="text" textColor={theme.primary} onPress={() => router.push('/meals')}>去安排</Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Inventory Alert */}
        {lowStockCount > 0 && (
          <TouchableOpacity onPress={() => router.push('/items')}>
            <View style={[styles.alertBanner, { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' }]}>
              <AlertTriangle size={20} color="#FF9800" />
              <Text style={[styles.alertText, { color: '#E65100' }]}>有 {lowStockCount} 件物品库存不足，记得补货哦！</Text>
              <ChevronRight size={20} color="#FF9800" />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>快捷功能</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsRow}>
          {quickActions.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.actionButton, { backgroundColor: theme.card }]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <action.icon size={24} color={action.color} />
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Anniversary Card */}
        {nextAnniversary && (
          <TouchableOpacity onPress={() => router.push('/anniversary')}>
            <Card style={[styles.anniCard, { backgroundColor: theme.primary }]}>
              <Card.Content style={styles.anniContent}>
                <Heart size={32} color="#fff" fill="#fff" />
                <View style={styles.anniInfo}>
                  <Text style={styles.anniLabel}>下一个纪念日</Text>
                  <Text style={styles.anniTitle}>{nextAnniversary.title}</Text>
                </View>
                <View style={styles.anniDays}>
                  <Text style={styles.anniDaysValue}>{nextAnniversary.date.split('-')[1]}/{nextAnniversary.date.split('-')[2]}</Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}

        {/* Budget Progress (Example) */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>本月预算</Text>
        <Card style={[styles.budgetCard, { backgroundColor: theme.card }]}>
          <Card.Content>
            <View style={styles.budgetHeader}>
              <Text style={[styles.budgetText, { color: theme.text }]}>已用 ¥{totalExpenses.toFixed(0)} / ¥5000</Text>
              <Text style={[styles.budgetPercent, { color: theme.primary }]}>{(totalExpenses / 5000 * 100).toFixed(0)}%</Text>
            </View>
            <ProgressBar progress={totalExpenses / 5000} color={theme.primary} style={styles.progressBar} />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/finance')}
      >
        <Plus color="#fff" size={32} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    elevation: 2,
    borderRadius: 16,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  mealCard: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  mealTime: {
    width: 60,
    fontSize: 14,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyMeal: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  dbErrorHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  dbErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  weatherCard: {
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weatherCity: {
    fontSize: 12,
  },
  weatherTipContainer: {
    flex: 1,
    marginLeft: 15,
    paddingLeft: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
  },
  weatherTip: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sectionTitle: {
    marginBottom: 20,
    marginHorizontal: -5,
  },
  actionButton: {
    width: 90,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  actionIcon: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  anniCard: {
    borderRadius: 20,
    marginBottom: 24,
    elevation: 4,
  },
  anniContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  anniInfo: {
    flex: 1,
    marginLeft: 15,
  },
  anniLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  anniTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  anniDays: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  anniDaysValue: {
    color: '#fff',
    fontWeight: 'bold',
  },
  budgetCard: {
    borderRadius: 16,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetText: {
    fontSize: 14,
  },
  budgetPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
