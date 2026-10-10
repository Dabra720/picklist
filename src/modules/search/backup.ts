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
import { LABEL_COLORS } from '../lists/types';
import { withoutTags } from './store';
import type { Tag } from './types';

/** Tags. Version 1 = the records as stored in database version 6. */
export const tagsBackup: ModuleBackup = {
  label: 'Tags',
  version: 1,
  stores: ['tags'],

  parse(section) {
    const skipped = new Skipped();
    const now = Date.now();
    const ids = new IdSet();
    const tags: Tag[] = [];
    readArray(section, 'tags').forEach((record, index) => {
      if (!isRecord(record)) return skipped.add('tag', 'tags', 'ongeldige gegevens');
      const name = typeof record.name === 'string' ? cleanName(record.name) : '';
      if (!name) return skipped.add('tag', 'tags', 'zonder naam');
      if (!ids.accept(record.id)) return skipped.add('tag', 'tags', 'ongeldige of dubbele id');
      tags.push({
        id: record.id,
        name,
        color:
          typeof record.color === 'string' && /^#[0-9a-f]{6}$/i.test(record.color)
            ? record.color
            : LABEL_COLORS[index % LABEL_COLORS.length],
        order: readOrder(record, index),
        ...readTimes(record, now),
      });
    });
    return { data: { tags }, warnings: skipped.messages() };
  },

  /** Lists, notes and tasks only keep tags that exist. */
  repair(data: AppData): AppData {
    const known = new Set(data.tags.map((t) => t.id));
    return withoutTags(data, (id) => known.has(id)).data;
  },

  describe(data) {
    return count(data.tags?.length ?? 0, 'tag', 'tags');
  },
};
