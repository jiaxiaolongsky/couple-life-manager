import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { billImportService, expenseService } from '@/services/dataService';
import { BillImport, Expense } from '@/types';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, FileText } from 'lucide-react-native';
import Papa from 'papaparse';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, ProgressBar, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BillImportScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [importSource, setImportSource] = useState<'wechat' | 'alipay'>('wechat');
  const [importHistory, setImportHistory] = useState<BillImport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await billImportService.getImports();
    setImportHistory(history);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/comma-separated-values',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      
      setIsProcessing(true);
      setProgress(0.1);

      // 读取文件内容
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      setProgress(0.3);

      // 解析 CSV
      Papa.parse(fileContent, {
        header: false,
        complete: async (results: Papa.ParseResult<string[]>) => {
          try {
            const data = results.data as string[][];
            const expenses: Expense[] = [];
            let totalAmount = 0;

            if (importSource === 'wechat') {
              // 微信支付账单解析逻辑 (示例)
              // 微信账单通常前几行是说明，数据从某一行开始
              const startIndex = data.findIndex(row => row[0]?.includes('交易时间')) + 1;
              if (startIndex === 0) throw new Error('未找到有效的微信账单数据格式');

              for (let i = startIndex; i < data.length; i++) {
                const row = data[i];
                if (row.length < 10) continue;

                const amountStr = row[5]?.replace('¥', '').trim();
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || row[4] === '收入') continue;

                expenses.push({
                  id: Math.random().toString(36).substr(2, 9),
                  date: row[0]?.split(' ')[0],
                  amount: amount,
                  category: 'other',
                  description: row[2] || '微信导入支出',
                  payer: 'me',
                  paymentMethod: 'wechat',
                });
                totalAmount += amount;
              }
            } else {
              // 支付宝账单解析逻辑 (示例)
              const startIndex = data.findIndex(row => row[0]?.trim() === '交易时间') + 1;
              if (startIndex === 0) throw new Error('未找到有效的支付宝账单数据格式');

              for (let i = startIndex; i < data.length; i++) {
                const row = data[i];
                if (row.length < 10) continue;

                const amount = parseFloat(row[9]);
                if (isNaN(amount) || row[10] === '收入' || row[10] === '其他') continue;

                expenses.push({
                  id: Math.random().toString(36).substr(2, 9),
                  date: row[0]?.split(' ')[0],
                  amount: amount,
                  category: 'other',
                  description: row[7] || '支付宝导入支出',
                  payer: 'me',
                  paymentMethod: 'alipay',
                });
                totalAmount += amount;
              }
            }

            setProgress(0.7);

            // 保存到数据库
            for (const exp of expenses) {
              await expenseService.addExpense(exp);
            }

            // 保存导入记录
            const importRecord: BillImport = {
              id: Math.random().toString(36).substr(2, 9),
              source: importSource,
              fileName: fileName,
              importDate: new Date().toISOString().split('T')[0],
              recordCount: expenses.length,
              totalAmount: totalAmount,
            };
            await billImportService.addImport(importRecord);
            
            setProgress(1.0);
            setIsProcessing(false);
            Alert.alert('导入成功', `已成功导入 ${expenses.length} 条支出记录，总计 ¥${totalAmount.toFixed(2)}`);
            loadHistory();
          } catch (err: any) {
            setIsProcessing(false);
            Alert.alert('导入失败', err.message || '解析文件时出错');
          }
        },
        error: (error: Error) => {
          setIsProcessing(false);
          Alert.alert('读取失败', '无法解析 CSV 文件');
        }
      });

    } catch (err) {
      setIsProcessing(false);
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>账单导入</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.importCard}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.text }]}>选择导入来源</Text>
            <SegmentedButtons
              value={importSource}
              onValueChange={value => setImportSource(value as any)}
              buttons={[
                { value: 'wechat', label: '微信支付', icon: 'wechat' },
                { value: 'alipay', label: '支付宝', icon: 'qrcode' },
              ]}
              style={styles.segmentedButtons}
            />
            
            <View style={styles.guideContainer}>
              <Text style={[styles.guideText, { color: theme.icon }]}>
                1. 在{importSource === 'wechat' ? '微信' : '支付宝'}中导出账单 CSV 文件{'\n'}
                2. 点击下方按钮选择文件进行导入{'\n'}
                3. 系统将自动识别支出记录并存入账本
              </Text>
            </View>

            {isProcessing ? (
              <View style={styles.loadingContainer}>
                <Text style={{ color: theme.primary, marginBottom: 10 }}>正在处理账单...</Text>
                <ProgressBar progress={progress} color={theme.primary} style={styles.progressBar} />
              </View>
            ) : (
              <Button 
                mode="contained" 
                icon="upload" 
                onPress={handlePickDocument}
                style={[styles.uploadButton, { backgroundColor: theme.primary }]}
              >
                选择 CSV 文件
              </Button>
            )}
          </Card.Content>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>导入历史</Text>
        {importHistory.length > 0 ? (
          importHistory.map((item) => (
            <Card key={item.id} style={styles.historyCard}>
              <Card.Content style={styles.historyContent}>
                <View style={[styles.sourceIcon, { backgroundColor: item.source === 'wechat' ? '#07C16020' : '#1677FF20' }]}>
                  <FileText size={20} color={item.source === 'wechat' ? '#07C160' : '#1677FF'} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={[styles.historyFileName, { color: theme.text }]} numberOfLines={1}>{item.fileName}</Text>
                  <Text style={[styles.historyMeta, { color: theme.icon }]}>
                    {item.importDate} · {item.recordCount}条记录
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: theme.text }]}>¥{item.totalAmount.toFixed(2)}</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Download size={48} color={theme.icon} />
            <Text style={{ color: theme.icon, marginTop: 10 }}>暂无导入记录</Text>
          </View>
        )}
      </ScrollView>
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
  importCard: {
    borderRadius: 20,
    marginBottom: 30,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  guideContainer: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 22,
  },
  uploadButton: {
    borderRadius: 12,
    paddingVertical: 6,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  historyCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 1,
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  historyFileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});