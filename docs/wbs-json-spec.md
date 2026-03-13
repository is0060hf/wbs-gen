# WBS JSON 仕様書

本ドキュメントは、WBS管理システムが受け付けるJSONフォーマットの仕様を定義する。
他プロジェクト（LLM等）で直接JSONを生成する際のリファレンスとして使用する。

---

## 1. 全体構造

```json
{
  "project_info": { ... },
  "wbs": [ ... ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `project_info` | `object` | **必須** | プロジェクトのメタ情報 |
| `wbs` | `WBSTask[]` | **必須** | WBSタスクの配列（トップレベルフェーズ） |

---

## 2. `project_info` オブジェクト

```json
{
  "project_info": {
    "name": "販促アーカイブ開発プロジェクト PoC版",
    "version": "2025-06-05",
    "pmbok_version": "7",
    "description": "7/1デモ会で価値仮説を検証できる動くPoCを提示"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `name` | `string` | **必須** | プロジェクト名 |
| `version` | `string` | **必須** | バージョン（日付やセマンティックバージョニング。例: `"2025-06-05"`, `"1.0.0"`） |
| `pmbok_version` | `string` | **必須** | 準拠するPMBOKバージョン（通常 `"7"`） |
| `description` | `string` | **必須** | プロジェクトの概要説明 |
| `created_at` | `string` | 任意 | 作成日（`YYYY-MM-DD` 形式）。省略時はインポート時に自動設定 |
| `updated_at` | `string` | 任意 | 更新日（`YYYY-MM-DD` 形式）。省略時はインポート時に自動設定 |

---

## 3. `WBSTask` オブジェクト

### 3.1 フィールド一覧

| フィールド | 型 | 必須 | デフォルト値 | 説明 |
|---|---|---|---|---|
| `id` | `string` | **必須** | — | タスクの一意識別子 |
| `wbs_code` | `string` | **必須** | — | WBS階層コード |
| `name` | `string` | **必須** | — | タスク名 |
| `description` | `string` | 任意 | — | タスクの詳細説明 |
| `priority` | `string` | **必須** | — | MoSCoW優先度 |
| `start` | `string` | **必須** | — | 開始日（`YYYY-MM-DD`） |
| `duration_days` | `number` | **条件付き必須** | — | 作業期間（日数）。`0.5` 単位可。バッファタスクの場合は省略可 |
| `end` | `string` | 任意 | 自動計算 | 終了日（`YYYY-MM-DD`）。省略時は `start + duration_days` から自動算出 |
| `progress` | `number` | 任意 | `0` | 進捗率（`0`〜`100`） |
| `assignee` | `string` | 任意 | — | 担当者名。複数人の場合はカンマ区切り（例: `"エンジニアA, B"`） |
| `dependencies` | `string[]` | 任意 | `[]` | 先行タスクの `id` の配列 |
| `buffer` | `number` | 任意 | — | バッファ日数。バッファタスク専用フィールド |
| `status` | `string` | 任意 | `"Not Started"` | タスクの状態 |
| `children` | `WBSTask[]` | 任意 | — | 子タスクの配列（階層構造） |
| `is_critical` | `boolean` | 任意 | `false` | クリティカルパス上のタスクかどうか |
| `notes` | `string` | 任意 | — | 備考・メモ |
| `note` | `string` | 任意 | — | `notes` の別名。どちらでも可 |

### 3.2 `id` の命名規則

| パターン | 用途 | 例 |
|---|---|---|
| `T-NNN` | トップレベルフェーズ | `T-001`, `T-002` |
| `T-NNN-NN` | 第2階層タスク | `T-001-01`, `T-002-03` |
| `T-NNN-NN-NN` | 第3階層タスク | `T-002-01-01`, `T-003-01-03` |
| `BUF-N` or `BUF-NNN` | バッファタスク | `BUF-1`, `BUF-001` |

> IDはプロジェクト内で一意であること。`dependencies` から参照されるため、一貫した命名が重要。

### 3.3 `wbs_code` の形式

ドット区切りの階層番号。JSONの構造上の位置と一致させる。

| 階層 | 形式 | 例 |
|---|---|---|
| 第1階層 | `N` | `1`, `2`, `3` |
| 第2階層 | `N.N` | `1.1`, `2.3` |
| 第3階層 | `N.N.N` | `2.1.1`, `3.2.4` |
| 第4階層以降 | `N.N.N.N` ... | `2.1.1.1` |

### 3.4 `priority` の値（MoSCoW法）

| 値 | 説明 |
|---|---|
| `"Must"` | 必須。実現しないとプロジェクトが成立しない |
| `"Should"` | 重要。時間があれば実装すべき |
| `"Could"` | あると良い。余裕があれば実装 |
| `"Won't"` | 今回は対象外 |

### 3.5 `status` の値

| 値 | 説明 |
|---|---|
| `"Not Started"` | 未着手（デフォルト） |
| `"In Progress"` | 進行中 |
| `"Completed"` | 完了 |
| `"Delayed"` | 遅延 |

### 3.6 日付形式

すべての日付フィールドは **`YYYY-MM-DD`** 形式（ISO 8601の日付部分）。

```
"start": "2025-06-05"
"end": "2025-06-10"
```

### 3.7 `duration_days` の扱い

- 整数値または `0.5` 単位の小数値が使用可能
- 例: `0.5`（半日）, `1`, `2`, `3.5`
- `end` が省略された場合、`start` と `duration_days` から終了日が自動計算される
  - 計算式: `end = start + ceil(duration_days) - 1` 日

---

## 4. 階層構造（`children`）

タスクは `children` フィールドによりネスト可能。階層の深さに制限はないが、実用上は3〜4階層を推奨。

### 親タスクの自動計算

親タスク（`children` を持つタスク）は以下が子タスクから自動的に再計算される：
- `start`: 子タスクの最も早い開始日
- `end`: 子タスクの最も遅い終了日
- `duration_days`: `start` 〜 `end` の日数
- `progress`: 子タスクの `duration_days` を重みとした加重平均

そのため、**親タスクの `start`, `duration_days`, `end` は概算値で構わない**（インポート時に上書きされる）。

### 構造例（3階層）

```json
{
  "id": "T-002",
  "wbs_code": "2",
  "name": "Phase1: LLMプロト構築",
  "priority": "Must",
  "start": "2025-10-18",
  "duration_days": 25,
  "children": [
    {
      "id": "T-002-01",
      "wbs_code": "2.1",
      "name": "Bedrock統合実装",
      "priority": "Must",
      "start": "2025-10-18",
      "duration_days": 7,
      "children": [
        {
          "id": "T-002-01-01",
          "wbs_code": "2.1.1",
          "name": "Bedrock API連携実装",
          "priority": "Must",
          "start": "2025-10-18",
          "duration_days": 3,
          "assignee": "エンジニアA",
          "dependencies": ["T-001-01"]
        }
      ]
    }
  ]
}
```

---

## 5. 依存関係（`dependencies`）

- `dependencies` は先行タスクの `id` を文字列配列で指定する
- 同一階層・異なる階層のタスク間で参照可能
- 循環依存は禁止
- 参照先の `id` がJSON内に存在する必要がある

```json
{
  "id": "T-004-03",
  "wbs_code": "4.3",
  "name": "グラフ描画機能実装",
  "priority": "Must",
  "start": "2025-06-18",
  "duration_days": 3,
  "assignee": "エンジニア1",
  "dependencies": ["T-004-01", "T-004-02"]
}
```

---

## 6. バッファタスク

各フェーズの末尾にバッファを配置できる。バッファタスクは `buffer` フィールドを持ち、`duration_days` と `assignee` は不要。

```json
{
  "id": "BUF-1",
  "wbs_code": "1.9",
  "name": "環境構築フェーズバッファ",
  "priority": "Must",
  "start": "2025-06-08",
  "buffer": 2
}
```

| フィールド | 必須 | 説明 |
|---|---|---|
| `buffer` | **必須** | バッファの日数 |
| `duration_days` | 不要 | バッファタスクでは省略可 |
| `assignee` | 不要 | バッファタスクには担当者不要 |

---

## 7. 完全なJSON例（ミニマル）

```json
{
  "project_info": {
    "name": "サンプルプロジェクト",
    "version": "1.0.0",
    "pmbok_version": "7",
    "description": "JSON仕様確認用のミニマルなサンプル"
  },
  "wbs": [
    {
      "id": "T-001",
      "wbs_code": "1",
      "name": "準備フェーズ",
      "priority": "Must",
      "start": "2025-07-01",
      "duration_days": 5,
      "children": [
        {
          "id": "T-001-01",
          "wbs_code": "1.1",
          "name": "要件定義",
          "priority": "Must",
          "start": "2025-07-01",
          "duration_days": 2,
          "assignee": "エンジニアA"
        },
        {
          "id": "T-001-02",
          "wbs_code": "1.2",
          "name": "環境構築",
          "priority": "Must",
          "start": "2025-07-03",
          "duration_days": 2,
          "assignee": "エンジニアB",
          "dependencies": ["T-001-01"]
        },
        {
          "id": "BUF-1",
          "wbs_code": "1.3",
          "name": "準備フェーズバッファ",
          "priority": "Must",
          "start": "2025-07-05",
          "buffer": 1
        }
      ]
    },
    {
      "id": "T-002",
      "wbs_code": "2",
      "name": "開発フェーズ",
      "priority": "Must",
      "start": "2025-07-06",
      "duration_days": 10,
      "children": [
        {
          "id": "T-002-01",
          "wbs_code": "2.1",
          "name": "API設計・実装",
          "priority": "Must",
          "start": "2025-07-06",
          "duration_days": 5,
          "assignee": "エンジニアA",
          "dependencies": ["T-001-02"]
        },
        {
          "id": "T-002-02",
          "wbs_code": "2.2",
          "name": "フロントエンド実装",
          "priority": "Must",
          "start": "2025-07-06",
          "duration_days": 5,
          "assignee": "エンジニアB",
          "dependencies": ["T-001-02"],
          "note": "API設計と並行して進行"
        },
        {
          "id": "T-002-03",
          "wbs_code": "2.3",
          "name": "結合テスト",
          "priority": "Must",
          "start": "2025-07-11",
          "duration_days": 3,
          "assignee": "エンジニアA, B",
          "dependencies": ["T-002-01", "T-002-02"]
        },
        {
          "id": "BUF-2",
          "wbs_code": "2.4",
          "name": "開発フェーズバッファ",
          "priority": "Must",
          "start": "2025-07-14",
          "buffer": 2
        }
      ]
    },
    {
      "id": "BUF-3",
      "wbs_code": "3",
      "name": "最終バッファ",
      "priority": "Must",
      "start": "2025-07-16",
      "buffer": 3
    }
  ]
}
```

---

## 8. インポート時の正規化ルール

システムにインポートされる際、以下の正規化が自動で行われる。生成側では厳密に設定しなくても動作するが、なるべく正確に出力することを推奨する。

| フィールド | 正規化の内容 |
|---|---|
| `project_info.name` | 未設定時 → `"インポートされたプロジェクト"` |
| `project_info.version` | 未設定時 → `"1.0.0"` |
| `project_info.pmbok_version` | 未設定時 → `"7"` |
| `project_info.description` | 未設定時 → `""` |
| `project_info.created_at` | 未設定時 → インポート日 |
| `project_info.updated_at` | 未設定時 → インポート日 |
| `id` | 未設定時 → タイムスタンプベースのID自動生成 |
| `wbs_code` | 未設定時 → 配列の位置から自動生成 |
| `name` | 未設定時 → `"新規タスク"` |
| `priority` | 未設定時 → `"Must"` |
| `start` | 未設定時 → インポート日 |
| `duration_days` | 未設定時 → `1` |
| `end` | 未設定時 → `start + duration_days` から計算 |
| `progress` | 未設定時 → `0` |
| `status` | 未設定時 → `"Not Started"` |
| `dependencies` | 未設定時 → `[]` |
| `is_critical` | 未設定時 → `false` |
| `children` | 存在する場合、各子タスクを再帰的に正規化 |

---

## 9. LLMへの指示用プロンプト例

以下はLLMにWBS JSONを生成させるためのシステムプロンプトの例。

```
あなたはプロジェクト管理の専門家です。
与えられたプロジェクト情報をもとに、WBS（Work Breakdown Structure）をJSON形式で出力してください。

【出力形式のルール】
- ルートオブジェクトは `project_info` と `wbs` の2つのキーを持つ
- `project_info` には name, version, pmbok_version, description を含める
- `wbs` はタスクオブジェクトの配列
- 各タスクには id, wbs_code, name, priority, start, duration_days を必須で含める
- 親タスクは children 配列に子タスクを格納する
- 依存関係は dependencies 配列に先行タスクの id を指定する
- 各フェーズの末尾にはバッファタスク（buffer フィールド）を配置する
- 優先度は MoSCoW法（Must / Should / Could / Won't）を使用する
- 日付は YYYY-MM-DD 形式
- id はプロジェクト内で一意（形式: T-NNN, T-NNN-NN, BUF-N）
- wbs_code はドット区切りの階層番号（例: 1, 1.1, 1.1.1）
- JSON以外のテキストは出力しないこと
```

---

## 10. バリデーションチェックリスト

JSON生成後、以下を確認する：

- [ ] ルートに `project_info` と `wbs` が存在する
- [ ] `project_info` の必須フィールド（`name`, `version`, `pmbok_version`, `description`）がすべて存在する
- [ ] 全タスクに `id`, `wbs_code`, `name`, `priority`, `start` が存在する
- [ ] リーフタスク（`children` なし・バッファでない）に `duration_days` が存在する
- [ ] `priority` の値が `"Must"`, `"Should"`, `"Could"`, `"Won't"` のいずれか
- [ ] `status` が使用されている場合、値が `"Not Started"`, `"In Progress"`, `"Completed"`, `"Delayed"` のいずれか
- [ ] 日付が `YYYY-MM-DD` 形式
- [ ] `id` がプロジェクト内で重複していない
- [ ] `dependencies` で参照される `id` がすべてJSON内に存在する
- [ ] 循環依存がない
- [ ] `wbs_code` が階層構造と一致している
- [ ] バッファタスクに `buffer` フィールドが存在する
- [ ] JSONとして正しい構文である（末尾カンマなし、引用符の対応など）
