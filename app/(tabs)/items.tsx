import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { inventoryService, shoppingService } from '@/services/dataService';
import { InventoryItem, ShoppingItem } from '@/types';
import { Package, Plus, ShoppingBag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Checkbox, Chip, IconButton, ProgressBar, SegmentedButtons, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ItemsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [tab, setTab] = useState('shopping');
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    if (tab === 'shopping') {
      const list = await shoppingService.getShoppingList();
      setShoppingList(list);
    } else {
      const items = await inventoryService.getInventory();
      setInventory(items);
    }
  };

  const togglePurchased = async (id: string, current: boolean) => {
    await shoppingService.updateShoppingItem(id, { purchased: !current });
    loadData();
  };

  const deleteItem = async (id: string) => {
    await shoppingService.deleteShoppingItem(id);
    loadData();
  };

  const renderShoppingItem = ({ item }: { item: ShoppingItem }) => (
    <Card style={styles.itemCard}>
      <Card.Content style={styles.itemContent}>
        <Checkbox
          status={item.purchased ? 'checked' : 'unchecked'}
          onPress={() => togglePurchased(item.id, item.purchased)}
          color={theme.primary}
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: theme.text, textDecorationLine: item.purchased ? 'line-through' : 'none' }]}>
            {item.name}
          </Text>
          <Text style={[styles.itemSub, { color: theme.icon }]}>
            {item.quantity} {item.unit} · {item.category === 'vegetable' ? '蔬菜' : item.category === 'fruit' ? '水果' : '日常'}
          </Text>
        </View>
        <IconButton icon="trash-can-outline" iconColor={theme.error} size={20} onPress={() => deleteItem(item.id)} />
      </Card.Content>
    </Card>
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.currentStock <= item.minStock;
    const progress = Math.min(item.currentStock / (item.minStock * 2), 1);
    
    return (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.inventoryContent}>
          <View style={styles.inventoryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.itemSub, { color: theme.icon }]}>
                当前库存: {item.currentStock} {item.unit} / 最少: {item.minStock} {item.unit}
              </Text>
            </View>
            {isLow && (
              <Chip icon="alert" style={{ backgroundColor: '#FFF3E0' }} textStyle={{ color: '#E65100', fontSize: 10 }}>
                缺货
              </Chip>
            )}
          </View>
          <ProgressBar 
            progress={progress} 
            color={isLow ? theme.error : theme.primary} 
            style={styles.progressBar} 
          />
          <View style={styles.inventoryActions}>
            <Button 
              mode="outlined" 
              onPress={() => {}} 
              style={styles.actionBtn}
              compact
            >
              减少
            </Button>
            <Button 
              mode="contained" 
              onPress={() => {}} 
              style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              compact
            >
              补货
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'shopping', label: '购物清单', icon: 'cart' },
            { value: 'inventory', label: '物品库存', icon: 'archive' },
          ]}
          style={styles.segmentedButtons}
          theme={{ colors: { primary: theme.primary } }}
        />
        <TextInput
          mode="outlined"
          placeholder={tab === 'shopping' ? "搜索购物项..." : "搜索库存..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.searchInput}
          outlineColor={theme.border}
          activeOutlineColor={theme.primary}
        />
      </View>

      <FlatList
        data={(tab === 'shopping' ? shoppingList : inventory) as any}
        keyExtractor={(item) => item.id}
        renderItem={tab === 'shopping' ? renderShoppingItem as any : renderInventoryItem as any}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {tab === 'shopping' ? <ShoppingBag size={48} color={theme.icon} /> : <Package size={48} color={theme.icon} />}
            <Text style={{ color: theme.icon, marginTop: 10 }}>暂无物品</Text>
          </View>
        }
      />

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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  segmentedButtons: {
    marginBottom: 15,
  },
  searchInput: {
    height: 45,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  inventoryContent: {
    paddingVertical: 8,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 15,
  },
  inventoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    marginLeft: 10,
    borderRadius: 8,
  },
  emptyState: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
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