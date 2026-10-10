import { cleanName } from '../../core/lib/util';
import {
  count,
  IdSet,
  isRecord,
  readArray,
  readOrder,
  readTimes,
  Skipped,
} from '../../core/lib/validate';
import type { ModuleBackup } from '../../core/modules';
import type { AppData } from '../../core/types';
import {
  LABEL_COLORS,
  SORT_MODES,
  type Item,
  type Label,
  type PackList,
  type SortMode,
} from './types';
import { cleanQuantity } from './util';

/** Lists, labels and items. Version 1 = the records as stored in database version 3. */
export const listsBackup: ModuleBackup = {
  version: 1,
  stores: ['lists', 'labels', 'items'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();

    const listIds = new IdSet();
    const listCreated = new Map<string, number>();
    const lists: PackList[] = [];
    readArray(section, 'lists').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('lijst', 'lijsten', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('lijst', 'lijsten', 'zonder naam');
      if (!listIds.accept(record.id))
        return skipped.add('lijst', 'lijsten', 'ongeldige of dubbele id');
      const list: PackList = {
        id: record.id,
        name,
        order: readOrder(record, index),
        sortMode: SORT_MODES.includes(record.sortMode as SortMode)
          ? (record.sortMode as SortMode)
          : 'manual',
        ...readTimes(record, now),
      };
      listCreated.set(list.id, list.createdAt);
      lists.push(list);
    });

    // Labels and items in older backups have no dates; they take those of their list.
    const timesFromList = (record: Record<string, unknown>) =>
      readTimes(record, listCreated.get(record.listId as string) ?? now);

    const labelIds = new IdSet();
    const labelList = new Map<string, string>();
    const labels: Label[] = [];
    readArray(section, 'labels').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('label', 'labels', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('label', 'labels', 'zonder naam');
      if (typeof record.listId !== 'string' || !listIds.has(record.listId)) {
        return skipped.add('label', 'labels', 'hoort bij een onbekende lijst');
      }
      if (!labelIds.accept(record.id))
        return skipped.add('label', 'labels', 'ongeldige of dubbele id');
      labelList.set(record.id, record.listId);
      labels.push({
        id: record.id,
        listId: record.listId,
        name,
        color:
          typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
            ? record.color
            : LABEL_COLORS[index % LABEL_COLORS.length],
        order: readOrder(record, index),
        ...timesFromList(record),
      });
    });

    const itemIds = new IdSet();
    const items: Item[] = [];
    readArray(section, 'items').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('item', 'items', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('item', 'items', 'zonder naam');
      if (typeof record.listId !== 'string' || !listIds.has(record.listId)) {
        return skipped.add('item', 'items', 'hoort bij een onbekende lijst');
      }
      if (!itemIds.accept(record.id))
        return skipped.add('item', 'items', 'ongeldige of dubbele id');
      const labelId = typeof record.labelId === 'string' ? record.labelId : null;
      items.push({
        id: record.id,
        listId: record.listId,
        // A label from another list (or a missing one) is dropped; the item itself is kept.
        labelId: labelId !== null && labelList.get(labelId) === record.listId ? labelId : null,
        name,
        quantity: cleanQuantity(record.quantity),
        checked: record.checked === true,
        order: readOrder(record, index),
        ...timesFromList(record),
      });
    });

    return { data: { lists, labels, items }, warnings: skipped.messages() };
  },

  repair(data: AppData): AppData {
    const listIds = new Set(data.lists.map((list) => list.id));
    const labels = data.labels.filter((label) => listIds.has(label.listId));
    const labelList = new Map(labels.map((label) => [label.id, label.listId]));
    const items = data.items
      .filter((item) => listIds.has(item.listId))
      .map((item) =>
        item.labelId !== null && labelList.get(item.labelId) !== item.listId
          ? { ...item, labelId: null }
          : item,
      );
    return { ...data, labels, items };
  },

  describe(data) {
    const lists = data.lists?.length ?? 0;
    const items = data.items?.length ?? 0;
    return `${count(lists, 'lijst', 'lijsten')}, ${count(items, 'item', 'items')}`;
  },
};
