import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { inventoryService, shoppingService } from '@/services/dataService';
import { InventoryItem, ShoppingItem } from '@/types';
import { Package, Plus, ShoppingBag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Checkbox, Chip, IconButton, Modal, Portal, ProgressBar, SegmentedButtons, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ItemsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [tab, setTab] = useState('shopping');
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('个');

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
    if (tab === 'shopping') {
      await shoppingService.deleteShoppingItem(id);
    } else {
      await inventoryService.deleteInventoryItem(id);
    }
    loadData();
  };

  const updateStock = async (id: string, delta: number) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      const newStock = Math.max(0, item.currentStock + delta);
      await inventoryService.updateStock(id, newStock);
      loadData();
    }
  };

  const handleAddItem = async () => {
    if (!newName) return;
    
    if (tab === 'shopping') {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: newName,
        quantity: Number(newQuantity) || 1,
        unit: newUnit,
        category: 'other',
        purchased: false
      };
      await shoppingService.addShoppingItem(newItem);
    } else {
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        name: newName,
        currentStock: Number(newQuantity) || 1,
        minStock: 1,
        unit: newUnit,
        category: 'other',
        lastRestocked: new Date().toISOString().split('T')[0]
      };
      await inventoryService.addInventoryItem(newItem);
    }
    
    setNewName('');
    setNewQuantity('1');
    setVisible(false);
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
            {item.quantity} {item.unit}
          </Text>
        </View>
        <IconButton icon="trash-can-outline" iconColor={theme.error} size={20} onPress={() => deleteItem(item.id)} />
      </Card.Content>
    </Card>
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    const isLow = item.currentStock <= item.minStock;
    const progress = Math.min(item.currentStock / (item.minStock * 2 || 1), 1);
    
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
            <IconButton icon="trash-can-outline" iconColor={theme.error} size={20} onPress={() => deleteItem(item.id)} />
          </View>
          <ProgressBar 
            progress={progress} 
            color={isLow ? theme.error : theme.primary} 
            style={styles.progressBar} 
          />
          <View style={styles.inventoryActions}>
            <Button 
              mode="outlined" 
              onPress={() => updateStock(item.id, -1)} 
              style={styles.actionBtn}
              compact
            >
              减少
            </Button>
            <Button 
              mode="contained" 
              onPress={() => updateStock(item.id, 1)} 
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
      <Portal>
        <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>添加{tab === 'shopping' ? '购物项' : '库存物品'}</Text>
          <TextInput
            label="名称"
            value={newName}
            onChangeText={setNewName}
            mode="outlined"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              label={tab === 'shopping' ? "数量" : "当前库存"}
              value={newQuantity}
              onChangeText={setNewQuantity}
              keyboardType="numeric"
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              label="单位"
              value={newUnit}
              onChangeText={setNewUnit}
              mode="outlined"
              style={[styles.input, { flex: 1 }]}
            />
          </View>
          <Button mode="contained" onPress={handleAddItem} style={styles.saveButton}>添加</Button>
        </Modal>
      </Portal>

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
        onPress={() => setVisible(true)}
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
    paddingVertical: 10,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 15,
  },
  inventoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 5,
  },
});