import type { TriggerBm25Index, TriggerEvent } from './types';

const DEFAULT_TRIGGER_DESCRIPTION = `天文台内の別の部屋に移動する。
メルメリアはまずユーザーの映像を表示する円盤の音声通信を維持しながら、映像通信を切って、
円盤を懐にしまって、別の部屋に移動してから、
再度円盤を取り出して、安定した卓上や台座においてから映像通信をオンにする`;

export const DEFAULT_TRIGGERS: TriggerEvent[] = [
  {
    id: 'tutorial_room_change',
    name: 'tutorial_room_change',
    roleViewKeys: [
      '別の部屋を見たいと言われた',
      '別の部屋で手がかりを探したいと言われた',
      '今は寝室にいないけど、寝室を案内してもらいたいと言われた',
      '今は寝室にいないけど、寝室に戻りたいと言われた',
      '今は研究室にいないけど、研究室を案内してもらいたいと言われた',
      '今は研究室にいないけど、研究室に戻りたいと言われた',
      '今は観測室にいないけど、観測室に戻りたいと言われた',
    ],
    playerViewKeys: [
      '別の部屋を見に行ってもいいのか？',
      '別の部屋に重要な手がかりがあるかもしれません',
      '寝室の方を見てみたい',
      '(今は寝室にいないけど、)寝室の方を案内してもらえますか',
      '研究室はどんな感じですか',
      '研究室に残されてたヒントがあるかも',
      'ロビーに戻りましょう',
      '寝室に戻りましょう',
      '研究室に戻りましょう',
    ],
    description: DEFAULT_TRIGGER_DESCRIPTION,
    enabled: true,
    isDefault: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

export interface TriggerMatch {
  trigger: TriggerEvent;
  score: number;
  matchedKey: string;
  matchedPerspective: 'role' | 'player';
}

export const TRIGGER_BM25_THRESHOLD = 0.55;

const K1 = 1.5;
const B = 0.75;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[（）]/g, (ch) => (ch === '（' ? '(' : ')'))
    .replace(/[？]/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalize(text);
  const compact = normalized.replace(/\s+/g, '');
  const terms: string[] = [];

  normalized.split(/[\s,，。.!！?？、:：;；()[\]「」『』"']+/).forEach((word) => {
    if (word.length > 0) terms.push(word);
  });

  for (const size of [2, 3, 4]) {
    for (let i = 0; i <= compact.length - size; i += 1) {
      terms.push(compact.slice(i, i + size));
    }
  }

  return terms;
}

function termFrequency(terms: string[]): Record<string, number> {
  return terms.reduce<Record<string, number>>((acc, term) => {
    acc[term] = (acc[term] || 0) + 1;
    return acc;
  }, {});
}

export function buildTriggerBm25Index(trigger: TriggerEvent): TriggerBm25Index {
  const rawDocs = [
    ...(trigger.roleViewKeys || []).map((key) => ({ key, perspective: 'role' as const })),
    ...(trigger.playerViewKeys || []).map((key) => ({ key, perspective: 'player' as const })),
  ].filter((doc) => doc.key.trim());

  const docs = rawDocs.map((doc) => {
    const terms = tokenize(doc.key);
    return {
      ...doc,
      terms,
      termFreq: termFrequency(terms),
      length: terms.length,
    };
  });

  const docCount = Math.max(docs.length, 1);
  const documentFrequency: Record<string, number> = {};
  docs.forEach((doc) => {
    new Set(doc.terms).forEach((term) => {
      documentFrequency[term] = (documentFrequency[term] || 0) + 1;
    });
  });

  const idf = Object.fromEntries(
    Object.entries(documentFrequency).map(([term, frequency]) => [
      term,
      Math.log(1 + (docCount - frequency + 0.5) / (frequency + 0.5)),
    ])
  );

  return {
    docs,
    idf,
    avgDocLength: docs.reduce((sum, doc) => sum + doc.length, 0) / docCount,
    generatedAt: new Date().toISOString(),
  };
}

function needsBm25(trigger: TriggerEvent): boolean {
  const keyCount = (trigger.roleViewKeys?.length || 0) + (trigger.playerViewKeys?.length || 0);
  return !trigger.bm25 || trigger.bm25.docs.length !== keyCount;
}

export function ensureTriggerBm25(trigger: TriggerEvent): TriggerEvent {
  return needsBm25(trigger)
    ? { ...trigger, bm25: buildTriggerBm25Index(trigger), updatedAt: trigger.updatedAt || new Date() }
    : trigger;
}

export function ensureTriggerIndexes(triggers: TriggerEvent[]): TriggerEvent[] {
  return triggers.map(ensureTriggerBm25);
}

export function mergeDefaultTriggers(savedTriggers: TriggerEvent[] = []): TriggerEvent[] {
  const defaults = DEFAULT_TRIGGERS.map((defaultTrigger) => {
    return ensureTriggerBm25({
      ...defaultTrigger,
      enabled: true,
    });
  });
  const custom = savedTriggers
    .filter((trigger) => !DEFAULT_TRIGGERS.some((defaultTrigger) => defaultTrigger.id === trigger.id))
    .map((trigger) => ensureTriggerBm25({ ...trigger, isDefault: false }));

  return [...defaults, ...custom];
}

function scoreDoc(queryTerms: string[], doc: TriggerBm25Index['docs'][number], index: TriggerBm25Index): number {
  const uniqueQueryTerms = new Set(queryTerms);
  let score = 0;

  uniqueQueryTerms.forEach((term) => {
    const tf = doc.termFreq[term] || 0;
    if (tf === 0) return;

    const idf = index.idf[term] || 0;
    const denominator = tf + K1 * (1 - B + B * (doc.length / Math.max(index.avgDocLength, 1)));
    score += idf * ((tf * (K1 + 1)) / denominator);
  });

  return score / Math.sqrt(Math.max(uniqueQueryTerms.size, 1));
}

export function findBestTriggerMatch(
  text: string,
  triggers: TriggerEvent[],
  threshold = TRIGGER_BM25_THRESHOLD
): TriggerMatch | null {
  const queryTerms = tokenize(text);
  let best: TriggerMatch | null = null;

  ensureTriggerIndexes(triggers)
    .filter((trigger) => trigger.enabled !== false && trigger.bm25)
    .forEach((trigger) => {
      trigger.bm25?.docs.forEach((doc) => {
        const score = scoreDoc(queryTerms, doc, trigger.bm25!);
        if (score >= threshold && (!best || score > best.score)) {
          best = {
            trigger,
            score,
            matchedKey: doc.key,
            matchedPerspective: doc.perspective,
          };
        }
      });
    });

  return best;
}

export function buildTriggerPrompt(match: TriggerMatch | null): string {
  if (!match) return '';

  return `\n\n【Trigger: ${match.trigger.id}】\n次のイベントがユーザー入力のBM25照合で発火しました。応答ではこのイベント内容を具体的な行動・描写として反映してください。\nイベント内容：\n${match.trigger.description}\n`;
}
