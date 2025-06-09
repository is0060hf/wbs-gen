import { Project } from './types';

export function generateSampleProject(): Project {
  const today = new Date();
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const startDate = formatDate(addDays(today, 1)); // 明日から開始

  return {
    project_info: {
      name: "WBSサンプルプロジェクト",
      version: "1.0.0",
      pmbok_version: "7",
      description: "WBS管理システムの使い方を学ぶためのサンプルプロジェクトです",
      created_at: formatDate(today),
      updated_at: formatDate(today)
    },
    wbs: [
      {
        id: "T-001",
        wbs_code: "1",
        name: "プロジェクト計画フェーズ",
        priority: "Must",
        start: startDate,
        duration_days: 10,
        end: formatDate(addDays(new Date(startDate), 9)),
        progress: 0,
        status: "Not Started",
        assignee: "山田太郎",
        dependencies: [],
        children: [
          {
            id: "T-001-01",
            wbs_code: "1.1",
            name: "要件定義",
            priority: "Must",
            start: startDate,
            duration_days: 3,
            end: formatDate(addDays(new Date(startDate), 2)),
            progress: 0,
            status: "Not Started",
            assignee: "山田太郎",
            dependencies: [],
            description: "プロジェクトの要件を明確化する"
          },
          {
            id: "T-001-02",
            wbs_code: "1.2",
            name: "スケジュール作成",
            priority: "Must",
            start: formatDate(addDays(new Date(startDate), 3)),
            duration_days: 2,
            end: formatDate(addDays(new Date(startDate), 4)),
            progress: 0,
            status: "Not Started",
            assignee: "佐藤花子",
            dependencies: ["T-001-01"],
            description: "詳細なプロジェクトスケジュールを作成"
          },
          {
            id: "T-001-03",
            wbs_code: "1.3",
            name: "リソース計画",
            priority: "Should",
            start: formatDate(addDays(new Date(startDate), 5)),
            duration_days: 2,
            end: formatDate(addDays(new Date(startDate), 6)),
            progress: 0,
            status: "Not Started",
            assignee: "田中一郎",
            dependencies: ["T-001-02"],
            description: "必要なリソースの計画と割り当て"
          }
        ]
      },
      {
        id: "T-002",
        wbs_code: "2",
        name: "設計フェーズ",
        priority: "Must",
        start: formatDate(addDays(new Date(startDate), 10)),
        duration_days: 15,
        end: formatDate(addDays(new Date(startDate), 24)),
        progress: 0,
        status: "Not Started",
        assignee: "鈴木次郎",
        dependencies: ["T-001"],
        children: [
          {
            id: "T-002-01",
            wbs_code: "2.1",
            name: "基本設計",
            priority: "Must",
            start: formatDate(addDays(new Date(startDate), 10)),
            duration_days: 5,
            end: formatDate(addDays(new Date(startDate), 14)),
            progress: 0,
            status: "Not Started",
            assignee: "鈴木次郎",
            dependencies: []
          },
          {
            id: "T-002-02",
            wbs_code: "2.2",
            name: "詳細設計",
            priority: "Must",
            start: formatDate(addDays(new Date(startDate), 15)),
            duration_days: 7,
            end: formatDate(addDays(new Date(startDate), 21)),
            progress: 0,
            status: "Not Started",
            assignee: "高橋三郎",
            dependencies: ["T-002-01"]
          },
          {
            id: "T-002-03",
            wbs_code: "2.3",
            name: "設計レビュー",
            priority: "Should",
            start: formatDate(addDays(new Date(startDate), 22)),
            duration_days: 3,
            end: formatDate(addDays(new Date(startDate), 24)),
            progress: 0,
            status: "Not Started",
            assignee: "山田太郎",
            dependencies: ["T-002-02"],
            buffer: 2
          }
        ]
      },
      {
        id: "T-003",
        wbs_code: "3",
        name: "実装フェーズ",
        priority: "Must",
        start: formatDate(addDays(new Date(startDate), 25)),
        duration_days: 20,
        end: formatDate(addDays(new Date(startDate), 44)),
        progress: 0,
        status: "Not Started",
        assignee: "開発チーム",
        dependencies: ["T-002"],
        notes: "アジャイル開発手法を採用",
        children: [
          {
            id: "T-003-01",
            wbs_code: "3.1",
            name: "コア機能実装",
            priority: "Must",
            start: formatDate(addDays(new Date(startDate), 25)),
            duration_days: 10,
            end: formatDate(addDays(new Date(startDate), 34)),
            progress: 0,
            status: "Not Started",
            assignee: "開発チームA",
            dependencies: []
          },
          {
            id: "T-003-02",
            wbs_code: "3.2",
            name: "追加機能実装",
            priority: "Should",
            start: formatDate(addDays(new Date(startDate), 35)),
            duration_days: 10,
            end: formatDate(addDays(new Date(startDate), 44)),
            progress: 0,
            status: "Not Started",
            assignee: "開発チームB",
            dependencies: ["T-003-01"]
          }
        ]
      }
    ]
  };
} 