import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { Plus, Wallet, TrendingUp, Calendar, ChevronRight, FileText } from 'lucide-react-native';
import { expenseService } from '@/services/dataService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card, Button, Avatar, List, IconButton, Chip } from 'react-native-paper';
import { Expense } from '@/types';

const screenWidth = Dimensions.get('window').width;

export default function FinanceScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allExpenses = await expenseService.getThisMonthExpenses();
    setExpenses(allExpenses);
    
    const total = allExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    setTotalAmount(total);

    const stats = await expenseService.getExpenseByCategory();
    const pieData = Object.keys(stats).map((cat, index) => ({
      name: cat === 'food' ? '餐饮' : cat === 'shopping' ? '购物' : cat === 'entertainment' ? '娱乐' : cat === 'transport' ? '交通' : '其他',
      population: stats[cat],
      color: ['#FF7F50', '#FFB74D', '#81C784', '#64B5F6', '#BA68C8'][index % 5],
      legendFontColor: theme.text,
      legendFontSize: 12,
    }));
    setCategoryStats(pieData);
  };

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => `rgba(255, 127, 80, ${opacity})`,
    labelColor: (opacity = 1) => theme.text,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Monthly Summary Card */}
        <Card style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
          <Card.Content>
            <Text style={styles.summaryLabel}>本月支出总额</Text>
            <Text style={styles.summaryValue}>¥{totalAmount.toFixed(2)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summarySubLabel}>预算剩余</Text>
                <Text style={styles.summarySubValue}>¥{(5000 - totalAmount).toFixed(0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summarySubLabel}>预算比例</Text>
                <Text style={styles.summarySubValue}>{(totalAmount / 5000 * 100).toFixed(0)}%</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Charts Section */}
        <View style={styles.chartSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>支出构成</Text>
          {categoryStats.length > 0 ? (
            <PieChart
              data={categoryStats}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          ) : (
            <View style={styles.emptyChart}>
              <TrendingUp size={48} color={theme.icon} />
              <Text style={{ color: theme.icon, marginTop: 10 }}>暂无消费记录</Text>
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>最近账单</Text>
            <Button mode="text" textColor={theme.primary}>查看更多</Button>
          </View>
          
          {expenses.slice(0, 5).map((expense) => (
            <Card key={expense.id} style={styles.transactionCard}>
              <Card.Content style={styles.transactionContent}>
                <Avatar.Icon 
                  size={40} 
                  icon={expense.category === 'food' ? 'silverware' : 'cart'} 
                  style={{ backgroundColor: theme.secondary }} 
                  color={theme.primary} 
                />
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionTitle, { color: theme.text }]}>{expense.description || (expense.category === 'food' ? '餐饮' : '购物')}</Text>
                  <Text style={[styles.transactionDate, { color: theme.icon }]}>{expense.date} · {expense.payer === 'me' ? '我' : '对方'}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: theme.primary }]}>-¥{expense.amount.toFixed(2)}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Bill Import Quick Access */}
        <Card style={[styles.importCard, { backgroundColor: theme.card }]}>
          <Card.Content style={styles.importContent}>
            <View style={styles.importInfo}>
              <FileText size={24} color={theme.primary} />
              <View style={{ marginLeft: 15 }}>
                <Text style={[styles.importTitle, { color: theme.text }]}>账单导入</Text>
                <Text style={[styles.importDesc, { color: theme.icon }]}>支持微信、支付宝 CSV 导入</Text>
              </View>
            </View>
            <IconButton icon="chevron-right" iconColor={theme.primary} />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {}}
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
  summaryCard: {
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 25,
    elevation: 4,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 15,
  },
  summaryItem: {
    flex: 1,
  },
  summarySubLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  summarySubValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chartSection: {
    marginBottom: 25,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
  },
  transactionsSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 1,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  importCard: {
    borderRadius: 16,
    elevation: 1,
    marginBottom: 20,
  },
  importContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  importInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  importDesc: {
    fontSize: 12,
    marginTop: 2,
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
});