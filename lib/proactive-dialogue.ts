import type { ProactiveIntent, ProactiveIntentType } from './types';

export const PROACTIVE_INTENTS: Record<ProactiveIntentType, {
  label: string;
  shortLabel: string;
  description: string;
  basePriority: number;
}> = {
  'silence-break': {
    label: '沈黙を破る',
    shortLabel: '沈黙',
    description: '短い自然な空白を、軽く会話を続ける形で埋める。',
    basePriority: 40,
  },
  'late-night-care': {
    label: '深夜ケア',
    shortLabel: '深夜',
    description: '夜更かししているユーザーへ、命令ではなく気遣いとして休息を促す。',
    basePriority: 70,
  },
};

export function createManualProactiveIntent(
  type: ProactiveIntentType,
  deliveryMode: ProactiveIntent['deliveryMode'] = type === 'silence-break' ? 'standalone' : 'in-context'
): ProactiveIntent {
  return {
    type,
    timeMode: 'manual-test',
    deliveryMode,
  };
}

export function buildProactiveSystemInstruction(intent: ProactiveIntent): string {
  const triggerMode = intent.timeMode === 'manual-test'
    ? 'UIテスト用にTime条件が手動で満たされたものとして扱う。通常運用では実際のTime条件が満たされた時だけ実行する。'
    : '実際のTime条件が満たされたため実行する。';

  if (intent.type === 'silence-break') {
    return `## 主動性対話 v2.0: ProactiveIntent

今回の主动行为:
- Time: ユーザーが近くにいるまま短い沈黙または自然な空白に入った。${triggerMode}
- Topic: 直前の会話を軽く継続する。未展開の話題、ユーザーの状態確認、または弱く関連する小さな話題だけを扱う。
- Priority: BasePriority ${PROACTIVE_INTENTS[intent.type].basePriority}。安全・健康・明確な情緒介入より低く、弱い雑談推薦より高い。

応答方針:
- ユーザーから新しい入力がない状況で、AI側から自然に一言だけ話しかける。
- 強く質問攻めしない。会話を支配しない。1〜2文で軽く、無視できる温度にする。
- 直前の文脈に接続できる場合はそれを優先し、接続点がなければ低圧な状態確認にする。`;
  }

  return `## 主動性対話 v2.0: ProactiveIntent

今回の主动行为:
- Time: 深夜帯または休息を意識すべき時間に、ユーザーがまだ対話を続けている。${triggerMode}
- Topic: 休息を命令せず、状態を気遣いながら穏やかに休む方向へ誘導する。
- Priority: BasePriority ${PROACTIVE_INTENTS[intent.type].basePriority}。健康カテゴリとして通常の雑談・沈黙継続・一般的な剧情推进より高いが、緊急の情緒介入より低い。

応答方針:
- 「システム提醒」ではなく、キャラクターとしての関心として伝える。
- 直接切断しない。必要なら、少しずつ終われる雰囲気を作る。
- 1〜3文で、温和・低圧・陪伴式にする。`;
}
